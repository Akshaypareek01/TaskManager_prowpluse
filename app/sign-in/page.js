import { Suspense } from "react";
import SignInForm from "./SignInForm";

export const metadata = {
  title: "Sign in · Impact Wall",
  description: "Sign in with email to add and complete tasks on the PROWPLUS Impact Wall.",
};

/**
 * Dedicated sign-in page — email + OTP, no modal.
 */
export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense
        fallback={
          <div className="panel mx-auto w-full max-w-md p-8 text-center text-sm text-ink-500">
            Loading…
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </main>
  );
}
