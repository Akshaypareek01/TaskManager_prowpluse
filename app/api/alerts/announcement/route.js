import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAnnouncement } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts/announcement — broadcast an announcement to the whole team.
 * Body: { title: string, description: string }
 */
export async function POST(request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title : "";
    const description = typeof body.description === "string" ? body.description : "";

    const state = await createAnnouncement({
      title,
      description,
      authorName: user.name,
    });

    return NextResponse.json(state);
  } catch (err) {
    const status = err.status === 401 ? 401 : 400;
    return NextResponse.json({ error: err.message || "Failed to post announcement" }, { status });
  }
}
