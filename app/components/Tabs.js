"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "./ui/Icon";
import { spring } from "@/lib/motion";

/**
 * Segmented control. The active pill is a single shared element that slides
 * between tabs (layoutId), which reads as one control changing state rather
 * than two things blinking.
 *
 * Implements the WAI-ARIA tabs keyboard contract: Left/Right move, Home/End
 * jump, and only the selected tab is in the tab order.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, icon?: string, count?: number, tone?: "danger"|"neutral"}>} props.tabs
 * @param {string} props.value
 * @param {(key: string) => void} props.onChange
 */
export default function Tabs({ tabs, value, onChange, className = "" }) {
  const reduced = useReducedMotion();
  const refs = useRef({});

  function onKeyDown(e) {
    const i = tabs.findIndex((t) => t.key === value);
    if (i < 0) return;
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    e.preventDefault();
    onChange(next.key);
    refs.current[next.key]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Wall sections"
      onKeyDown={onKeyDown}
      className={`inline-flex items-center gap-1 rounded-xl border border-line bg-surface-sunken p-1 ${className}`}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[t.key] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={active}
            aria-controls={`panel-${t.key}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={`relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-fast ease-smooth ${
              active ? "text-ink" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg border border-line bg-surface shadow-xs"
                transition={reduced ? { duration: 0 } : spring}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {t.icon && <Icon name={t.icon} size={15} />}
              {t.label}
              {t.count > 0 && (
                <span
                  className={`count-chip ${
                    t.tone === "danger"
                      ? "bg-danger-solid text-white"
                      : active
                      ? "bg-brand-600 text-white"
                      : "bg-line text-ink-600"
                  }`}
                >
                  {t.count > 99 ? "99+" : t.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
