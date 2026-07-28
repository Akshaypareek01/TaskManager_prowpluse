import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — current signed-in user or null.
 * Returns 401 when a stale session cookie was present but invalid/expired.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const hadCookie = Boolean(cookieStore.get(SESSION_COOKIE)?.value);
    const user = await getSessionUser();

    if (hadCookie && !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not load session" },
      { status: 500 }
    );
  }
}
