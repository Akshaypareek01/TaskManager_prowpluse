/** IANA timezone for office hours, roasts, and daily boundaries. */
export const APP_TIMEZONE = "Asia/Kolkata";

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "numeric",
  hour12: false,
});

const minuteFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  minute: "numeric",
});

/**
 * Calendar clock parts in {@link APP_TIMEZONE}.
 * @param {Date|number} date
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number }}
 */
export function getAppTimezoneParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  const [year, month, day] = datePartsFormatter.format(d).split("-").map(Number);
  const hour = parseInt(hourFormatter.format(d), 10) % 24;
  const minute = parseInt(minuteFormatter.format(d), 10);
  return { year, month, day, hour, minute };
}

/**
 * YYYY-MM-DD in {@link APP_TIMEZONE}.
 * @param {Date|number} date
 * @returns {string}
 */
export function appDayStr(date) {
  const { year, month, day } = getAppTimezoneParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Hour 0–23 in {@link APP_TIMEZONE}.
 * @param {Date|number} date
 * @returns {number}
 */
export function appHour(date) {
  return getAppTimezoneParts(date).hour;
}

/**
 * Format an {@link APP_TIMEZONE} clock time as 12-hour AM/PM.
 * @param {number} hour 0–23
 * @param {number} [minute]
 * @returns {string}
 */
export function formatAppClock12h(hour, minute = 0) {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  if (minute === 0) {
    return `${h12} ${period}`;
  }
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Build a Date for a wall-clock time in {@link APP_TIMEZONE} (IST, UTC+5:30).
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} day
 * @param {number} hour 0–23
 * @param {number} [minute]
 * @returns {Date}
 */
export function appLocalDateTimeToDate(year, month, day, hour, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0, 0));
}

/**
 * Build a Date for YYYY-MM-DD + hour/minute in {@link APP_TIMEZONE}.
 * @param {string} dayStr
 * @param {number} hour
 * @param {number} [minute]
 * @returns {Date}
 */
export function appLocalDateTimeFromDayStr(dayStr, hour, minute = 0) {
  const [year, month, day] = String(dayStr).split("-").map(Number);
  return appLocalDateTimeToDate(year, month, day, hour, minute);
}
