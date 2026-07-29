import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { getDb } from "./db/index.js";
import { alerts, tasks, users } from "./db/schema.js";
import { initials } from "./team.js";
import {
  getMemberByMemberId,
  getRegisteredMembers,
  memberView,
  membersById,
} from "./members.js";
import { localDayStr, parseLocalDay, validateDueDate, addDays } from "./dates.js";
import {
  ensureAlertsIfNeeded,
  insertCongratsAlert,
  memberTaskCounts,
} from "./alerts.js";
import { buildAnalytics, taskToApi, BACKLOG_OVERDUE_DAYS, taskDurationMs } from "./analytics.js";

const MAX_TITLE = 200;
const MIN_TITLE = 3;
const MAX_NOTES = 600;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
const ALERTS_PAGE_SIZE = 50;
const MAX_ALERT_DAYS = 30;
const HISTORY_TASK_PAGE_SIZE = 50;
const MAX_HISTORY_DAYS = 30;
const MAX_OVERDUE_SURFACE = 50;
const MAX_OVERDUE_DAYS = 30;

/**
 * Generate a unique id with prefix.
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Build member view object for API responses.
 * @param {object} m
 * @returns {object}
 */
function toMemberView(m) {
  return memberView(m);
}

/**
 * Index users by id for assigned-by lookups.
 * @param {Array<{ id: string, name: string, memberId: string|null }>} rows
 * @returns {Record<string, { id: string, name: string, memberId: string|null }>}
 */
function usersById(rows) {
  return Object.fromEntries(rows.map((u) => [u.id, u]));
}

/**
 * Load all users for assigner name resolution.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @returns {Promise<Record<string, { id: string, name: string, memberId: string|null }>>}
 */
async function getUserLookup(db) {
  const rows = await db
    .select({ id: users.id, name: users.name, memberId: users.memberId })
    .from(users);
  return usersById(rows);
}

/**
 * Map a DB alert row to the API shape.
 * @param {object} a
 * @param {string|null} [taskTitle]
 * @param {Record<string, object>} [memberLookup]
 * @returns {object}
 */
function mapAlertToApi(a, taskTitle = null, memberLookup = {}) {
  const m = memberLookup[a.memberId];
  return {
    id: a.id,
    type: a.type,
    member: m ? toMemberView(m) : { id: a.memberId, name: a.memberId, initials: initials(a.memberId) },
    message: a.message,
    taskId: a.taskId,
    taskTitle,
    createdAt: new Date(a.createdAt).getTime(),
    read: a.read,
  };
}

/**
 * Fetch alerts for a date window with pagination.
 * @param {{ days?: number, memberId?: string, limit?: number, offset?: number }} opts
 * @returns {Promise<{ alerts: object[], hasMore: boolean, days: number, memberId: string }>}
 */
export async function getAlerts({
  days = 1,
  memberId = "all",
  limit = ALERTS_PAGE_SIZE,
  offset = 0,
} = {}) {
  const db = getDb();
  const registered = await getRegisteredMembers(db);
  const memberLookup = membersById(registered);
  const now = new Date();
  const today = localDayStr(now);
  const windowDays = Math.min(Math.max(Math.floor(days), 1), MAX_ALERT_DAYS);
  const fromDay = windowDays === 1 ? today : addDays(today, -(windowDays - 1));
  const fromDate = parseLocalDay(fromDay);
  const pageSize = Math.min(Math.max(Math.floor(limit), 1), ALERTS_PAGE_SIZE);
  const pageOffset = Math.max(Math.floor(offset), 0);

  const conditions = [gte(alerts.createdAt, fromDate)];
  if (memberId !== "all") {
    conditions.push(eq(alerts.memberId, memberId));
  }

  const rows = await db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.createdAt))
    .limit(pageSize + 1)
    .offset(pageOffset);

  const hasMore = rows.length > pageSize;
  const slice = hasMore ? rows.slice(0, pageSize) : rows;

  const taskIds = [...new Set(slice.map((a) => a.taskId).filter(Boolean))];
  let taskTitles = {};
  if (taskIds.length > 0) {
    const taskRows = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(inArray(tasks.id, taskIds));
    taskTitles = Object.fromEntries(taskRows.map((t) => [t.id, t.title]));
  }

  return {
    alerts: slice.map((a) => mapAlertToApi(a, taskTitles[a.taskId] || null, memberLookup)),
    hasMore,
    days: windowDays,
    memberId,
  };
}

/**
 * Mark alerts as read by id list and/or member scope.
 * @param {{ alertIds?: string[], memberId?: string }} opts
 * @returns {Promise<{ updated: number }>}
 */
export async function markAlertsRead({ alertIds = [], memberId } = {}) {
  const db = getDb();
  let updated = 0;

  if (alertIds.length > 0) {
    const result = await db
      .update(alerts)
      .set({ read: true })
      .where(and(inArray(alerts.id, alertIds), eq(alerts.read, false)))
      .returning({ id: alerts.id });
    updated = result.length;
    return { updated };
  }

  if (memberId && memberId !== "all") {
    const result = await db
      .update(alerts)
      .set({ read: true })
      .where(and(eq(alerts.memberId, memberId), eq(alerts.read, false)))
      .returning({ id: alerts.id });
    updated = result.length;
    return { updated };
  }

  const result = await db
    .update(alerts)
    .set({ read: true })
    .where(eq(alerts.read, false))
    .returning({ id: alerts.id });
  updated = result.length;
  return { updated };
}

