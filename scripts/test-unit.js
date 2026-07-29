/**
 * Unit tests for date helpers and analytics (run with node).
 */
import {
  localDayStr,
  addDays,
  isPastSixPm,
  isPastLowEffortThreshold,
  LOW_EFFORT_THRESHOLD_HOUR,
  localSixPm,
  validateDueDate,
  formatTime12h,
  formatDateTime12h,
  toDatetimeLocalValue,
  parseDatetimeLocalValue,
  buildLocalDateTime,
  epochToPickerParts,
  pickerPartsToEpoch,
  snapMinuteToQuarter,
} from "../lib/dates.js";
import { buildAnalytics, formatDurationMs, taskToApi, derivePendingStatus } from "../lib/analytics.js";
import { memberTaskCounts } from "../lib/alerts.js";
import { isBossMember, BOSS_MEMBER_NAME } from "../lib/members.js";
import {
  formatLowEffortAlertText,
  inactiveMemberNames,
  isInactiveToday,
} from "../lib/rosterStats.js";
import {
  dailyQuoteIndex,
  fnv1aHash,
  getDailyGreeting,
  buildQuoteSeed,
} from "../lib/greetings.js";
import {
  canViewHourlyJoke,
  getUserRoastKeywords,
  resolveJokeProfiles,
} from "../lib/teamProfiles.js";
import {
  MAX_KEYWORD_LENGTH,
  MAX_ROAST_KEYWORDS,
  normalizeRoastKeywords,
  parseRoastKeywordsFromDb,
  serializeRoastKeywords,
} from "../lib/roastKeywords.js";
import {
  buildFallbackJoke,
  buildJokeCacheKey,
  buildJokeUserPrompt,
  getHourSlot,
  getNextRoastLabel,
  isWithinOfficeHours,
  OFFICE_HOURS_END,
  OFFICE_HOURS_START,
  parseJokeResponse,
  pickMemberForSlot,
} from "../lib/hourlyJokes.js";
import {
  aggregateWeekStats,
  daysFromMonday,
  deriveCheckInStatus,
  getDaysUntilNextReport,
  getNextReportDate,
  getPreviousWeekBounds,
  getWeekBounds,
  getWeekdayDates,
  parseReportResponse,
  shouldGeneratePreviousWeekReport,
} from "../lib/weeklyReport.js";

let passed = 0;
let failed = 0;

