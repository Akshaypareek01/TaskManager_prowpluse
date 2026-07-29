import { NextResponse } from "next/server";
import { listReports } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports — paginated list of weekly team reports (public read).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 20);
    const offset = Number(searchParams.get("offset") || 0);
    const data = await listReports({ limit, offset });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
