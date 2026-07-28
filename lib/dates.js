/** @returns {string} YYYY-MM-DD in local timezone */
export function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Format a Date as local calendar day YYYY-MM-DD.
 * @param {Date} d
 * @returns {string}
 */
export function localDayStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Parse YYYY-MM-DD into a local midnight Date.
 * @param {string} s
 * @returns {Date}
 */
export function parseLocalDay(s) {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

/**
 * Return local 18:00 (6pm) for a calendar day string.
 * @param {string} dayStr
 * @returns {Date}
 */
export function localSixPm(dayStr) {
  const d = parseLocalDay(dayStr);
  d.setHours(18, 0, 0, 0);
  return d;
}

/**
 * Whether now is at or past 6pm on the given day.
 * @param {Date} now
 * @param {string} dayStr
 * @returns {boolean}
 */
export function isPastSixPm(now, dayStr) {
  return now.getTime() >= localSixPm(dayStr).getTime();
}

/** Local hour (0–23) when low-effort roster warnings may appear. */
export const LOW_EFFORT_THRESHOLD_HOUR = 15;

/**
 * Whether local time is at or past the low-effort warning threshold (3 PM).
 * Before this, inactive members still show stats but not red/shaming UI.
 * @param {Date|number} now - Date instance or epoch ms
 * @returns {boolean}
 */
export function isPastLowEffortThreshold(now) {
  const d = now instanceof Date ? now : new Date(now);
  return d.getHours() >= LOW_EFFORT_THRESHOLD_HOUR;
}

/**
 * Add days to a YYYY-MM-DD string.
 * @param {string} dayStr
 * @param {number} delta
 * @returns {string}
 */
export function addDays(dayStr, delta) {
  const d = parseLocalDay(dayStr);
  d.setDate(d.getDate() + delta);
  return localDayStr(d);
}

/**
 * Validate and normalize a YYYY-MM-DD due date string.
 * @param {string|undefined} value
 * @param {string} fallback
 * @param {{ maxDaysFromToday?: number }} [opts]
 * @returns {string}
 */
export function validateDueDate(value, fallback, { maxDaysFromToday = 365 } = {}) {
  const raw = value || fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("Due date must be YYYY-MM-DD");
  }
  const roundTrip = localDayStr(parseLocalDay(raw));
  if (roundTrip !== raw) throw new Error("Invalid due date");

  const today = fallback;
  const minDay = addDays(today, -maxDaysFromToday);
  const maxDay = addDays(today, maxDaysFromToday);
  if (raw < minDay || raw > maxDay) {
    throw new Error(`Due date must be within ${maxDaysFromToday} days of today`);
  }

  return raw;
}

