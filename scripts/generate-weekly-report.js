/**
 * Generate the weekly team report (previous week by default).
 *
 * Usage:
 *   node scripts/generate-weekly-report.js           # previous week, skip if exists
 *   node scripts/generate-weekly-report.js --force   # regenerate previous week
 *   node scripts/generate-weekly-report.js --week=2026-07-27
 *
 * Production cron (every Monday 9:05 AM IST):
 *   5 9 * * 1 cd /path/to/TaskManager && node scripts/generate-weekly-report.js >> /var/log/impact-wall-report.log 2>&1
 *
 * Or hit the API (set REPORTS_CRON_SECRET in .env):
 *   curl -X POST "$APP_URL/api/reports/generate" -H "x-reports-secret: $REPORTS_CRON_SECRET"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateAndSaveReport } from "../lib/reportStore.js";
import { getPreviousWeekBounds, getWeekBounds } from "../lib/weeklyReport.js";
import { appDayStr } from "../lib/appTimezone.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load `.env` when running outside Next.js.
 */
function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

/**
 * Parse CLI flags.
 * @param {string[]} argv
 * @returns {{ force: boolean, weekStart?: string }}
 */
function parseArgs(argv) {
  let force = false;
  let weekStart;

  for (const arg of argv) {
    if (arg === "--force") force = true;
    else if (arg.startsWith("--week=")) weekStart = arg.slice("--week=".length);
  }

  return { force, weekStart };
}

loadEnv();

const { force, weekStart } = parseArgs(process.argv.slice(2));
const bounds = weekStart ? getWeekBounds(weekStart) : getPreviousWeekBounds(new Date());

console.log(
  `Generating weekly report for ${bounds.weekStart} → ${bounds.weekEnd} (${appDayStr(new Date())} IST)…`
);

const { report, created } = await generateAndSaveReport({ ...bounds, force });

console.log(created ? "Created new report:" : "Report already exists (skipped):");
console.log(`  id: ${report.id}`);
console.log(`  week: ${report.weekStart} – ${report.weekEnd}`);
console.log(`  members: ${report.members?.length ?? 0}`);
console.log(`  summary: ${(report.summary || "").slice(0, 100)}…`);
process.exit(0);