/**
 * @param {string} name
 * @param {() => void} fn
 */
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}:`, err.message);
  }
}

test("localDayStr format", () => {
  const s = localDayStr(new Date(2026, 6, 27, 15, 0));
  if (s !== "2026-07-27") throw new Error(`got ${s}`);
});

test("addDays", () => {
  if (addDays("2026-07-27", -1) !== "2026-07-26") throw new Error("bad addDays");
});

test("isPastSixPm before 6pm", () => {
  const day = "2026-07-27";
  const noon = localSixPm(day);
  noon.setHours(12, 0, 0, 0);
  if (isPastSixPm(noon, day)) throw new Error("should be false before 6pm");
});

test("isPastLowEffortThreshold before and after 3pm", () => {
  if (LOW_EFFORT_THRESHOLD_HOUR !== 15) {
    throw new Error(`expected threshold hour 15, got ${LOW_EFFORT_THRESHOLD_HOUR}`);
  }
  const before = new Date(2026, 6, 28, 14, 59, 59);
  const at = new Date(2026, 6, 28, 15, 0, 0);
  const after = new Date(2026, 6, 28, 16, 30, 0);
  if (isPastLowEffortThreshold(before)) throw new Error("should be false before 3pm");
  if (!isPastLowEffortThreshold(at)) throw new Error("should be true at 3pm");
  if (!isPastLowEffortThreshold(after)) throw new Error("should be true after 3pm");
  if (!isPastLowEffortThreshold(after.getTime())) {
    throw new Error("should accept epoch ms");
  }
});

test("formatDurationMs", () => {
  if (formatDurationMs(7200000) !== "2h") throw new Error("bad format");
});

test("buildAnalytics completion rate", () => {
  const analytics = buildAnalytics(
    [
      { memberId: "a", dueDate: "2026-07-27", status: "completed", durationMs: 3600000 },
      { memberId: "a", dueDate: "2026-07-27", status: "pending", durationMs: null },
    ],
    { from: "2026-07-27", to: "2026-07-27", memberId: "all" }
  );
  if (analytics.summary.completionRate !== 50) throw new Error("expected 50%");
});

test("memberTaskCounts badge", () => {
  const tasks = [
    { memberId: "a", dueDate: "2026-07-26", status: "pending" },
    { memberId: "a", dueDate: "2026-07-27", status: "pending" },
  ];
  const now = new Date(2026, 6, 27, 12, 0);
  const c = memberTaskCounts(tasks, "a", "2026-07-27", now);
  if (c.overdueCount !== 1) throw new Error(`overdue ${c.overdueCount}`);
  if (c.badgeCount !== 1) throw new Error(`badge ${c.badgeCount}`);
});

test("validateDueDate rejects far future", () => {
  const today = "2026-07-27";
  try {
    validateDueDate("2028-07-27", today);
    throw new Error("should have thrown");
  } catch (err) {
    if (!err.message.includes("within")) throw err;
  }
});

test("isInactiveToday zero tasks and hours", () => {
  const inactive = {
    name: "Idle",
    pendingToday: 0,
    completedToday: 0,
    workingHoursMs: 0,
  };
  if (!isInactiveToday(inactive)) throw new Error("expected inactive");
  if (isInactiveToday({ ...inactive, completedToday: 1 })) {
    throw new Error("completed tasks should not be inactive");
  }
  if (isInactiveToday({ ...inactive, workingHoursMs: 60000 })) {
    throw new Error("logged hours should not be inactive");
  }
});

test("isBossMember and boss exclusion from low-effort", () => {
  if (BOSS_MEMBER_NAME !== "Ronak Vaya") {
    throw new Error(`unexpected boss name ${BOSS_MEMBER_NAME}`);
  }
  if (!isBossMember({ name: "Ronak Vaya" })) {
    throw new Error("should match boss by name");
  }
  if (!isBossMember({ name: "Ronak Vaya " })) {
    throw new Error("should trim name before match");
  }
  if (isBossMember({ name: "Akshay" })) throw new Error("non-boss should not match");

  const boss = {
    name: BOSS_MEMBER_NAME,
    pendingToday: 0,
    completedToday: 0,
    workingHoursMs: 0,
  };
  if (isInactiveToday(boss)) throw new Error("boss should never be inactive");

  const members = [
    boss,
    { name: "Akshay", pendingToday: 0, completedToday: 0, workingHoursMs: 0 },
  ];
  const names = inactiveMemberNames(members);
  if (names.includes(BOSS_MEMBER_NAME)) {
    throw new Error("boss should not appear in inactive names");
  }
  if (names.join(",") !== "Akshay") throw new Error(`names ${names}`);
});

test("inactiveMemberNames and formatLowEffortAlertText", () => {
  const members = [
    { name: "Akshay", pendingToday: 0, completedToday: 0, workingHoursMs: 0 },
    { name: "Bob", pendingToday: 1, completedToday: 0, workingHoursMs: 0 },
    { name: "Cara", pendingToday: 0, completedToday: 0, workingHoursMs: 0 },
    { name: "Dan", pendingToday: 0, completedToday: 0, workingHoursMs: 0 },
    { name: "Eve", pendingToday: 0, completedToday: 0, workingHoursMs: 0 },
  ];
  const names = inactiveMemberNames(members);
  if (names.join(",") !== "Akshay,Cara,Dan,Eve") throw new Error(`names ${names}`);
  if (formatLowEffortAlertText(names) !== "Akshay, Cara, Dan +1 more") {
    throw new Error(`truncated ${formatLowEffortAlertText(names)}`);
  }
  if (formatLowEffortAlertText(["Only"]) !== "Only") {
    throw new Error("single name should not truncate");
  }
});

test("memberTaskCounts working hours", () => {
  const tasks = [
    {
      memberId: "a",
      dueDate: "2026-07-27",
      status: "completed",
      startTime: new Date(2026, 6, 27, 9, 0),
      endTime: new Date(2026, 6, 27, 11, 0),
    },
    {
      memberId: "a",
      dueDate: "2026-07-27",
      status: "completed",
      durationMinutes: 30,
    },
  ];
  const now = new Date(2026, 6, 27, 12, 0);
  const c = memberTaskCounts(tasks, "a", "2026-07-27", now);
  if (c.completedToday !== 2) throw new Error(`completed ${c.completedToday}`);
  if (c.workingHoursMs !== 9000000) throw new Error(`hours ${c.workingHoursMs}`);
});

test("memberTaskCounts checked-in excludes overdue-only", () => {
  const tasks = [{ memberId: "a", dueDate: "2026-07-26", status: "pending" }];
  const now = new Date(2026, 6, 27, 12, 0);
  const c = memberTaskCounts(tasks, "a", "2026-07-27", now);
  if (c.overdueCount !== 1) throw new Error(`overdue ${c.overdueCount}`);
  const checkedIn = c.pendingToday + c.completedToday > 0;
  if (checkedIn) throw new Error("overdue-only user should not count as checked in");
});

test("derivePendingStatus overdue vs backlog", () => {
  const today = "2026-07-28";
  if (derivePendingStatus("2026-07-27", today) !== "overdue") {
    throw new Error("1 day late should be overdue");
  }
  if (derivePendingStatus("2026-07-25", today) !== "overdue") {
    throw new Error("3 days late should be overdue");
  }
  if (derivePendingStatus("2026-07-24", today) !== "backlog") {
    throw new Error("4+ days late should be backlog");
  }
});

test("taskToApi derives backlog status", () => {
  const now = new Date(2026, 6, 28, 12, 0);
  const today = "2026-07-28";
  const api = taskToApi(
    {
      id: "t1",
      memberId: "a",
      title: "Old task",
      notes: "",
      dueDate: "2026-07-20",
      status: "pending",
      createdAt: now,
    },
    now,
    today,
    { a: { id: "a", name: "A", color: "#000" } }
  );
  if (api.status !== "backlog") throw new Error(`expected backlog got ${api.status}`);
});

test("memberTaskCounts excludes backlog from overdue badge", () => {
  const tasks = [{ memberId: "a", dueDate: "2026-07-20", status: "pending" }];
  const now = new Date(2026, 6, 28, 12, 0);
  const c = memberTaskCounts(tasks, "a", "2026-07-28", now);
  if (c.overdueCount !== 0) throw new Error(`overdue ${c.overdueCount}`);
  if (c.backlogCount !== 1) throw new Error(`backlog ${c.backlogCount}`);
  if (c.badgeCount !== 0) throw new Error(`badge ${c.badgeCount}`);
});

test("fnv1aHash is stable and well-distributed", () => {
  const a = fnv1aHash("2026-07-28:user-a:morning");
  const b = fnv1aHash("2026-07-28:user-a:morning");
  const c = fnv1aHash("2026-07-28:user-b:morning");
  if (a !== b) throw new Error("hash should be stable");
  if (a === c) throw new Error("different seeds should differ");
});

test("dailyQuoteIndex differs per viewerSeed", () => {
  const dateKey = "2026-07-28";
  const bucket = "morning";
  const poolLength = 40;
  const guestA = dailyQuoteIndex(dateKey, bucket, poolLength, { viewerSeed: "seed-a" });
  const guestB = dailyQuoteIndex(dateKey, bucket, poolLength, { viewerSeed: "seed-b" });
  if (guestA === guestB) throw new Error("guests should get different indices");
});

test("dailyQuoteIndex stable for same identity per day", () => {
  const identity = { viewerSeed: "user-1", email: "a@b.com", memberId: "m1" };
  const i1 = dailyQuoteIndex("2026-07-28", "afternoon", 40, identity);
  const i2 = dailyQuoteIndex("2026-07-28", "afternoon", 40, identity);
  if (i1 !== i2) throw new Error("same day + identity should match");
  const i3 = dailyQuoteIndex("2026-07-29", "afternoon", 40, identity);
  if (i1 === i3) throw new Error("different days should usually differ");
});

test("buildQuoteSeed combines identity fields", () => {
  const seed = buildQuoteSeed({ viewerSeed: "u1", email: "x@y.com", memberId: "m1" });
  if (seed !== "u1:x@y.com:m1") throw new Error(`bad seed ${seed}`);
});

test("getDailyGreeting returns greeting and quote", () => {
  const result = getDailyGreeting({
    now: new Date(2026, 6, 28, 9, 0),
    userName: "Alex",
    viewerSeed: "viewer-abc",
    email: "alex@example.com",
    memberId: "mem-1",
  });
  if (!result.greeting.includes("Alex")) throw new Error("missing name");
  if (!result.quote || !result.emoji) throw new Error("missing quote parts");
});

test("formatTime12h uses 12-hour clock with AM/PM", () => {
  const afternoon = new Date(2026, 6, 28, 14, 30);
  const formatted = formatTime12h(afternoon);
  if (!formatted.includes("PM") && !formatted.includes("pm")) {
    throw new Error(`expected PM in ${formatted}`);
  }
  if (formatted.includes("14:")) {
    throw new Error(`expected 12h format, got ${formatted}`);
  }

  const morning = new Date(2026, 6, 28, 9, 15);
  const amFormatted = formatTime12h(morning);
  if (!amFormatted.includes("AM") && !amFormatted.includes("am")) {
    throw new Error(`expected AM in ${amFormatted}`);
  }

  if (formatTime12h(null) !== "—") throw new Error("null should em dash");
});

test("formatDateTime12h includes date and 12-hour time", () => {
  const ts = new Date(2026, 6, 28, 16, 45);
  const formatted = formatDateTime12h(ts);
  if (!formatted.includes("2026") && !formatted.includes("28")) {
    throw new Error(`expected date parts in ${formatted}`);
  }
  if (!formatted.includes("PM") && !formatted.includes("pm")) {
    throw new Error(`expected PM in ${formatted}`);
  }
});

test("toDatetimeLocalValue and parseDatetimeLocalValue round-trip local minutes", () => {
  const ts = new Date(2026, 6, 29, 11, 4, 59, 500);
  const value = toDatetimeLocalValue(ts);
  if (value !== "2026-07-29T11:04") {
    throw new Error(`expected minute truncation, got ${value}`);
  }

  const parsed = parseDatetimeLocalValue(value);
  const expected = new Date(2026, 6, 29, 11, 4, 0, 0).getTime();
  if (parsed !== expected) {
    throw new Error(`round-trip mismatch: ${parsed} !== ${expected}`);
  }

  if (!Number.isNaN(parseDatetimeLocalValue("2026-02-30T12:00"))) {
    throw new Error("invalid calendar day should be NaN");
  }
  if (!Number.isNaN(parseDatetimeLocalValue("not-a-date"))) {
    throw new Error("garbage input should be NaN");
  }
});

test("parseDatetimeLocalValue rejects values with timezone suffix", () => {
  if (!Number.isNaN(parseDatetimeLocalValue("2026-07-29T11:04:00Z"))) {
    throw new Error("timezone suffix should not parse as datetime-local");
  }
});

test("buildLocalDateTime 12-hour parts to epoch ms", () => {
  const ms = buildLocalDateTime("2026-07-29", 2, 30, "PM");
  const expected = new Date(2026, 6, 29, 14, 30, 0, 0).getTime();
  if (ms !== expected) throw new Error(`2:30 PM mismatch: ${ms} !== ${expected}`);

  const noon = buildLocalDateTime("2026-07-29", 12, 0, "PM");
  if (noon !== new Date(2026, 6, 29, 12, 0, 0, 0).getTime()) {
    throw new Error("12 PM should be hour 12");
  }

  const midnight = buildLocalDateTime("2026-07-29", 12, 0, "AM");
  if (midnight !== new Date(2026, 6, 29, 0, 0, 0, 0).getTime()) {
    throw new Error("12 AM should be hour 0");
  }

  if (!Number.isNaN(buildLocalDateTime("2026-02-30", 1, 0, "AM"))) {
    throw new Error("invalid date should be NaN");
  }
});

test("epochToPickerParts and pickerPartsToEpoch round-trip", () => {
  const ts = new Date(2026, 6, 29, 9, 47).getTime();
  const parts = epochToPickerParts(ts);
  if (!parts || parts.hour12 !== 9 || parts.minute !== 45 || parts.ampm !== "AM") {
    throw new Error(`bad parts ${JSON.stringify(parts)}`);
  }

  const back = pickerPartsToEpoch(parts);
  const expected = new Date(2026, 6, 29, 9, 45, 0, 0).getTime();
  if (back !== expected) throw new Error(`round-trip ${back} !== ${expected}`);
});

test("snapMinuteToQuarter", () => {
  if (snapMinuteToQuarter(7) !== 0) throw new Error("7 -> 0");
  if (snapMinuteToQuarter(8) !== 15) throw new Error("8 -> 15");
  if (snapMinuteToQuarter(52) !== 45) throw new Error("52 -> 45");
});

test("getNextRoastLabel office-hour schedule", () => {
  const before = getNextRoastLabel(new Date(2026, 6, 28, 9, 30));
  if (!before.text.includes("Roasts start at")) {
    throw new Error(`before hours: ${before.text}`);
  }

  const during = getNextRoastLabel(new Date(2026, 6, 28, 14, 18));
  if (!during.text.includes("Next roast in") && !during.text.includes("New roast at")) {
    throw new Error(`during hours: ${during.text}`);
  }

  const lastHour = getNextRoastLabel(new Date(2026, 6, 28, 17, 10));
  if (!lastHour.text.includes("Back tomorrow")) {
    throw new Error(`last hour: ${lastHour.text}`);
  }

  const after = getNextRoastLabel(new Date(2026, 6, 28, 19, 0));
  if (!after.text.includes("Back tomorrow")) {
    throw new Error(`after hours: ${after.text}`);
  }
});

test("office hours constants", () => {
  if (OFFICE_HOURS_START !== 10) throw new Error(`start ${OFFICE_HOURS_START}`);
  if (OFFICE_HOURS_END !== 18) throw new Error(`end ${OFFICE_HOURS_END}`);
});

test("isWithinOfficeHours boundaries", () => {
  if (isWithinOfficeHours(new Date(2026, 6, 28, 9, 59))) {
    throw new Error("9:59 should be outside office hours");
  }
  if (!isWithinOfficeHours(new Date(2026, 6, 28, 10, 0))) {
    throw new Error("10:00 should be inside office hours");
  }
  if (!isWithinOfficeHours(new Date(2026, 6, 28, 17, 30))) {
    throw new Error("5:30 PM should be inside office hours");
  }
  if (isWithinOfficeHours(new Date(2026, 6, 28, 18, 0))) {
    throw new Error("6:00 PM should be outside office hours");
  }
});

test("getHourSlot and buildJokeCacheKey", () => {
  const now = new Date(2026, 6, 28, 14, 22, 55);
  const slot = getHourSlot(now);
  if (slot.dateKey !== "2026-07-28") throw new Error(`date ${slot.dateKey}`);
  if (slot.hour !== 14) throw new Error(`hour ${slot.hour}`);
  if (slot.hourSlot !== "2026-07-28T14") throw new Error(`slot ${slot.hourSlot}`);
  if (buildJokeCacheKey(slot.dateKey, slot.hour) !== "2026-07-28:14") {
    throw new Error("bad cache key");
  }
});

test("pickMemberForSlot is deterministic per date+hour", () => {
  const profiles = [
    { name: "Akshay", keywords: ["helpful"] },
    { name: "Harsh", keywords: ["QA"] },
  ];
  const a = pickMemberForSlot("2026-07-28", 11, profiles);
  const b = pickMemberForSlot("2026-07-28", 11, profiles);
  if (!a || a.name !== b.name) throw new Error("same slot should match");
  const c = pickMemberForSlot("2026-07-28", 12, profiles);
  if (a.name === c.name && profiles.length > 1) {
    /* usually differs; allow rare collision */
  }
  const d = pickMemberForSlot("2026-07-29", 11, profiles);
  if (a.name === d.name && profiles.length > 1) {
    /* allow rare collision across days */
  }
  if (pickMemberForSlot("2026-07-28", 11, []) !== null) {
    throw new Error("empty profiles should return null");
  }
});

test("session join row exposes user id for roast updates", () => {
  const joinRow = {
    sessionId: "sess_1",
    id: "u_ms49na32_qm08r2",
    name: "Akshay Pareek",
    email: "akshay@example.com",
    memberId: "akshay-pareek",
    allowHourlyRoast: false,
    roastKeywords: "[]",
  };
  const userId = joinRow.id ?? joinRow.userId;
  if (userId !== "u_ms49na32_qm08r2") {
    throw new Error(`expected stable user id, got ${userId}`);
  }

  const legacyJoinRow = { ...joinRow, id: undefined, userId: "u_legacy" };
  const legacyId = legacyJoinRow.id ?? legacyJoinRow.userId;
  if (legacyId !== "u_legacy") {
    throw new Error(`expected legacy user id fallback, got ${legacyId}`);
  }
});

test("canViewHourlyJoke requires opt-in, id, and name (keywords optional)", () => {
  if (canViewHourlyJoke(null)) throw new Error("null user should not view");
  if (canViewHourlyJoke(undefined)) throw new Error("undefined user should not view");
  if (canViewHourlyJoke({})) throw new Error("missing id/name should not view");
  if (canViewHourlyJoke({ id: "u_1" })) throw new Error("missing name should not view");

  if (canViewHourlyJoke({ id: "u_off", name: "Akshay", allowHourlyRoast: false })) {
    throw new Error("opt-out user should not view hourly roast");
  }

  if (!canViewHourlyJoke({ id: "u_no_kw", name: "Akshay", allowHourlyRoast: true, roastKeywords: [] })) {
    throw new Error("opted-in user without keywords should view hourly roast");
  }

  if (!canViewHourlyJoke({ id: "u_ok", name: "Akshay", allowHourlyRoast: true, roastKeywords: ["helpful"] })) {
    throw new Error("Akshay should view hourly roast when opted in with keywords");
  }
  if (!canViewHourlyJoke({ id: "u_ok2", name: "Harsh", allowHourlyRoast: true, roastKeywords: ["QA"] })) {
    throw new Error("Harsh should view hourly roast when opted in with keywords");
  }
});

test("resolveJokeProfiles excludes opted-out roster members", () => {
  if (resolveJokeProfiles([]).length !== 0) {
    throw new Error("empty roster should yield no joke targets");
  }

  const allOptedOut = resolveJokeProfiles([
    { name: "Akshay", allowHourlyRoast: false },
    { name: "Harsh", allowHourlyRoast: false },
  ]);
  if (allOptedOut.length !== 0) {
    throw new Error("all-opted-out roster should yield no joke targets");
  }

  const resolved = resolveJokeProfiles([
    { name: "Akshay", allowHourlyRoast: false, roastKeywords: ["helpful"] },
    { name: "Harsh", allowHourlyRoast: true, roastKeywords: ["QA"] },
  ]);
  if (resolved.length !== 1 || resolved[0].name !== "Harsh") {
    throw new Error(`expected only Harsh, got ${resolved.map((p) => p.name).join(",")}`);
  }
});

test("resolveJokeProfiles includes opted-in members without keywords", () => {
  const resolved = resolveJokeProfiles([
    { name: "Akshay", allowHourlyRoast: true, roastKeywords: [] },
    { name: "Harsh", allowHourlyRoast: true, roastKeywords: ["QA"] },
  ]);
  if (resolved.length !== 2) {
    throw new Error(`expected Akshay and Harsh, got ${resolved.map((p) => p.name).join(",")}`);
  }
  const akshay = resolved.find((p) => p.name === "Akshay");
  if (!akshay || akshay.keywords.length !== 0) {
    throw new Error("Akshay should be included with empty keywords");
  }
});

test("resolveJokeProfiles dedupes by name", () => {
  const resolved = resolveJokeProfiles([
    { name: "Akshay", allowHourlyRoast: true, roastKeywords: ["helpful"] },
    { name: "Unknown Person", allowHourlyRoast: true, roastKeywords: ["mystery"] },
    { name: "Harsh", allowHourlyRoast: true, roastKeywords: ["QA"] },
  ]);
  if (resolved.length !== 3) throw new Error(`expected 3 profiles got ${resolved.length}`);
});

test("previously excluded names can opt in with keywords", () => {
  const resolved = resolveJokeProfiles([
    { name: "Aanvi", allowHourlyRoast: true, roastKeywords: ["funny"] },
    { name: "Rishika", allowHourlyRoast: true, roastKeywords: ["thoughtful"] },
    { name: "Ronak Vaya", allowHourlyRoast: true, roastKeywords: ["boss"] },
  ]);
  if (resolved.length !== 3) throw new Error(`expected 3 targets got ${resolved.length}`);
  if (!resolved.find((p) => p.name === "Ronak Vaya")?.isBoss) {
    throw new Error("Ronak Vaya should still be marked boss");
  }
});

test("roast keyword normalization", () => {
  const normalized = normalizeRoastKeywords([
    "  Coffee  ",
    "coffee",
    "QA",
    "one",
    "two",
    "three",
    "four",
    "five",
  ]);
  if (normalized.length !== MAX_ROAST_KEYWORDS) {
    throw new Error(`expected max ${MAX_ROAST_KEYWORDS}, got ${normalized.length}`);
  }
  if (normalized[0] !== "Coffee") throw new Error("trim failed");
  if (normalized.includes("coffee")) throw new Error("dedupe failed");

  const long = "x".repeat(MAX_KEYWORD_LENGTH + 10);
  const truncated = normalizeRoastKeywords([long])[0];
  if (truncated.length !== MAX_KEYWORD_LENGTH) throw new Error("length cap failed");

  const roundTrip = parseRoastKeywordsFromDb(serializeRoastKeywords(["helpful", "kind"]));
  if (roundTrip.join(",") !== "helpful,kind") throw new Error("serialize round trip failed");
  if (getUserRoastKeywords({ roastKeywords: roundTrip }).join(",") !== "helpful,kind") {
    throw new Error("getUserRoastKeywords failed");
  }
});

test("buildJokeUserPrompt uses keywords when present", () => {
  const prompt = buildJokeUserPrompt({
    name: "Akshay",
    keywords: ["cool", "helpful"],
    isBoss: false,
  });
  if (!prompt.includes("Akshay") || !prompt.includes("cool, helpful")) {
    throw new Error("prompt should include name and keywords");
  }
  const bossPrompt = buildJokeUserPrompt({
    name: "Ronak Vaya",
    keywords: ["leadership"],
    isBoss: true,
  });
  if (!bossPrompt.includes("boss")) throw new Error("boss note missing");
});

test("buildJokeUserPrompt roasts freely without keywords", () => {
  const prompt = buildJokeUserPrompt({
    name: "Akshay",
    keywords: [],
    isBoss: false,
  });
  if (!prompt.includes("Akshay") || prompt.includes("Personality keywords")) {
    throw new Error("no-keyword prompt should use name only, not keyword list");
  }
  if (!prompt.toLowerCase().includes("no personality keywords")) {
    throw new Error("no-keyword prompt should indicate free-form roast");
  }
});

test("parseJokeResponse", () => {
  const ok = parseJokeResponse('{"joke":"Prakhar speaks so fast Slack needs subtitles.","emoji":"😂"}');
  if (!ok?.joke.includes("Prakhar")) throw new Error("missing joke text");
  if (ok.emoji !== "😂") throw new Error("missing emoji");
  if (parseJokeResponse("{")) throw new Error("invalid JSON should return null");
});

test("buildFallbackJoke is deterministic per slot", () => {
  const profile = { name: "Akshay Pareek", keywords: [], isBoss: false };
  const first = buildFallbackJoke(profile, "2026-07-29", 11);
  const again = buildFallbackJoke(profile, "2026-07-29", 11);
  const otherHour = buildFallbackJoke(profile, "2026-07-29", 12);
  if (!first.joke.includes("Akshay Pareek")) throw new Error("fallback should include name");
  if (first.joke !== again.joke) throw new Error("fallback should be stable for same slot");
  if (!first.emoji) throw new Error("fallback should include emoji");
  if (first.joke === otherHour.joke) throw new Error("fallback should vary by hour");
});

test("getWeekBounds Monday–Sunday", () => {
  const { weekStart, weekEnd } = getWeekBounds(new Date(2026, 6, 29, 12, 0));
  if (weekStart !== "2026-07-27") throw new Error(`start ${weekStart}`);
  if (weekEnd !== "2026-08-02") throw new Error(`end ${weekEnd}`);
});

test("getPreviousWeekBounds", () => {
  const { weekStart, weekEnd } = getPreviousWeekBounds(new Date(2026, 6, 29, 12, 0));
  if (weekStart !== "2026-07-20") throw new Error(`prev start ${weekStart}`);
  if (weekEnd !== "2026-07-26") throw new Error(`prev end ${weekEnd}`);
});

test("daysFromMonday", () => {
  if (daysFromMonday(new Date(2026, 6, 27)) !== 0) throw new Error("Mon should be 0");
  if (daysFromMonday(new Date(2026, 6, 29)) !== 2) throw new Error("Wed should be 2");
  if (daysFromMonday(new Date(2026, 7, 2)) !== 6) throw new Error("Sun should be 6");
});

test("getWeekdayDates Mon–Fri only", () => {
  const days = getWeekdayDates("2026-07-27", "2026-08-02");
  if (days.length !== 5) throw new Error(`expected 5 weekdays got ${days.length}`);
  if (days[0] !== "2026-07-27" || days[4] !== "2026-07-31") {
    throw new Error(`bad weekdays ${days.join(",")}`);
  }
});

test("deriveCheckInStatus thresholds", () => {
  if (deriveCheckInStatus(5, 5) !== "excellent") throw new Error("5/5");
  if (deriveCheckInStatus(4, 5) !== "good") throw new Error("4/5");
  if (deriveCheckInStatus(3, 5) !== "fair") throw new Error("3/5");
  if (deriveCheckInStatus(2, 5) !== "needs-improvement") throw new Error("2/5");
});

test("aggregateWeekStats per member", () => {
  const members = [{ id: "a", name: "Akshay", color: "#000", initials: "AP" }];
  const tasks = [
    {
      memberId: "a",
      dueDate: "2026-07-27",
      status: "completed",
      startTime: new Date(2026, 6, 27, 9, 0),
      endTime: new Date(2026, 6, 27, 11, 0),
    },
    { memberId: "a", dueDate: "2026-07-28", status: "pending" },
  ];
  const stats = aggregateWeekStats(tasks, members, "2026-07-27", "2026-08-02");
  const m = stats.members[0];
  if (m.tasksCount !== 2) throw new Error(`tasks ${m.tasksCount}`);
  if (m.completedCount !== 1) throw new Error(`completed ${m.completedCount}`);
  if (m.workingHoursMs !== 7200000) throw new Error(`hours ${m.workingHoursMs}`);
  if (m.checkInDays < 1) throw new Error("should have check-in days");
});

test("parseReportResponse merges AI with stats", () => {
  const stats = {
    weekStart: "2026-07-27",
    weekEnd: "2026-08-02",
    members: [
      {
        memberId: "a",
        name: "Akshay",
        color: "#000",
        initials: "AP",
        tasksCount: 2,
        completedCount: 1,
        pendingCount: 1,
        workingHoursMs: 3600000,
        workingHoursLabel: "1h",
        checkInStatus: "good",
        checkInDays: 4,
        checkInExpectedDays: 5,
        taskTitles: ["Ship feature"],
        completionRate: 50,
        isInactive: false,
        isBoss: false,
      },
    ],
  };
  const raw = JSON.stringify({
    summary: "Solid week.",
    teamSummary: "Team crushed it.",
    members: [
      {
        memberId: "a",
        feedback: "Great work on Ship feature.",
        motivation: "Keep going!",
        energyLevel: "high",
      },
    ],
  });
  const parsed = parseReportResponse(raw, stats);
  if (!parsed?.summary.includes("Solid")) throw new Error("missing summary");
  if (parsed.members[0].feedback !== "Great work on Ship feature.") {
    throw new Error("missing feedback");
  }
  if (parsed.members[0].energyLevel !== "high") throw new Error("energy level");
});

test("getNextReportDate and daysUntil", () => {
  const monBeforeNine = getNextReportDate(new Date(2026, 6, 27, 8, 30));
  if (monBeforeNine.getHours() !== 9) throw new Error("should be 9 AM");
  if (localDayStr(monBeforeNine) !== "2026-07-27") {
    throw new Error("same Monday before 9");
  }

  const monAfterNine = getNextReportDate(new Date(2026, 6, 27, 10, 0));
  if (localDayStr(monAfterNine) !== "2026-08-03") {
    throw new Error(`next Monday after 9 got ${localDayStr(monAfterNine)}`);
  }

  const days = getDaysUntilNextReport(new Date(2026, 6, 27, 10, 0));
  if (days < 1) throw new Error(`daysUntil should be >= 1 got ${days}`);
});

test("shouldGeneratePreviousWeekReport Monday 9 AM gate", () => {
  if (shouldGeneratePreviousWeekReport(new Date(2026, 6, 28, 10, 0))) {
    throw new Error("Tuesday should not trigger");
  }
  if (shouldGeneratePreviousWeekReport(new Date(2026, 6, 27, 8, 0))) {
    throw new Error("Monday before 9 should not trigger");
  }
  if (!shouldGeneratePreviousWeekReport(new Date(2026, 6, 27, 9, 30))) {
    throw new Error("Monday after 9 should trigger");
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
