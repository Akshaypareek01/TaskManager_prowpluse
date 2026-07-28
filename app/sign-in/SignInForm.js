"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { Field, TextInput } from "../components/ui/Field";

/**
 * Email + OTP sign-in and registration on one page.
 */
export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const [mode, setMode] = useState("signin");
  const [step, setStep] = useState("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const nameValid = name.trim().length >= 2;
  const codeValid = /^\d{6}$/.test(code.trim());

  /**
   * Request a one-time code via email.
   */
  async function sendCode() {
    setError("");
    setInfo("");
    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "register" && !nameValid) {
      setError("Enter your name (at least 2 characters).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          purpose: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");

      setStep("code");
      setInfo("We sent a 6-digit code to your email. It expires in 10 minutes.");
    } catch (err) {
      setError(err.message || "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Verify OTP and establish a session.
   */
  async function verifyCode(e) {
    e?.preventDefault();
    setError("");
    if (!codeValid) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          mode,
          name: mode === "register" ? name.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      router.push(returnUrl);
      router.refresh();
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Switch between sign-in and create-account modes.
   * @param {"signin"|"register"} next
   */
  function switchMode(next) {
    setMode(next);
    setStep("email");
    setCode("");
    setError("");
    setInfo("");
  }

  return (
    <div className="panel mx-auto w-full max-w-md p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <img
          src="https://prowplus.ai/pp_icons.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg border border-line bg-surface object-contain p-1"
        />
        <div>
          <h1 className="text-lg font-semibold">Impact Wall</h1>
          <p className="text-xs text-ink-500">Sign in to add and complete tasks</p>
        </div>
      </div>

      <div
        className="mb-6 flex rounded-lg border border-line bg-surface-hover p-1"
        role="tablist"
        aria-label="Authentication mode"
      >
        {[
          { key: "signin", label: "Sign in" },
          { key: "register", label: "Create account" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mode === tab.key}
            onClick={() => switchMode(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-fast ${
              mode === tab.key
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={step === "code" ? verifyCode : (e) => { e.preventDefault(); sendCode(); }} noValidate>
        {mode === "register" && step === "email" && (
          <Field label="Your name" required className="mb-4" error={error && !nameValid ? error : undefined}>
            <TextInput
              value={name}
              autoComplete="name"
              placeholder="Akshay Pareek"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}

        {step === "email" ? (
          <Field
            label="Email"
            required
            hint="We will send a one-time code — no password needed."
            className="mb-5"
            error={error && emailValid === false ? error : undefined}
          >
            <TextInput
              type="email"
              value={email}
              autoComplete="email"
              inputMode="email"
              placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-600">
              Code sent to <span className="font-medium text-ink">{email.trim()}</span>
              {" · "}
              <button
                type="button"
                className="font-medium text-brand-600 hover:underline"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                  setInfo("");
                }}
              >
                Change email
              </button>
            </p>

            <Field label="6-digit code" required className="mb-5" error={error || undefined}>
              <TextInput
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className="tracking-[0.3em] tabular-nums"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </Field>
          </>
        )}

        {info && !error && (
          <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
            <Icon name="mail" size={15} className="mt-0.5" />
            {info}
          </p>
        )}

        {error && step === "code" && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-sm font-medium text-danger-fg">
            <Icon name="alert-circle" size={15} className="mt-0.5" />
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={busy}
          loadingLabel={step === "email" ? "Sending" : "Verifying"}
          disabled={step === "email" ? !emailValid || (mode === "register" && !nameValid) : !codeValid}
        >
          {step === "email" ? "Send code" : mode === "register" ? "Create account" : "Sign in"}
        </Button>
      </form>

      {step === "code" && (
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm font-medium text-ink-500 hover:text-brand-600"
            disabled={busy}
            onClick={sendCode}
          >
            Resend code
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link href={returnUrl} className="font-medium text-brand-600 hover:underline">
          Back to the wall
        </Link>
        {" "}— viewing stays public
      </p>
    </div>
  );
}
