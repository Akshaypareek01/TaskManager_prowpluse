import { isBossMember } from "./members.js";

/** Max inactive names shown before "+N more" truncation. */
export const LOW_EFFORT_NAME_LIMIT = 3;

/**
 * Whether a member has no tasks due today and no logged working hours.
 * Boss members are never considered inactive.
 * @param {object} m
 * @returns {boolean}
 */
export function isInactiveToday(m) {
  if (isBossMember(m)) return false;
  const hasTodayTasks = m.pendingToday + m.completedToday > 0;
  return !hasTodayTasks && (m.workingHoursMs ?? 0) === 0;
}

/**
 * Names of members with zero tasks and zero hours today.
 * @param {object[]} members
 * @returns {string[]}
 */
export function inactiveMemberNames(members) {
  return members.filter(isInactiveToday).map((m) => m.name);
}

/**
 * Build truncated display text for the low-effort header alert.
 * @param {string[]} names
 * @param {number} [maxNames=3]
 * @returns {string|null}
 */
export function formatLowEffortAlertText(names, maxNames = LOW_EFFORT_NAME_LIMIT) {
  if (names.length === 0) return null;
  const visible = names.slice(0, maxNames);
  const extra = names.length - visible.length;
  return extra > 0 ? `${visible.join(", ")} +${extra} more` : visible.join(", ");
}
