"use client";

import { motion, useReducedMotion } from "framer-motion";
import Icon from "./ui/Icon";
import Progress from "./ui/Progress";
import AnimatedNumber from "./ui/AnimatedNumber";
import { riseItem } from "@/lib/motion";

const ICON_TONES = {
  brand: "bg-info-bg text-info-fg",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  neutral: "bg-surface-sunken text-ink-500",
};

/**
 * KPI tile for the overview row.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {number} [props.count] - animates when provided
 * @param {string} [props.suffix] - appended to `count` (e.g. "%")
 * @param {React.ReactNode} [props.value] - static value, used when `count` is absent
 * @param {React.ReactNode} [props.sub] - small text under the value
 * @param {string} props.icon
 * @param {keyof typeof ICON_TONES} [props.tone]
 * @param {number} [props.progress] - 0-100; renders a meter when provided
 */
export default function StatCard({
  label,
  count,
  suffix = "",
  value,
  sub,
  icon,
  tone = "neutral",
  progress,
  progressTone,
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div {...riseItem(reduced)} className="card p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Wraps rather than truncates: grid rows stretch together, so a
            two-line label on a narrow screen still leaves the row aligned. */}
        <span className="eyebrow leading-tight">{label}</span>
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            ICON_TONES[tone] || ICON_TONES.neutral
          }`}
        >
          <Icon name={icon} size={15} />
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-display-xs font-semibold tabular-nums text-ink">
          {typeof count === "number" ? (
            <AnimatedNumber value={count} suffix={suffix} />
          ) : (
            value ?? "—"
          )}
        </span>
        {sub && <span className="truncate text-[13px] text-ink-500">{sub}</span>}
      </div>

      {typeof progress === "number" && (
        <Progress
          value={progress}
          tone={progressTone || "brand"}
          className="mt-3"
          label={`${label}: ${Math.round(progress)}%`}
        />
      )}
    </motion.div>
  );
}
