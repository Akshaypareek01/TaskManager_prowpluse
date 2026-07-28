"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";

/**
 * "YYYY-MM-DD" -> { day: "12", weekday: "Mon" } without timezone drift.
 * @param {string} iso
 */
function parts(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    day: String(d),
    weekday: date.toLocaleDateString([], { weekday: "short" }).slice(0, 2),
  };
}

/**
 * Daily completed-vs-total columns.
 *
 * Columns (not rows) because the x axis is time. The track behind each bar is
 * the day's total, the filled part is what got done, so "how much was planned"
 * and "how much landed" read in one glance.
 *
 * @param {{ trend: Array<{ date: string, completed: number, total: number }> }} props
 */
export default function DailyTrendChart({ trend }) {
  const reduced = useReducedMotion();
  if (!trend?.length) return null;

  const max = Math.max(...trend.map((t) => t.total), 1);
  const best = trend.reduce((a, b) => (b.completed > a.completed ? b : a), trend[0]);

  return (
    <div className="card flex h-full flex-col p-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">Daily trend</h3>
        <span className="text-2xs text-ink-400">{trend.length} days</span>
      </div>
      <p className="mb-4 text-xs text-ink-500">
        Best day: <span className="font-semibold text-ink-700">{best.completed}</span> completed
      </p>

      <div className="scroll-slim -mx-1 flex-1 overflow-x-auto px-1">
        <ul
          className="flex h-[124px] min-w-full items-end justify-start gap-2"
          style={{ minWidth: `${trend.length * 26}px` }}
        >
          {trend.map((t, i) => {
            const totalPct = (t.total / max) * 100;
            const donePct = t.total > 0 ? (t.completed / max) * 100 : 0;
            const p = parts(t.date);

            return (
              <li
                key={t.date}
                className="group relative flex h-full min-w-[18px] max-w-[34px] flex-1 flex-col justify-end"
                title={`${t.date}: ${t.completed} of ${t.total} completed`}
              >
                <div className="relative h-[88px] w-full">
                  {/* planned */}
                  <motion.span
                    className="absolute bottom-0 left-0 w-full rounded-[3px] bg-surface-sunken"
                    initial={{ height: reduced ? `${totalPct}%` : 0 }}
                    animate={{ height: `${Math.max(totalPct, t.total > 0 ? 4 : 2)}%` }}
                    transition={{ duration: reduced ? 0 : 0.4, ease: EASE, delay: reduced ? 0 : i * 0.02 }}
                  />
                  {/* completed */}
                  <motion.span
                    className="absolute bottom-0 left-0 w-full rounded-[3px] bg-brand-600 transition-colors duration-fast group-hover:bg-brand-700"
                    initial={{ height: reduced ? `${donePct}%` : 0 }}
                    animate={{ height: `${donePct}%` }}
                    transition={{
                      duration: reduced ? 0 : 0.5,
                      ease: EASE,
                      delay: reduced ? 0 : 0.1 + i * 0.02,
                    }}
                  />
                </div>
                <span className="mt-2 text-center text-[9px] leading-tight tabular-nums text-ink-400">
                  {p.day}
                  <span className="block text-[8px] uppercase tracking-wide">{p.weekday}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-line-soft pt-3 text-2xs text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-brand-600" aria-hidden="true" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-surface-sunken ring-1 ring-line" aria-hidden="true" />
          Planned
        </span>
      </div>
    </div>
  );
}
