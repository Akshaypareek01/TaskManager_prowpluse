"use client";

import { useEffect } from "react";
import Button from "./components/ui/Button";
import Icon from "./components/ui/Icon";

/**
 * Route error boundary. The wall reads from Postgres on every request, so the
 * realistic failure here is "the database is unreachable" — say that plainly
 * and give people a retry instead of a blank screen.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Impact Wall failed to render:", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4 py-16">
      <div className="panel w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-danger-bg text-danger-fg">
          <Icon name="alert-triangle" size={22} />
        </span>

        <h1 className="text-lg font-semibold">The wall could not load</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Something went wrong fetching today&apos;s tasks. This is usually a temporary
          connection problem with the database.
        </p>

        {error?.digest && (
          <p className="mt-3 font-mono text-2xs text-ink-400">Reference: {error.digest}</p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button variant="primary" iconLeft="refresh" onClick={reset}>
            Try again
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
