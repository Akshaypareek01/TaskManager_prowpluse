"use client";

import { motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";
import Button from "./Button";
import { rise } from "@/lib/motion";

const TONES = {
  neutral: "bg-surface-sunken text-ink-500",
  success: "bg-success-bg text-success-fg",
  danger: "bg-danger-bg text-danger-fg",
  brand: "bg-info-bg text-info-fg",
};

/**
 * Empty / zero-result state. Always says what happened AND what to do next —
 * an empty state without an action is a dead end.
 *
 * @param {object} props
 * @param {string} [props.icon] - Icon name
 * @param {"neutral"|"success"|"danger"|"brand"} [props.tone]
 * @param {string} props.title
 * @param {React.ReactNode} [props.description]
 * @param {{ label: string, onClick: () => void, icon?: string, variant?: string }} [props.action]
 * @param {"sm"|"md"} [props.size]
 */
export default function EmptyState({
  icon = "inbox",
  tone = "neutral",
  title,
  description,
  action,
  size = "md",
  className = "",
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      {...rise(reduced, 6)}
      className={`flex flex-col items-center justify-center px-6 text-center ${
        size === "sm" ? "py-10" : "py-14 sm:py-16"
      } ${className}`}
    >
      <span
        className={`mb-4 grid place-items-center rounded-full ${TONES[tone] || TONES.neutral} ${
          size === "sm" ? "h-10 w-10" : "h-12 w-12"
        }`}
      >
        <Icon name={icon} size={size === "sm" ? 18 : 22} />
      </span>
      <h3 className={size === "sm" ? "text-sm font-semibold" : "text-base font-semibold"}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>
      )}
      {action && (
        <Button
          variant={action.variant || "secondary"}
          size="sm"
          iconLeft={action.icon}
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
