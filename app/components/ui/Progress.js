"use client";

import { motion, useReducedMotion } from "framer-motion";
import { tSlow } from "@/lib/motion";

const TONES = {
  brand: "bg-brand-600",
  success: "bg-success-solid",
  warning: "bg-warning-solid",
  danger: "bg-danger-solid",
  ink: "bg-ink-600",
};

/**
 * Horizontal meter. Width animates from 0 on mount and eases between values,
 * so a poll that changes the number reads as movement rather than a jump.
 *
 * @param {object} props
 * @param {number} props.value - 0-100
 * @param {keyof typeof TONES} [props.tone]
 * @param {"sm"|"md"} [props.size]
 * @param {string} [props.color] - explicit CSS colour, overrides tone
 * @param {string} [props.label] - accessible name
 */
export default function Progress({
  value,
  tone = "brand",
  size = "sm",
  color,
  label,
  className = "",
}) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-surface-sunken ${
        size === "md" ? "h-2" : "h-1.5"
      } ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={`h-full rounded-full ${color ? "" : TONES[tone] || TONES.brand}`}
        style={color ? { backgroundColor: color } : undefined}
        initial={{ width: reduced ? `${pct}%` : 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduced ? { duration: 0 } : tSlow}
      />
    </div>
  );
}
