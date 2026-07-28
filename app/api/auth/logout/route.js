import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout — revoke session and clear cookie.
 */
export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not sign out" },
      { status: 400 }
    );
  }
}
