import { NextResponse } from "next/server";
import { requireAuth, updateRoastPreference } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/auth/roast-preference — update hourly roast opt-in for the current user.
 * Body: `{ allow: boolean }`
 */
export async function PATCH(request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const allow = body?.allow;

    if (typeof allow !== "boolean") {
      return NextResponse.json({ error: "allow must be a boolean" }, { status: 400 });
    }

    const updated = await updateRoastPreference(user.id, allow);
    return NextResponse.json({ user: updated });
  } catch (err) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message || "Could not update preference" }, { status });
  }
}
