import { NextResponse } from "next/server";
import { requireAuth, updateRoastPreference } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/auth/roast-preference — update hourly roast opt-in and keywords.
 * Body: `{ allow?: boolean, keywords?: string[] }` (at least one field required)
 */
export async function PATCH(request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const allow = body?.allow;
    const keywords = body?.keywords;

    if (allow === undefined && keywords === undefined) {
      return NextResponse.json(
        { error: "allow or keywords is required" },
        { status: 400 }
      );
    }

    if (allow !== undefined && typeof allow !== "boolean") {
      return NextResponse.json({ error: "allow must be a boolean" }, { status: 400 });
    }

    if (keywords !== undefined && !Array.isArray(keywords)) {
      return NextResponse.json({ error: "keywords must be an array" }, { status: 400 });
    }

    const updated = await updateRoastPreference(user.id, { allow, keywords });
    return NextResponse.json({ user: updated });
  } catch (err) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message || "Could not update preference" }, { status });
  }
}
