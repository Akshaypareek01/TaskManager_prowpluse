import { NextResponse } from "next/server";
import { markAlertsRead } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/read — mark alerts as read.
 * Body: { alertIds?: string[], memberId?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const alertIds = Array.isArray(body.alertIds)
      ? body.alertIds.filter((id) => typeof id === "string" && id.trim())
      : [];
    const memberId =
      typeof body.memberId === "string" && body.memberId.trim()
        ? body.memberId.trim()
        : undefined;

    if (alertIds.length === 0 && !memberId) {
      return NextResponse.json(
        { error: "Provide alertIds or memberId" },
        { status: 400 }
      );
    }

    const result = await markAlertsRead({ alertIds, memberId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to mark alerts read" },
      { status: 400 }
    );
  }
}
