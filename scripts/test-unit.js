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
} from "../lib/dates.js";
import { buildAnalytics, formatDurationMs, taskToApi, derivePendingStatus } from "../lib/analytics.js";
import { memberTaskCounts } from "../lib/alerts.js";
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
