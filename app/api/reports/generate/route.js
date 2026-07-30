import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateAndSaveReport } from "@/lib/reportStore";
import { getPreviousWeekBounds, getWeekBounds } from "@/lib/weeklyReport";
import { localDayStr } from "@/lib/dates";

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
    let force = false;
    let currentWeek = false;
    try {
      const body = await request.json();
      weekStart = body?.weekStart;
      weekEnd = body?.weekEnd;
      force = Boolean(body?.force);
      currentWeek = Boolean(body?.currentWeek);
    } catch {
      /* empty body OK — defaults to previous week */
    }

    const bounds = currentWeek
      ? getWeekBounds(localDayStr(new Date()))
      : weekStart
        ? weekEnd
          ? { weekStart, weekEnd }
          : getWeekBounds(weekStart)
        : getPreviousWeekBounds();

    const allowForce = process.env.NODE_ENV !== "production";
    const { report, created } = await generateAndSaveReport({
      ...bounds,
      force: allowForce && force,
    });
    return NextResponse.json({ report, created });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
