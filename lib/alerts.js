import { lt, ne } from "drizzle-orm";
import { getDb } from "./db/index.js";
import { alerts, tasks } from "./db/schema.js";
import { getRegisteredMembers, membersById } from "./members.js";
import { addDays, isPastSixPm, localDayStr } from "./dates.js";
import { BACKLOG_OVERDUE_DAYS, taskDurationMs } from "./analytics.js";

const CONGRATS = [
  "Great work — task completed! Keep it up! 🎉",
  "Nice one! Another task off the board. 💪",
  "Crushed it! Stay on this roll. 🔥",
  "Task done — you're building momentum. ✨",
];

const ENSURE_ALERTS_INTERVAL_MS = 60_000;
const ALERT_RETENTION_DAYS = 30;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

/** @type {number} */
let lastEnsureAlertsAt = 0;
/** @type {number} */
let lastPruneAt = 0;

/**
 * Generate a unique alert id.
 * @param {string} prefix
 * @returns {string}
 */
export function newAlertId(prefix = "a") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Pick a random motivational message for task completion.
 * @param {string} name
 * @returns {string}
 */
export function congratsMessage(name) {
  const base = CONGRATS[Math.floor(Math.random() * CONGRATS.length)];
  return `${name}, ${base}`;
}

/**
 * Insert an alert idempotently using dedupeKey.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @param {object} row
 */
async function insertAlert(db, row) {
  await db
    .insert(alerts)
    .values(row)
    .onConflictDoNothing({ target: alerts.dedupeKey });
}

/**
 * Insert a completion congrats alert for a member.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @param {{ memberId: string, taskId: string, title: string, memberName?: string }} params
 */
export async function insertCongratsAlert(db, { memberId, taskId, title, memberName }) {
  let name = memberName;
  if (!name) {
    const registered = await getRegisteredMembers(db);
    name = membersById(registered)[memberId]?.name ?? memberId;
  }

  await insertAlert(db, {
    id: newAlertId(),
    type: "completion_congrats",
    memberId,
    taskId,
    message: `${name} completed "${title}" — ${congratsMessage(name)}`,
    read: false,
    dedupeKey: `congrats:${taskId}`,
  });
}

/**
 * Delete alerts older than the retention window.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @param {Date} now
 */
export async function pruneOldAlerts(db, now = new Date()) {
  const cutoff = new Date(now.getTime() - ALERT_RETENTION_DAYS * 86400000);
  await db.delete(alerts).where(lt(alerts.createdAt, cutoff));
}

/**
 * Run ensureAlerts at most once per minute unless forced.
 * Also prunes stale alerts roughly once per hour.
 * @param {Date} [now]
 * @param {{ force?: boolean }} [opts]
 */
export async function ensureAlertsIfNeeded(now = new Date(), { force = false } = {}) {
  const db = getDb();
  const ts = Date.now();

  if (force || ts - lastPruneAt >= PRUNE_INTERVAL_MS) {
    lastPruneAt = ts;
    await pruneOldAlerts(db, now);
  }

  if (!force && ts - lastEnsureAlertsAt < ENSURE_ALERTS_INTERVAL_MS) {
    return;
  }

  lastEnsureAlertsAt = ts;
  await ensureAlerts(now);
}

/**
 * Idempotently generate overdue and 6pm reminder alerts.
 * @param {Date} now
 */
export async function ensureAlerts(now = new Date()) {
  const db = getDb();
  const today = localDayStr(now);
  const registered = await getRegisteredMembers(db);
  const memberLookup = membersById(registered);

  const pendingTasks = await db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "completed"));

  for (const task of pendingTasks) {
    const due = String(task.dueDate);
    const member = memberLookup[task.memberId];
    if (!member) continue;

    const overdueFloor = addDays(today, -BACKLOG_OVERDUE_DAYS);
    if (due < today && due >= overdueFloor) {
      await insertAlert(db, {
        id: newAlertId(),
        type: "overdue",
        memberId: task.memberId,
        taskId: task.id,
        message: `${member.name} has an overdue task: "${task.title}"`,
        read: false,
        dedupeKey: `overdue:${task.id}:${today}`,
      });
    }
  }

  if (!isPastSixPm(now, today)) return;

  for (const member of registered) {
    const todayPending = pendingTasks.filter(
      (t) => t.memberId === member.id && String(t.dueDate) === today
    );
    if (todayPending.length === 0) continue;

    await insertAlert(db, {
      id: newAlertId(),
      type: "reminder_6pm",
      memberId: member.id,
      taskId: todayPending[0].id,
      message: `${member.name}, please complete your task(s) by today — ${todayPending.length} still pending.`,
      read: false,
      dedupeKey: `reminder_6pm:${member.id}:${today}`,
    });
  }
}

/**
 * Compute badge and overdue counts for a member from task rows.
 * @param {Array<{ memberId: string, dueDate: string|Date, status: string }>} allTasks
 * @param {string} memberId
 * @param {string} today
 * @param {Date} now
 * @returns {{ overdueCount: number, backlogCount: number, badgeCount: number, pendingToday: number, completedToday: number, workingHoursMs: number }}
 */
export function memberTaskCounts(allTasks, memberId, today, now) {
  const mine = allTasks.filter((t) => t.memberId === memberId);
  const pending = mine.filter((t) => t.status !== "completed");
  const overdueFloor = addDays(today, -BACKLOG_OVERDUE_DAYS);
  const overdueCount = pending.filter((t) => {
    const due = String(t.dueDate);
    return due < today && due >= overdueFloor;
  }).length;
  const backlogCount = pending.filter(
    (t) => String(t.dueDate) < overdueFloor
  ).length;
  const pendingToday = pending.filter(
    (t) => String(t.dueDate) === today
  ).length;
  const completedTodayTasks = mine.filter(
    (t) => t.status === "completed" && String(t.dueDate) === today
  );
  const completedToday = completedTodayTasks.length;
  const workingHoursMs = completedTodayTasks.reduce((sum, t) => {
    const ms = taskDurationMs(t);
    return sum + (ms != null && ms > 0 ? ms : 0);
  }, 0);

  const badgeCount =
    overdueCount +
    (isPastSixPm(now, today) ? pendingToday : 0);

  return { overdueCount, backlogCount, badgeCount, pendingToday, completedToday, workingHoursMs };
}
