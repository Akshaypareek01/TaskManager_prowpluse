"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import EmptyState from "./ui/EmptyState";
import Skeleton from "./ui/Skeleton";
import LeaderboardPodium, { rankTopPerformers } from "./history/LeaderboardPodium";
import RankOverallList from "./history/RankOverallList";
import { addDays } from "@/lib/dates";
import { tBase } from "@/lib/motion";

const RANK_WINDOW_DAYS = 29;
const POLL_MS = 20000;

function RankSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className={`mx-auto w-full max-w-[168px] rounded-2xl ${i === 1 ? "h-48 -translate-y-5" : "h-44"}`}
            />
          ))}
        </div>
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

/**
 * Live rolling 30-day team rank — no date filters, refreshes automatically.
 * @param {{ today: string }} props
 */
export default function RankTab({ today }) {
  const reduced = useReducedMotion();
  const [byMember, setByMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(
    () => ({ from: addDays(today, -RANK_WINDOW_DAYS), to: today }),
    [today]
  );

  /**
   * Load team-wide rank data for the rolling 30-day window.
   * @param {{ silent?: boolean }} [opts]
   */
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({
          memberId: "all",
          from: range.from,
          to: range.to,
          taskLimit: "1",
          taskOffset: "0",
          includeAnalytics: "true",
        });
        const res = await fetch(`/api/history?${q}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
        setByMember(json.analytics?.byMember || []);
      } catch (err) {
        setError(err?.message || "Could not load ranks.");
        if (!silent) setByMember(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [range.from, range.to]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load({ silent: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const ranked = rankTopPerformers(byMember || []);
  const showSkeleton = loading && byMember === null;

  return (
    <div className="space-y-3">
      <p className="meta flex items-center gap-1.5 px-0.5">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success-fg" aria-hidden="true" />
        Live 30-day rank
        {loading && byMember && <span className="text-ink-400">· updating…</span>}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <RankSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <div className="panel">
              <EmptyState
                icon="alert-circle"
                tone="danger"
                title="Could not load ranks"
                description={error}
                action={{ label: "Try again", onClick: () => load(), icon: "refresh" }}
              />
            </div>
          </motion.div>
        ) : ranked.length > 0 ? (
          <motion.div
            key="data"
            className="space-y-3"
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tBase}
          >
            <LeaderboardPodium byMember={byMember} />
            <RankOverallList byMember={byMember} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <div className="panel">
              <EmptyState
                icon="trophy"
                title="No ranks yet"
                description="Complete tasks in the last 30 days to appear on the board."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
