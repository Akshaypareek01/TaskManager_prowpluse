import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getRegisteredMembers } from "../members.js";
import { alerts, tasks } from "./schema.js";

const { Pool } = pg;

/**
 * Build a stable text id matching lib/store.js newId() shape.
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Format a Date as YYYY-MM-DD in local timezone.
 * @param {Date} d
 * @returns {string}
 */
function localDayStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Optional demo rows for local dev. Production seed is a no-op (empty DB).
 * Set SEED_DEMO=1 to insert sample tasks/alerts for the first two registered users.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @returns {Promise<{ tasksInserted: number; alertsInserted: number }>}
 */
async function seedDemo(db) {
  const registered = await getRegisteredMembers(db);
  if (registered.length === 0) {
    console.log("SEED_DEMO=1 but no registered users — skipping demo tasks");
    return { tasksInserted: 0, alertsInserted: 0 };
  }

  const demoMembers = registered.slice(0, 2).map((m) => m.id);
  const today = localDayStr(new Date());
  const yesterday = localDayStr(new Date(Date.now() - 86400000));

  const demoTasks = [
    {
      id: newId("task"),
      memberId: demoMembers[0],
      title: "Ship daily standup notes",
      notes: null,
      dueDate: today,
      status: "completed",
      completedAt: new Date(),
      startTime: new Date(Date.now() - 45 * 60 * 1000),
      endTime: new Date(Date.now() - 15 * 60 * 1000),
      durationMinutes: 30,
    },
    {
      id: newId("task"),
      memberId: demoMembers[0],
      title: "Review PR queue",
      notes: "Focus on backend",
      dueDate: today,
      status: "in_progress",
      startTime: new Date(Date.now() - 20 * 60 * 1000),
      endTime: null,
      durationMinutes: null,
      completedAt: null,
    },
    ...(demoMembers[1]
      ? [
          {
            id: newId("task"),
            memberId: demoMembers[1],
            title: "Update task board",
            notes: null,
            dueDate: yesterday,
            status: "pending",
            completedAt: null,
            startTime: null,
            endTime: null,
            durationMinutes: null,
          },
        ]
      : []),
  ];

  await db.insert(tasks).values(demoTasks);

  const overdueTask = demoTasks.find((t) => t.dueDate === yesterday);
  const alertRows = [
    {
      id: newId("alert"),
      type: "completion_congrats",
      memberId: demoTasks[0].memberId,
      taskId: demoTasks[0].id,
      message: "Nice work completing your task!",
      read: false,
    },
  ];

  if (overdueTask) {
    alertRows.push({
      id: newId("alert"),
      type: "overdue",
      memberId: overdueTask.memberId,
      taskId: overdueTask.id,
      message: "Task is overdue — pick it up when you can.",
      read: false,
    });
  }

  await db.insert(alerts).values(alertRows);

  return { tasksInserted: demoTasks.length, alertsInserted: alertRows.length };
}

/**
 * Fresh-start seed: validates env + roster, optionally loads demo data.
 * Does not import legacy data/data.json.
 * @returns {Promise<void>}
 */
export async function seedDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to seed the database");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  try {
    if (process.env.SEED_DEMO === "1") {
      const result = await seedDemo(db);
      console.log(
        `Seed complete (demo): ${result.tasksInserted} tasks, ${result.alertsInserted} alerts`
      );
    } else {
      console.log("Seed complete: empty database (roster grows via user registration)");
    }
  } finally {
    await pool.end();
  }
}
