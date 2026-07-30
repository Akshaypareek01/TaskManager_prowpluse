/**
 * Generate a weekly report from current dev data (current week, force refresh).
 * Usage: node scripts/generate-report-dev.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { localDayStr } from "../lib/dates.js";
import { generateAndSaveReport } from "../lib/reportStore.js";
import { getWeekBounds } from "../lib/weeklyReport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

loadEnv();

const today = localDayStr(new Date());
const bounds = getWeekBounds(today);

console.log(`Generating report for ${bounds.weekStart} → ${bounds.weekEnd}…`);

const { report, created } = await generateAndSaveReport({ ...bounds, force: true });

console.log(created ? "Created new report:" : "Refreshed existing report:");
console.log(`  id: ${report.id}`);
console.log(`  week: ${report.weekStart} – ${report.weekEnd}`);
console.log(`  members: ${report.members?.length ?? 0}`);
console.log(`  summary: ${report.summary?.slice(0, 80)}…`);
process.exit(0);
