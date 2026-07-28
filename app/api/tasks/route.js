import { NextResponse } from "next/server";
import { assertCanActOnMember, requireAuth } from "@/lib/auth";
import { getState, addTask, completeTask, getTaskById } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/state — full application state for polling.
 */
export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to load state" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks — create a new task.
 */
export async function POST(request) {
  try {
    const user = await requireAuth();
    const { title, notes, dueDate } = await request.json();
    const memberId = user.memberId;
    assertCanActOnMember(user, memberId);
    await addTask(memberId, { title, notes, dueDate, assignedByUserId: user.id });
    const state = await getState({ forceAlerts: true });
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 400 }
    );
  }
}

/**
 * PATCH /api/tasks — complete a task (body includes taskId).
 */
export async function PATCH(request) {
  try {
    const user = await requireAuth();
    const { taskId, startTime, endTime } = await request.json();
    if (!taskId) throw new Error("taskId is required");

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    assertCanActOnMember(user, task.memberId);

    await completeTask(taskId, startTime, endTime);
    const state = await getState({ forceAlerts: true });
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 400 }
    );
  }
}
