import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../lib/db/index.js";
import { tasks } from "../lib/db/schema.js";
import { localDayStr } from "../lib/dates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../data/data.json");

/**
 * Load .env into process.env when running scripts outside Next.js.
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
 * One-time import of legacy JSON updates into tasks table.
 */
async function importLegacy() {
  loadEnv();
  if (!fs.existsSync(DATA_FILE)) {
    console.log("No data/data.json found — nothing to import.");
    return;
  }

  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const updates = Array.isArray(raw.updates) ? raw.updates : [];
  if (updates.length === 0) {
    console.log("No updates in data.json — nothing to import.");
    return;
  }

  const db = getDb();
  let imported = 0;
  let skipped = 0;

  for (const u of updates) {
    if (!u.memberId) {
      skipped += 1;
      continue;
    }

    const created = new Date(u.ts);
    const dueDate = localDayStr(created);
    const id = `legacy_${u.id}`;

    try {
      await db.insert(tasks).values({
        id,
        memberId: u.memberId,
        title: String(u.body || "").trim().slice(0, 200) || "Imported update",
        notes: "Imported from legacy Impact Wall",
        dueDate,
        status: "completed",
        createdAt: created,
        completedAt: created,
        startTime: created,
        endTime: created,
        durationMinutes: 0,
      });
      imported += 1;
    } catch (err) {
      if (err.code === "23505") {
        skipped += 1;
      } else {
        throw err;
      }
    }
  }

  console.log(
    `Import done: ${imported} tasks imported, ${skipped} skipped. Reactions/weekly not migrated.`
  );
}

importLegacy().catch((err) => {
  console.error(err);
  process.exit(1);
});