/**
 * Load full application state for the wall UI.
 * @param {{ forceAlerts?: boolean }} [opts]
 * @returns {Promise<object>}
 */
export async function getState({ forceAlerts = false } = {}) {
  const db = getDb();
  const now = new Date();
  const today = localDayStr(now);

  await ensureAlertsIfNeeded(now, { force: forceAlerts });

  const registered = await getRegisteredMembers(db);
  const memberLookup = membersById(registered);
  const userLookup = await getUserLookup(db);

  const allTasks = await db.select().from(tasks);
  const todayStart = parseLocalDay(today);
  const alertRows = await db
    .select()
    .from(alerts)
    .where(gte(alerts.createdAt, todayStart))
    .orderBy(desc(alerts.createdAt))
    .limit(100);

  const todayTasks = allTasks
    .filter((t) => String(t.dueDate) === today)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((t) => taskToApi(t, now, today, memberLookup, userLookup));

  const overdueCutoff = addDays(today, -MAX_OVERDUE_DAYS);
  const overdueFloor = addDays(today, -BACKLOG_OVERDUE_DAYS);
  const allLate = allTasks
    .filter(
      (t) => t.status !== "completed" && String(t.dueDate) < today
    )
    .sort(
      (a, b) =>
        String(a.dueDate).localeCompare(String(b.dueDate)) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const allOverdue = allLate.filter((t) => String(t.dueDate) >= overdueFloor);
  const allBacklog = allLate.filter((t) => String(t.dueDate) < overdueFloor);

  const overdueTotal = allOverdue.length;
  const backlogTotal = allBacklog.length;
  const overdueTasks = allOverdue
    .filter((t) => String(t.dueDate) >= overdueCutoff)
    .slice(0, MAX_OVERDUE_SURFACE)
    .map((t) => taskToApi(t, now, today, memberLookup, userLookup));

  const backlogTasks = allBacklog
    .filter((t) => String(t.dueDate) >= overdueCutoff)
    .slice(0, MAX_OVERDUE_SURFACE)
    .map((t) => taskToApi(t, now, today, memberLookup, userLookup));

  const members = registered.map((m) => {
    const counts = memberTaskCounts(allTasks, m.id, today, now);
    const hasTodayTasks = counts.pendingToday + counts.completedToday > 0;
    const unreadAlertCount = alertRows.filter(
      (a) => a.memberId === m.id && !a.read
    ).length;
    return {
      ...toMemberView(m),
      ...counts,
      hasTodayTasks,
      postedToday: counts.completedToday > 0,
      unreadAlertCount,
    };
  });

  const alertList = alertRows.map((a) => {
    const task = a.taskId
      ? allTasks.find((t) => t.id === a.taskId)
      : null;
    return mapAlertToApi(a, task?.title || null, memberLookup);
  });

  const completedToday = todayTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const overdueCount = allOverdue.length;
  const backlogCount = allBacklog.length;

  const weekAnalytics = buildAnalytics(
    allTasks.map((t) => ({
      ...t,
      dueDate: String(t.dueDate),
      durationMs: taskDurationMs(t),
    })),
    {
      from: localDayStr(new Date(now.getTime() - 6 * 86400000)),
      to: today,
      memberId: "all",
      members: registered,
    }
  );

  return {
    today,
    now: now.getTime(),
    team: registered.map(toMemberView),
    members,
    tasks: todayTasks,
    overdueTasks,
    backlogTasks,
    overdueTotal,
    backlogTotal,
    alerts: alertList,
    stats: {
      totalToday: todayTasks.length,
      completedToday,
      overdueCount,
      backlogCount,
      overdueTotal,
      backlogTotal,
      totalMembers: registered.length,
      checkedInCount: members.filter((m) => m.hasTodayTasks).length,
    },
    analytics: weekAnalytics.summary,
  };
}

/**
 * Load a single task by id.
 * @param {string} taskId
 * @returns {Promise<object|null>}
 */
export async function getTaskById(taskId) {
  const db = getDb();
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return row ?? null;
}

/**
 * Create a new task for a team member.
 * @param {string} memberId
 * @param {{ title: string, notes?: string, dueDate?: string, assignedByUserId?: string }} data
 * @returns {Promise<object>}
 */
export async function addTask(memberId, { title, notes, dueDate, assignedByUserId }) {
  const db = getDb();

  if (assignedByUserId) {
    const [assigner] = await db
      .select({ memberId: users.memberId })
      .from(users)
      .where(eq(users.id, assignedByUserId))
      .limit(1);

    if (!assigner?.memberId || assigner.memberId !== memberId) {
      throw new Error("You can only manage your own tasks");
    }
  }

  const member = await getMemberByMemberId(db, memberId);
  if (!member) throw new Error("Unknown team member");

  const text = String(title || "").trim().slice(0, MAX_TITLE);
  if (!text) throw new Error("Task title is required");
  if (text.length < MIN_TITLE) {
    throw new Error(`Task title must be at least ${MIN_TITLE} characters`);
  }

  const noteText = notes
    ? String(notes).trim().slice(0, MAX_NOTES)
    : null;
  const due = validateDueDate(dueDate, localDayStr(new Date()));

  const item = {
    id: newId("t"),
    memberId,
    title: text,
    notes: noteText,
    dueDate: due,
    status: "pending",
    assignedByUserId: assignedByUserId || null,
  };

  await db.insert(tasks).values(item);
  return item;
}

/**
 * Mark a task complete with start and end times.
 * @param {string} taskId
 * @param {number} startTime
 * @param {number} endTime
 * @returns {Promise<object>}
 */
export async function completeTask(taskId, startTime, endTime) {
  const db = getDb();

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid start or end time");
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error("End time must be after start time");
  }
  if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
    throw new Error("Duration cannot exceed 24 hours");
  }
  if (end.getTime() > Date.now() + 60000) {
    throw new Error("End time cannot be in the future");
  }

  const durationMinutes = Math.round(
    (end.getTime() - start.getTime()) / 60000
  );

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(tasks)
      .set({
        status: "completed",
        startTime: start,
        endTime: end,
        completedAt: end,
        durationMinutes,
      })
      .where(and(eq(tasks.id, taskId), ne(tasks.status, "completed")))
      .returning();

    if (!updated) throw new Error("Task not found or already completed");

    await insertCongratsAlert(tx, {
      memberId: updated.memberId,
      taskId: updated.id,
      title: updated.title,
    });

    return { id: taskId, durationMinutes };
  });
}

