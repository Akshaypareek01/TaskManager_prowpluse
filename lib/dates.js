/** Shared Intl options for 12-hour clock display (en-US). */
const TIME_12H_OPTS = { hour: "numeric", minute: "2-digit", hour12: true };

/** @returns {string} YYYY-MM-DD in local timezone */
export function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Format a Date or epoch ms as local 12-hour time with AM/PM (e.g. "2:30 PM").
 * @param {Date|number|null|undefined} value
 * @returns {string}
 */
export function formatTime12h(value) {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", TIME_12H_OPTS);
}

/**
 * Format a Date or epoch ms as a readable local date + 12-hour time.
 * @param {Date|number|null|undefined} value
 * @returns {string}
 */
export function formatDateTime12h(value) {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...TIME_12H_OPTS,
  });
}

/**
 * Format a Date or epoch ms for `<input type="datetime-local">` (local, minute precision).
 * @param {Date|number|null|undefined} value
 * @returns {string}
 */
export function toDatetimeLocalValue(value) {
  if (value == null) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/**
 * Parse a datetime-local string (`YYYY-MM-DDTHH:mm`) to epoch ms in local time.
 * Uses explicit local construction instead of `Date.parse` for cross-browser consistency.
 * @param {string} value
 * @returns {number} epoch ms, or NaN when invalid
 */
export function parseDatetimeLocalValue(value) {
  if (!value || typeof value !== "string") return NaN;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return NaN;

  const y = Number(match[1]);
  const mo = Number(match[2]);
  const day = Number(match[3]);
  const h = Number(match[4]);
  const min = Number(match[5]);

  if (mo < 1 || mo > 12 || day < 1 || day > 31 || h > 23 || min > 59) return NaN;

  const d = new Date(y, mo - 1, day, h, min, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return NaN;

  return d.getTime();
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
/** Quarter-hour options for friendly time pickers. */
export const QUARTER_MINUTES = [0, 15, 30, 45];

/**
 * Snap a minute value to the nearest quarter hour (0, 15, 30, 45).
 * @param {number} minute
 * @returns {number}
 */
export function snapMinuteToQuarter(minute) {
  const m = Number(minute);
  if (Number.isNaN(m)) return 0;
  let best = 0;
  let bestDiff = Infinity;
  for (const q of QUARTER_MINUTES) {
    const diff = Math.abs(m - q);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = q;
    }
  }
  return best;
}

/**
 * Convert 12-hour clock parts + calendar date to epoch ms in local time.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {number} hour12 - 1–12
 * @param {number} minute - 0–59
 * @param {"AM"|"PM"|string} ampm
 * @returns {number} epoch ms, or NaN when invalid
 */
export function buildLocalDateTime(dateStr, hour12, minute, ampm) {
  if (!dateStr || typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NaN;
  }

  const h12 = Number(hour12);
  const min = Number(minute);
  const period = String(ampm || "").toUpperCase();
  if (h12 < 1 || h12 > 12 || min < 0 || min > 59 || (period !== "AM" && period !== "PM")) {
    return NaN;
  }

  let h24 = h12 % 12;
  if (period === "PM") h24 += 12;

  const [y, mo, day] = dateStr.split("-").map(Number);
  const d = new Date(y, mo - 1, day, h24, min, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return NaN;

  return d.getTime();
}

/**
 * Decompose epoch ms into picker-friendly local parts.
 * @param {Date|number|null|undefined} value
 * @returns {{ date: string, hour12: number, minute: number, ampm: "AM"|"PM" } | null}
 */
export function epochToPickerParts(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const h24 = d.getHours();
  const ampm = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 || 12;

  return {
    date: localDayStr(d),
    hour12,
    minute: d.getMinutes(),
    ampm,
  };
}

/**
 * Build epoch ms from picker parts.
 * @param {{ date?: string, hour12?: number, minute?: number, ampm?: string } | null} parts
 * @returns {number}
 */
export function pickerPartsToEpoch(parts) {
  if (!parts?.date) return NaN;
  return buildLocalDateTime(parts.date, parts.hour12, parts.minute, parts.ampm);
}

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

