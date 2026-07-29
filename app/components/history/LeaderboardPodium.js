"use client";

import { motion, useReducedMotion } from "framer-motion";
import Avatar from "../Avatar";
import { isBossMember } from "@/lib/members";
import { riseItem, staggerParent, tBase } from "@/lib/motion";

/** @type {Record<number, { label: string, ring: string, surface: string, badge: string, text: string, glow: string }>} */
const MEDAL_STYLES = {
  1: {
    label: "Gold",
    ring: "from-amber-300 via-yellow-200 to-amber-500",
    surface: "from-amber-50/90 via-yellow-50/80 to-amber-100/70",
    badge: "bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]",
    text: "text-amber-800",
    glow: "shadow-[0_0_32px_rgba(251,191,36,0.35)]",
  },
  2: {
    label: "Silver",
    ring: "from-slate-200 via-white to-slate-400",
    surface: "from-slate-50/90 via-white to-slate-100/80",
    badge: "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-400 text-slate-800 shadow-[0_0_12px_rgba(148,163,184,0.45)]",
    text: "text-slate-700",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.25)]",
  },
  3: {
    label: "Bronze",
    ring: "from-orange-300 via-amber-200 to-orange-600",
    surface: "from-orange-50/90 via-amber-50/70 to-orange-100/80",
    badge: "bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-orange-950 shadow-[0_0_12px_rgba(234,88,12,0.35)]",
    text: "text-orange-800",
    glow: "shadow-[0_0_18px_rgba(234,88,12,0.22)]",
  },
};

/**
 * Sort members into an overall ranking for the selected range.
 * @param {Array<{ member: object, completionRate: number, completed: number, total: number, totalDurationMs?: number|null }>} byMember
 * @param {number} [limit]
 * @returns {Array<{ rank: number, member: object, completionRate: number, completed: number, total: number, totalDurationMs?: number|null, totalDurationLabel?: string|null }>}
 */
export function rankTopPerformers(byMember, limit = 3) {
  return [...(byMember || [])]
    .filter((row) => row.total > 0 && !isBossMember(row.member))
    .sort(
      (a, b) =>
        b.completed - a.completed ||
        (b.totalDurationMs ?? 0) - (a.totalDurationMs ?? 0) ||
        b.completionRate - a.completionRate ||
        b.total - a.total
    )
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Reorder ranked rows into podium layout: 2nd · 1st · 3rd.
 * @param {ReturnType<typeof rankTopPerformers>} ranked
 * @returns {[object|null, object|null, object|null]}
 */
function podiumSlots(ranked) {
  if (ranked.length >= 3) return [ranked[1], ranked[0], ranked[2]];
  if (ranked.length === 2) return [ranked[1], ranked[0], null];
  if (ranked.length === 1) return [null, ranked[0], null];
  return [null, null, null];
}

/**
 * Animated rank badge (1 = gold, 2 = silver, 3 = bronze).
 * @param {{ rank: number, reduced: boolean }} props
 */
function RankBadge({ rank, reduced }) {
  const style = MEDAL_STYLES[rank];
  if (!style) return null;

  return (
    <motion.span
      aria-label={`Rank ${rank}, ${style.label}`}
      className={`relative grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold tabular-nums ${style.badge}`}
      initial={{ scale: reduced ? 1 : 0.6, opacity: 0, rotate: reduced ? 0 : -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ ...tBase, delay: rank === 1 ? 0.12 : rank === 2 ? 0.06 : 0.18 }}
    >
      {rank}
      {rank === 1 && !reduced && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/70 via-transparent to-transparent"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.span>
  );
}

/**
 * Single podium card with animated medal border.
 * @param {{ row: object, reduced: boolean, delay?: number }} props
 */
function PodiumCard({ row, reduced, delay = 0 }) {
  const style = MEDAL_STYLES[row.rank];
  const isFirst = row.rank === 1;

  return (
    <motion.li
      {...riseItem(reduced)}
      transition={{ ...tBase, delay }}
      className={`mx-auto flex min-w-0 w-full flex-col items-center ${
        isFirst ? "-translate-y-5 sm:-translate-y-7" : ""
      }`}
    >
      <div
        className={`relative w-full ${isFirst ? "max-w-[184px] scale-[1.04] sm:scale-[1.06]" : "max-w-[168px]"} ${style.glow}`}
      >
        <div className="relative overflow-hidden rounded-2xl p-[2px]">
          {!reduced && (
            <motion.div
              aria-hidden="true"
              className={`absolute -inset-[120%] bg-gradient-to-r ${style.ring}`}
              animate={{ rotate: 360 }}
              transition={{ duration: row.rank === 1 ? 4 : 6, repeat: Infinity, ease: "linear" }}
            />
          )}
          <div
            className={`relative overflow-hidden rounded-[14px] border border-white/70 bg-gradient-to-b ${style.surface} px-3 py-4 text-center backdrop-blur-sm`}
          >
            {!reduced && row.rank === 1 && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-amber-200/40 to-transparent"
                animate={{ opacity: [0.35, 0.75, 0.35] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <div className="relative flex flex-col items-center gap-2.5">
              <RankBadge rank={row.rank} reduced={reduced} />
              <Avatar member={row.member} size="lg" ring={false} className="ring-2 ring-white/80" />
              <div className="min-w-0 w-full">
                <p className="truncate text-[13px] font-semibold text-ink" title={row.member.name}>
                  {row.member.name}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-left">
                  <div className="rounded-lg border border-white/60 bg-white/50 px-2 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                      Done
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${style.text}`}>{row.completed}</p>
                  </div>
                  <div className="rounded-lg border border-white/60 bg-white/50 px-2 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                      Hours
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${style.text}`}>
                      {row.totalDurationLabel || "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-1.5 text-2xs tabular-nums text-ink-500">
                  {row.completionRate}% · {row.completed}/{row.total} tasks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * Top-three leaderboard — three cards only, 2nd · 1st · 3rd.
 * @param {{ byMember: Array<object> }} props
 */
export default function LeaderboardPodium({ byMember }) {
  const reduced = useReducedMotion();
  const ranked = rankTopPerformers(byMember);
  const slots = podiumSlots(ranked);

  if (!ranked.length) return null;

  return (
    <section className="card overflow-hidden bg-gradient-to-b from-surface to-surface-sunken/40 p-4 sm:p-5">
      <motion.ol
        {...staggerParent(reduced, 0.08)}
        className="grid grid-cols-3 items-end gap-2 sm:gap-4"
        aria-label="Top performers"
      >
        {slots.map((row, index) =>
          row ? (
            <PodiumCard key={row.member.id} row={row} reduced={reduced} delay={index * 0.06} />
          ) : (
            <li key={`empty-${index}`} aria-hidden="true" />
          )
        )}
      </motion.ol>
    </section>
  );
}
