import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/index.js";
import { tasks, weeklyReports } from "./db/schema.js";
import { getRegisteredMembers } from "./members.js";
import {
  aggregateWeekStats,
  generateWeeklyReportContent,
  getPreviousWeekBounds,
  getWeekBounds,
} from "./weeklyReport.js";

const REPORTS_PAGE_SIZE = 20;

/** In-flight generation locks keyed by week_start. */
const generationLocks = new Set();

/**
 * Generate a unique report id.
 * @returns {string}
 */
function newReportId() {
  return `wr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Map a DB row to API list/detail shape.
 * @param {object} row
 * @returns {object}
 */
export function reportToApi(row) {
  const content = row.content || {};
  return {
    id: row.id,
    weekStart: String(row.weekStart),
    weekEnd: String(row.weekEnd),
    generatedAt: new Date(row.generatedAt).getTime(),
    summary: content.summary || "",
    teamSummary: content.teamSummary || "",
    ceoNote: content.ceoNote || "",
    members: content.members || [],
    content,
  };
}

/**
 * List weekly reports newest first.
 * @param {{ limit?: number, offset?: number }} [opts]
 * @returns {Promise<{ reports: object[], total: number, hasMore: boolean }>}
 */
export async function listReports({ limit = REPORTS_PAGE_SIZE, offset = 0 } = {}) {
  const db = getDb();
  const pageSize = Math.min(Math.max(Math.floor(limit), 1), REPORTS_PAGE_SIZE);
  const pageOffset = Math.max(Math.floor(offset), 0);

  const rows = await db
    .select()
    .from(weeklyReports)
    .orderBy(desc(weeklyReports.weekStart))
    .limit(pageSize + 1)
    .offset(pageOffset);

  const hasMore = rows.length > pageSize;
  const slice = hasMore ? rows.slice(0, pageSize) : rows;

  const allRows = await db.select({ id: weeklyReports.id }).from(weeklyReports);
  const total = allRows.length;

  return {
    reports: slice.map(reportToApi),
    total,
    hasMore,
  };
}

/**
 * Fetch a single report by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getReportById(id) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.id, id))
    .limit(1);
  return row ? reportToApi(row) : null;
}

/**
 * Fetch report for a given week_start if it exists.
 * @param {string} weekStart
 * @returns {Promise<object|null>}
 */
export async function getReportByWeekStart(weekStart) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(weeklyReports)
    .where(eq(weeklyReports.weekStart, weekStart))
    .limit(1);
  return row ? reportToApi(row) : null;
}

/**
 * Get the most recently generated report.
 * @returns {Promise<object|null>}
 */
export async function getLatestReport() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(weeklyReports)
    .orderBy(desc(weeklyReports.weekStart))
    .limit(1);
  return row ? reportToApi(row) : null;
}

/**
 * Generate and persist a weekly report for the given week (idempotent).
 * @param {{ weekStart?: string, weekEnd?: string, apiKey?: string|null, force?: boolean }} [opts]
 * @returns {Promise<{ report: object, created: boolean }>}
 */
export async function generateAndSaveReport({
  weekStart,
  weekEnd,
  apiKey = null,
  force = false,
} = {}) {
  const bounds =
    weekStart && weekEnd
      ? { weekStart, weekEnd }
      : weekStart
        ? getWeekBounds(weekStart)
        : getPreviousWeekBounds();

  const lockKey = bounds.weekStart;
  if (generationLocks.has(lockKey)) {
    const existing = await getReportByWeekStart(bounds.weekStart);
    if (existing) return { report: existing, created: false };
    throw new Error("Report generation already in progress");
  }

  generationLocks.add(lockKey);
  try {
    const db = getDb();

    if (force) {
      await db.delete(weeklyReports).where(eq(weeklyReports.weekStart, bounds.weekStart));
    } else {
      const existing = await getReportByWeekStart(bounds.weekStart);
      if (existing) return { report: existing, created: false };
    }

    const registered = await getRegisteredMembers(db);
    const allTasks = await db.select().from(tasks);

    const stats = aggregateWeekStats(
      allTasks,
      registered,
      bounds.weekStart,
      bounds.weekEnd
    );

    const content = await generateWeeklyReportContent(stats, apiKey);
    const id = newReportId();
    const generatedAt = new Date();

    try {
      await db.insert(weeklyReports).values({
        id,
        weekStart: bounds.weekStart,
        weekEnd: bounds.weekEnd,
        content,
        generatedAt,
      });
    } catch (err) {
      if (err.code === "23505") {
        const raced = await getReportByWeekStart(bounds.weekStart);
        if (raced) return { report: raced, created: false };
      }
      throw err;
    }

    return {
      report: reportToApi({
        id,
        weekStart: bounds.weekStart,
        weekEnd: bounds.weekEnd,
        content,
        generatedAt,
      }),
      created: true,
    };
  } finally {
    generationLocks.delete(lockKey);
  }
}

/**
 * Clear in-memory generation locks (for tests).
 */
export function clearReportGenerationLocks() {
  generationLocks.clear();
}
