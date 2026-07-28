"use client";

import { motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Icon from "./ui/Icon";
import { riseItem, staggerParent, tFast } from "@/lib/motion";

/**
 * Derive the one status line that matters for a member today.
 * @param {object} m
 * @returns {{ text: string, className: string }}
 */
function statusLine(m) {
  if (m.overdueCount > 0) {
    return {
      text: `${m.overdueCount} overdue`,
      className: "text-danger-fg",
    };
  }
  if (m.backlogCount > 0) {
    return {
      text: `${m.backlogCount} backlog`,
      className: "text-warning-fg",
    };
  }
  if (m.pendingToday > 0) {
    return {
      text: `${m.pendingToday} pending`,
      className: "text-ink-500",
    };
  }
  if (m.completedToday > 0) {
    return {
      text: `${m.completedToday} done`,
      className: "text-success-fg",
    };
  }
  return { text: "No tasks", className: "text-ink-400" };
}

/**
 * Team check-in grid. Doubles as the member filter for Today, Alerts and History.
 * Wraps into multiple rows — no horizontal scroll — so every name stays visible.
 *
 * @param {{ members: object[], filterId: string, onFilter: (id: string) => void }} props
 */
export default function Roster({ members, filterId, onFilter }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      {...staggerParent(reduced, 0.02)}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8"
      role="group"
      aria-label="Filter tasks by team member"
    >
      <RosterChip
        reduced={reduced}
        selected={filterId === "all"}
        onClick={() => onFilter("all")}
        label="All team"
        sub={`${members.length} people`}
        leading={
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-600 ring-2 ring-white">
            <Icon name="users" size={13} />
          </span>
        }
      />

      {members.map((m) => {
        const status = statusLine(m);
        return (
          <RosterChip
            key={m.id}
            reduced={reduced}
            selected={filterId === m.id}
            onClick={() => onFilter(m.id)}
            label={m.name}
            sub={status.text}
            subClassName={status.className}
            badge={m.badgeCount > 0 ? m.badgeCount : null}
            ariaLabel={`${m.name}, ${status.text}`}
            leading={<Avatar member={m} size="xs" ring={false} />}
          />
        );
      })}
    </motion.div>
  );
}

function RosterChip({
  reduced,
  selected,
  onClick,
  label,
  sub,
  subClassName = "text-ink-500",
  leading,
  badge,
  ariaLabel,
}) {
  return (
    <motion.button
      {...riseItem(reduced)}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel || label}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={tFast}
      className={`relative flex w-full min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-left transition-[background-color,border-color,box-shadow] duration-fast ease-smooth sm:pr-3 ${
        selected
          ? "border-brand-600 bg-brand-50 shadow-xs"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"
      }`}
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[12px] font-semibold text-ink sm:text-[13px]" title={label}>
          {label}
        </span>
        <span className={`truncate text-2xs ${subClassName}`} title={sub}>
          {sub}
        </span>
      </span>
      {badge != null && (
        <span
          className="count-chip absolute -right-1 -top-1 border-2 border-white bg-danger-solid text-white"
          aria-hidden="true"
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </motion.button>
  );
}
