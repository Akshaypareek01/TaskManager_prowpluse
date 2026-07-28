/**
 * Unit tests for date helpers and analytics (run with node).
 */
import { localDayStr, addDays, isPastSixPm, localSixPm, validateDueDate } from "../lib/dates.js";
import { buildAnalytics, formatDurationMs, taskToApi, derivePendingStatus } from "../lib/analytics.js";
import { memberTaskCounts } from "../lib/alerts.js";

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
