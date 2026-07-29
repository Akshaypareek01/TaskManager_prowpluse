import { NextResponse } from "next/server";
import { getReportById } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/[id] — single weekly report detail (public read).
 * @param {{ params: { id: string } }} context
 */
export async function GET(_request, { params }) {
  try {
    const report = await getReportById(params.id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
