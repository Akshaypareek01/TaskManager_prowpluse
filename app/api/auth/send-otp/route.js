import { NextResponse } from "next/server";
import { createOtpForEmail, isValidEmail, normalizeEmail } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/send-otp — email a 6-digit code.
 * Body: { email, purpose?: "signin" | "register" }
 */
export async function POST(request) {
  try {
    const { email, purpose = "signin" } = await request.json();
    const normalized = normalizeEmail(email);

    if (!isValidEmail(normalized)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const code = await createOtpForEmail(normalized);
    await sendOtpEmail(normalized, code, purpose === "register" ? "register" : "signin");

    return NextResponse.json({ ok: true, message: "Check your email for a 6-digit code." });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not send code" },
      { status: err.status || 400 }
    );
  }
}
