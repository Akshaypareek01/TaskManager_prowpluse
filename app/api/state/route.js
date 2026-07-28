import { NextResponse } from "next/server";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getState();
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to load state" },
      { status: 500 }
    );
  }
}
