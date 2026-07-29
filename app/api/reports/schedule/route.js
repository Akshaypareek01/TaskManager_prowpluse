import { NextResponse } from "next/server";
import {
  generateAndSaveReport,
  getLatestReport,
  getReportByWeekStart,
} from "@/lib/reportStore";
import {
  getDaysUntilNextReport,
  getNextReportDate,
  getPreviousWeekBounds,
  shouldGeneratePreviousWeekReport,
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

    let lastReport = await getLatestReport();
    let generating = false;

    if (shouldGeneratePreviousWeekReport(now)) {
      const existing = await getReportByWeekStart(prevStart);
      if (!existing) {
        try {
          const { report, created } = await generateAndSaveReport({
            weekStart: prevStart,
            weekEnd: prevEnd,
          });
          if (created || report) {
            lastReport = report;
            generating = created;
          }
        } catch (err) {
          console.error("[api/reports/schedule] auto-generate failed:", err.message);
        }
      }
    }

    return NextResponse.json({
      nextReportAt,
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
      generating,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
