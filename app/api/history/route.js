import { NextResponse } from "next/server";
import { getHistory } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/history — task history and analytics for a date range.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId") || "all";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const taskLimit = Number(searchParams.get("taskLimit") || 50);
    const taskOffset = Number(searchParams.get("taskOffset") || 0);
    const includeAnalytics = searchParams.get("includeAnalytics") !== "false";

    const data = await getHistory({
      memberId,
      from,
      to,
      taskLimit,
      taskOffset,
      includeAnalytics,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
