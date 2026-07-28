import { NextResponse } from "next/server";
import {
  createSession,
  findUserByEmail,
  isValidEmail,
  normalizeEmail,
  registerUser,
  verifyOtp,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-otp — sign in or register after OTP check.
 * Body: { email, code, mode: "signin"|"register", name? }
 */
export async function POST(request) {
  try {
    const { email, code, mode = "signin", name } = await request.json();
    const normalized = normalizeEmail(email);

    if (!isValidEmail(normalized)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    await verifyOtp(normalized, code);

    let user;
    if (mode === "register") {
      user = await registerUser({ name, email: normalized });
    } else {
      user = await findUserByEmail(normalized);
      if (!user) {
        return NextResponse.json(
          { error: "No account found for this email. Create an account first." },
          { status: 404 }
        );
      }
    }

    const session = await createSession(user.id);
    return NextResponse.json({ user: session.user });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Verification failed" },
      { status: err.status || 400 }
    );
  }
}
