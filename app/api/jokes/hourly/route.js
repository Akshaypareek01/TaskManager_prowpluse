import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db/index";
import { getHourlyJoke } from "@/lib/hourlyJokes";
import { getRoastEligibleRoster } from "@/lib/members";
import { canViewHourlyJoke } from "@/lib/teamProfiles";

export const dynamic = "force-dynamic";

/**
 * GET /api/jokes/hourly — AI joke for the current office-hour slot.
 * Requires sign-in and joke-view permission; returns `null` when ineligible.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }
    if (!canViewHourlyJoke(user)) {
      return NextResponse.json(null);
    }

    const db = getDb();
    const rosterMembers = await getRoastEligibleRoster(db);

    const payload = await getHourlyJoke({
      apiKey: process.env.OPENAI_API_KEY ?? null,
      rosterMembers,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[api/jokes/hourly]", err.message);
    return NextResponse.json(null);
  }
}
