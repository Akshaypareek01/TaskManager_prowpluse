import { initials } from "./team.js";
import { addDays, localDayStr } from "./dates.js";

/** Days late before a pending task is shown as backlog instead of overdue. */
export const BACKLOG_OVERDUE_DAYS = 3;

/**
 * Derive display status for a non-completed, non-in_progress task from its due date.
 * @param {string} due - YYYY-MM-DD
 * @param {string} today - YYYY-MM-DD
 * @returns {"pending"|"overdue"|"backlog"}
 */
export function derivePendingStatus(due, today) {
  if (due >= today) return "pending";
  const overdueFloor = addDays(today, -BACKLOG_OVERDUE_DAYS);
  if (due >= overdueFloor) return "overdue";
  return "backlog";
}

/**
 * Compute duration in ms from a raw or API task row.
 * Prefers explicit durationMs, then start/end timestamps, then durationMinutes.
 * @param {object} task
 * @returns {number|null}
 */
export function taskDurationMs(task) {
  if (task.durationMs != null && task.durationMs > 0) return task.durationMs;
  if (task.startTime && task.endTime) {
    return new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
  }
  if (task.durationMinutes != null && task.durationMinutes > 0) {
    return task.durationMinutes * 60000;
  }
  return null;
}

/**
 * Format milliseconds into a human duration string.
 * @param {number|null|undefined} ms
 * @returns {string|null}
 */
export function formatDurationMs(ms) {
  if (ms == null || ms <= 0) return null;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Build analytics from task rows for a date range.
 * @param {Array<object>} taskRows
 * @param {{ from: string, to: string, memberId?: string, members?: object[] }} opts
 * @returns {object}
 */
export function buildAnalytics(taskRows, { from, to, memberId = "all", members = [] }) {
  const inRange = taskRows.filter((t) => {
    const due = String(t.dueDate);
    return due >= from && due <= to;
  });

  const completed = inRange.filter((t) => t.status === "completed");
  const pending = inRange.filter((t) => t.status !== "completed");
  const today = localDayStr(new Date());
  const late = pending.filter((t) => String(t.dueDate) < today);
  const overdue = late.filter(
    (t) => derivePendingStatus(String(t.dueDate), today) === "overdue"
  );
  const backlog = late.filter(
    (t) => derivePendingStatus(String(t.dueDate), today) === "backlog"
  );

  const durations = completed
    .map((t) => t.durationMs)
    .filter((d) => d != null && d > 0);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const trend = [];
  let cursor = from;
  while (cursor <= to) {
    const dayTasks = inRange.filter((t) => String(t.dueDate) === cursor);
    trend.push({
      date: cursor,
      total: dayTasks.length,
      completed: dayTasks.filter((t) => t.status === "completed").length,
    });
    cursor = addDays(cursor, 1);
  }

  const summary = {
    total: inRange.length,
    completed: completed.length,
    pending: pending.length,
    overdue: overdue.length,
    backlog: backlog.length,
    completionRate:
      inRange.length > 0
        ? Math.round((completed.length / inRange.length) * 100)
        : 0,
    avgDurationMs,
    avgDurationLabel: formatDurationMs(avgDurationMs),
  };

  const byMember =
    memberId === "all"
      ? members.map((m) => {
          const mine = inRange.filter((t) => t.memberId === m.id);
          const mineCompleted = mine.filter((t) => t.status === "completed");
          const minePending = mine.filter((t) => t.status !== "completed");
          const mineLate = minePending.filter((t) => String(t.dueDate) < today);
          const mineOverdue = mineLate.filter(
            (t) => derivePendingStatus(String(t.dueDate), today) === "overdue"
          );
          const mineBacklog = mineLate.filter(
            (t) => derivePendingStatus(String(t.dueDate), today) === "backlog"
          );
          const mineDurations = mineCompleted
            .map((t) => t.durationMs)
            .filter((d) => d != null && d > 0);
          const avgMs =
            mineDurations.length > 0
              ? Math.round(
                  mineDurations.reduce((a, b) => a + b, 0) /
                    mineDurations.length
                )
              : null;
          const totalMs = mineDurations.reduce((sum, d) => sum + d, 0);

          return {
            member: {
              id: m.id,
              name: m.name,
              color: m.color,
              initials: m.initials ?? initials(m.name),
            },
            total: mine.length,
            completed: mineCompleted.length,
            pending: minePending.length,
            overdue: mineOverdue.length,
            backlog: mineBacklog.length,
            completionRate:
              mine.length > 0
                ? Math.round((mineCompleted.length / mine.length) * 100)
                : 0,
            avgDurationMs: avgMs,
            avgDurationLabel: formatDurationMs(avgMs),
            totalDurationMs: totalMs > 0 ? totalMs : null,
            totalDurationLabel: formatDurationMs(totalMs > 0 ? totalMs : null),
          };
        }).filter((r) => r.total > 0 || r.overdue > 0 || r.backlog > 0)
      : undefined;

  return { summary, trend, byMember };
}

/**
 * Map a DB task row to API task shape.
 * @param {object} row
 * @param {Date} now
 * @param {string} today
 * @param {Record<string, object>} [memberLookup]
 * @param {Record<string, { id: string, name: string, memberId?: string|null }>} [userLookup]
 * @returns {object}
 */
export function taskToApi(row, now, today, memberLookup = {}, userLookup = {}) {
  const m = memberLookup[row.memberId] || {
    id: row.memberId,
    name: row.memberId,
    color: "#888",
    initials: initials(String(row.memberId)),
  };
  const due = String(row.dueDate);
  let status = row.status;
  if (status !== "completed" && status !== "in_progress") {
    status = derivePendingStatus(due, today);
  }

  const durationMs = taskDurationMs(row);

  let assignedBy = null;
  if (row.assignedByUserId) {
    const assigner = userLookup[row.assignedByUserId];
    if (assigner) {
      const isSelf = assigner.memberId === row.memberId;
      assignedBy = {
        userId: assigner.id,
        name: isSelf ? "Self" : assigner.name,
        isSelf,
      };
    }
  }

  return {
    id: row.id,
    member: {
      id: m.id,
      name: m.name,
      color: m.color,
      initials: m.initials ?? initials(m.name),
    },
    title: row.title,
    notes: row.notes || "",
    dueDate: due,
    status,
    createdAt: new Date(row.createdAt).getTime(),
    completedAt: row.completedAt ? new Date(row.completedAt).getTime() : null,
    startTime: row.startTime ? new Date(row.startTime).getTime() : null,
    endTime: row.endTime ? new Date(row.endTime).getTime() : null,
    durationMs,
    durationLabel: formatDurationMs(durationMs),
    assignedBy,
  };
}
