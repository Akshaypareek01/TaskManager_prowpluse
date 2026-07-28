import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/alerts — paginated alerts for a date window.
 * Query: days (1–30), memberId, limit, offset
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") || 1);
    const memberId = searchParams.get("memberId") || "all";
    const limit = Number(searchParams.get("limit") || 50);
    const offset = Number(searchParams.get("offset") || 0);

    const result = await getAlerts({ days, memberId, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to load alerts" },
      { status: 400 }
    );
  }
}
