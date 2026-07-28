import { NextResponse } from "next/server";
import { assertCanActOnMember, requireAuth } from "@/lib/auth";
import { getState, completeTask, getTaskById } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tasks/[id] — mark task complete with start/end times.
 */
export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth();
    const task = await getTaskById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    assertCanActOnMember(user, task.memberId);

    const { startTime, endTime } = await request.json();
    await completeTask(params.id, startTime, endTime);
    const state = await getState({ forceAlerts: true });
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 400 }
    );
  }
}