/**
 * Ensure a history query window is valid and capped.
 * @param {string} from
 * @param {string} to
 */
function validateHistoryRange(from, to) {
  if (from > to) throw new Error("Start date must be on or before end date");
  const span =
    (parseLocalDay(to).getTime() - parseLocalDay(from).getTime()) / 86400000;
  if (span > MAX_HISTORY_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_HISTORY_DAYS} days`);
  }
}

/**
 * Fetch task history and analytics for a date range.
 * Analytics use the full range; the task list is paginated.
 * @param {{ memberId?: string, from?: string, to?: string, taskLimit?: number, taskOffset?: number, includeAnalytics?: boolean }} opts
 * @returns {Promise<object>}
 */
export async function getHistory({
  memberId = "all",
  from,
  to,
  taskLimit = HISTORY_TASK_PAGE_SIZE,
  taskOffset = 0,
  includeAnalytics = true,
} = {}) {
  const db = getDb();
  const now = new Date();
  const today = localDayStr(now);
  const registered = await getRegisteredMembers(db);
  const memberLookup = membersById(registered);
  const userLookup = await getUserLookup(db);
  const rangeFrom = from || localDayStr(new Date(now.getTime() - 6 * 86400000));
  const rangeTo = to || today;
  validateHistoryRange(rangeFrom, rangeTo);

  const pageSize = Math.min(Math.max(Math.floor(taskLimit), 1), HISTORY_TASK_PAGE_SIZE);
  const pageOffset = Math.max(Math.floor(taskOffset), 0);

  const conditions = [
    gte(tasks.dueDate, rangeFrom),
    lte(tasks.dueDate, rangeTo),
  ];
  if (memberId !== "all") {
    conditions.push(eq(tasks.memberId, memberId));
  }
  const whereClause = and(...conditions);

  const [{ count: tasksTotal }] = await db
    .select({ count: sql`cast(count(*) as int)` })
    .from(tasks)
    .where(whereClause);

  const taskRows = await db
    .select()
    .from(tasks)
    .where(whereClause)
    .orderBy(desc(tasks.createdAt))
    .limit(pageSize + 1)
    .offset(pageOffset);

  const tasksHasMore = taskRows.length > pageSize;
  const taskSlice = tasksHasMore ? taskRows.slice(0, pageSize) : taskRows;

  const mapped = taskSlice.map((t) =>
    taskToApi(
      {
        ...t,
        dueDate: String(t.dueDate),
      },
      now,
      today,
      memberLookup,
      userLookup
    )
  );

  let analytics = null;
  if (includeAnalytics) {
    const analyticsRows = await db
      .select({
        memberId: tasks.memberId,
        dueDate: tasks.dueDate,
        status: tasks.status,
        startTime: tasks.startTime,
        endTime: tasks.endTime,
        durationMinutes: tasks.durationMinutes,
      })
      .from(tasks)
      .where(whereClause);

    analytics = buildAnalytics(
      analyticsRows.map((t) => ({
        ...t,
        dueDate: String(t.dueDate),
        durationMs: taskDurationMs(t),
      })),
      { from: rangeFrom, to: rangeTo, memberId, members: registered }
    );
  }

  return {
    from: rangeFrom,
    to: rangeTo,
    memberId,
    tasks: mapped,
    tasksTotal,
    tasksHasMore,
    analytics,
  };
}
