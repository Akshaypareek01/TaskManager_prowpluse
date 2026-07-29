"use client";

import { useEffect, useMemo, useState } from "react";
import { getNextRoastLabel, isWithinOfficeHours } from "@/lib/hourlyJokes";

const FETCH_ATTEMPTS = 3;
const RETRY_BASE_MS = 1200;

/**
 * Pause before retrying a failed hourly joke fetch.
 * @param {number} attempt Zero-based attempt index
 * @returns {Promise<void>}
 */
function retryDelay(attempt) {
  return new Promise((resolve) => {
    setTimeout(resolve, RETRY_BASE_MS * (attempt + 1));
  });
}

/**
 * Fetch the current hourly roast payload with retries during office hours.
 * @param {number} [attempt]
 * @returns {Promise<object|null>}
 */
async function fetchHourlyJokePayload(attempt = 0) {
  const res = await fetch("/api/jokes/hourly", { cache: "no-store" });
  if (!res.ok) {
    if (attempt < FETCH_ATTEMPTS - 1) {
      await retryDelay(attempt);
      return fetchHourlyJokePayload(attempt + 1);
    }
    return null;
  }

  const data = await res.json();
  if (data?.joke) return data;

  const inOfficeHours = isWithinOfficeHours(new Date());
  if (inOfficeHours && attempt < FETCH_ATTEMPTS - 1) {
    await retryDelay(attempt);
    return fetchHourlyJokePayload(attempt + 1);
  }

  return null;
}

/**
 * Amber banner for the current hour's team roast with countdown meta.
 * @param {{ hourSlotKey: string, now: number }} props
 */
export default function HourlyRoastBanner({ hourSlotKey, now }) {
  const [hourlyJoke, setHourlyJoke] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const officeHoursActive = useMemo(() => isWithinOfficeHours(new Date(now)), [now]);
  const nextRoastLabel = useMemo(() => getNextRoastLabel(new Date(now)), [now]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFetchFailed(false);

      try {
        const payload = await fetchHourlyJokePayload();
        if (cancelled) return;
        setHourlyJoke(payload);
        setFetchFailed(!payload && officeHoursActive);
      } catch {
        if (!cancelled) {
          setHourlyJoke(null);
          setFetchFailed(officeHoursActive);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hourSlotKey, officeHoursActive]);

  const ariaLabel = hourlyJoke
    ? `Hourly joke about ${hourlyJoke.memberName}. ${hourlyJoke.joke}. ${nextRoastLabel.ariaLabel}`
    : nextRoastLabel.ariaLabel;

  /** User-facing body copy when no joke is available yet. */
  const placeholderMessage = (() => {
    if (loading) return "Roast loading…";
    if (!officeHoursActive) return null;
    if (fetchFailed) return "Could not load this hour's roast — try refreshing.";
    return "First roast at the top of each hour.";
  })();

  return (
    <aside
      className="relative mt-3 max-w-2xl rounded-r-lg border-l-2 border-amber-400/70 bg-gradient-to-r from-amber-50/60 to-amber-50/20 py-3 pl-3.5 pr-3 sm:pl-4"
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="select-none text-base leading-none" aria-hidden="true">
          😂
        </span>
        <span className="text-[13px] font-semibold leading-snug text-ink">Hourly roast</span>
        {hourlyJoke?.memberName ? (
          <span className="rounded-md bg-amber-100/90 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900/90">
            {hourlyJoke.memberName}
          </span>
        ) : null}
      </div>

      {hourlyJoke?.joke ? (
        <p
          className="mt-2 text-sm leading-relaxed text-ink break-words"
          suppressHydrationWarning
        >
          {hourlyJoke.joke}
          {hourlyJoke.emoji ? (
            <span className="ml-1 select-none" aria-hidden="true">
              {hourlyJoke.emoji}
            </span>
          ) : null}
        </p>
      ) : placeholderMessage ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-500" suppressHydrationWarning>
          {placeholderMessage}
        </p>
      ) : null}

      <p
        className="mt-1.5 text-[11px] font-medium text-ink-500"
        suppressHydrationWarning
      >
        {nextRoastLabel.text}
      </p>
    </aside>
  );
}
