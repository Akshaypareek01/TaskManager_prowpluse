"use client";

import { motion, useReducedMotion } from "framer-motion";
import AnimatedNumber from "../ui/AnimatedNumber";
import { EASE } from "@/lib/motion";

const SEGMENTS = [
  { key: "completed", name: "Done", color: "#12B76A" },
  { key: "pending", name: "Open", color: "#4F46E5" },
  { key: "overdue", name: "Overdue", color: "#F04438" },
  { key: "backlog", name: "Backlog", color: "#F79009" },
];

const R = 54;
const STROKE = 16;
const C = 2 * Math.PI * R;

/**
 * Completion breakdown as an SVG donut. SVG (rather than a conic-gradient)
 * so each arc can animate in and expose its own accessible label.
 *
 * @param {{ summary: { completed: number, pending: number, overdue: number, backlog?: number, completionRate: number } }} props
 */
export default function CompletionDonut({ summary }) {
  const reduced = useReducedMotion();

  const values = {
    completed: summary.completed,
    pending: Math.max(0, summary.pending - summary.overdue - (summary.backlog ?? 0)),
    overdue: summary.overdue,
    backlog: summary.backlog ?? 0,
  };
  const data = SEGMENTS.map((s) => ({ ...s, value: values[s.key] })).filter((s) => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;

  return (
    <div className="card flex h-full flex-col p-4">
      <h3 className="eyebrow mb-4">Completion</h3>

      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <p className="text-[13px] text-ink-400">No tasks in this range</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative h-[132px] w-[132px] shrink-0">
            <svg
              viewBox="0 0 132 132"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`${summary.completionRate}% of ${total} tasks completed`}
            >
              <circle cx="66" cy="66" r={R} fill="none" stroke="#F2F4F7" strokeWidth={STROKE} />
              {data.map((s, i) => {
                const len = (s.value / total) * C;
                const dashOffset = -offset;
                offset += len;
                return (
                  <motion.circle
                    key={s.key}
                    cx="66"
                    cy="66"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={STROKE}
                    strokeLinecap={data.length > 1 ? "butt" : "round"}
                    strokeDashoffset={dashOffset}
                    initial={{ strokeDasharray: reduced ? `${len} ${C - len}` : `0 ${C}` }}
                    animate={{ strokeDasharray: `${len} ${C - len}` }}
                    transition={{ duration: reduced ? 0 : 0.6, ease: EASE, delay: reduced ? 0 : i * 0.08 }}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-ink">
                <AnimatedNumber value={summary.completionRate} suffix="%" />
              </span>
              <span className="text-2xs text-ink-500">complete</span>
            </div>
          </div>

          <ul className="w-full min-w-0 space-y-2">
            {data.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <span className="text-ink-600">{s.name}</span>
                <span className="ml-auto font-semibold tabular-nums text-ink">{s.value}</span>
                <span className="w-10 shrink-0 text-right text-2xs tabular-nums text-ink-400">
                  {Math.round((s.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
