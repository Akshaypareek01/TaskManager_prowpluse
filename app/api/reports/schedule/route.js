import { NextResponse } from "next/server";
import {
  ensureWeeklyReportIfNeeded,
  getLatestReport,
} from "@/lib/reportStore";
import { appDayStr } from "@/lib/appTimezone";
import {
  getDaysUntilNextReport,
  getNextReportDate,
  getPreviousWeekBounds,
} from "@/lib/weeklyReport";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/schedule — next report time, countdown, and auto-generate if due.
 */
export async function GET() {
  try {
    const now = new Date();
    const nextReportAt = getNextReportDate(now).getTime();
    const daysUntil = getDaysUntilNextReport(now);
    const { weekStart: prevStart, weekEnd: prevEnd } = getPreviousWeekBounds(now);

    const generated = await ensureWeeklyReportIfNeeded(now);
    let lastReport = generated?.report || (await getLatestReport());

    return NextResponse.json({
      nextReportAt,
      nextReportDay: appDayStr(nextReportAt),
      daysUntil,
      lastReport: lastReport
        ? {
            id: lastReport.id,
            weekStart: lastReport.weekStart,
            weekEnd: lastReport.weekEnd,
            generatedAt: lastReport.generatedAt,
            teamSummary: lastReport.teamSummary,
          }
        : null,
      previousWeek: { weekStart: prevStart, weekEnd: prevEnd },
      generating: Boolean(generated?.created),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
