import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateAndSaveReport } from "@/lib/reportStore";
import { getPreviousWeekBounds, getWeekBounds } from "@/lib/weeklyReport";

export const dynamic = "force-dynamic";

/**
 * Authorize manual/cron report generation.
 * @param {Request} request
 * @returns {Promise<boolean>}
 */
async function isAuthorized(request) {
  const cronSecret = process.env.REPORTS_CRON_SECRET;
  if (cronSecret) {
    const header = request.headers.get("x-reports-secret");
    const auth = request.headers.get("authorization");
    if (header === cronSecret) return true;
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  const user = await getSessionUser();
  return Boolean(user);
}

/**
 * POST /api/reports/generate — manual or cron trigger for weekly report generation.
 */
export async function POST(request) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let weekStart;
    let weekEnd;
    try {
      const body = await request.json();
      weekStart = body?.weekStart;
      weekEnd = body?.weekEnd;
    } catch {
      /* empty body OK — defaults to previous week */
    }

    const bounds = weekStart
      ? weekEnd
        ? { weekStart, weekEnd }
        : getWeekBounds(weekStart)
      : getPreviousWeekBounds();

    const { report, created } = await generateAndSaveReport(bounds);
    return NextResponse.json({ report, created });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
