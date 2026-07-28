import { NextResponse } from "next/server";
import { getHourlyJoke } from "@/lib/hourlyJokes";

export const dynamic = "force-dynamic";

/**
 * GET /api/jokes/hourly — AI joke for the current office-hour slot.
 * Returns `{ joke, memberName, emoji, hourSlot }` or `null` outside hours / on failure.
 */
export async function GET() {
  try {
    const payload = await getHourlyJoke({
      apiKey: process.env.OPENAI_API_KEY ?? null,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[api/jokes/hourly]", err.message);
    return NextResponse.json(null);
  }
}
