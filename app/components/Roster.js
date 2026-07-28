"use client";

import { motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Icon from "./ui/Icon";
import Badge from "./ui/Badge";
import { formatDurationMs } from "@/lib/analytics";
import { isPastLowEffortThreshold } from "@/lib/dates";
import { isBossMember } from "@/lib/members";
import {
  formatLowEffortAlertText,
  inactiveMemberNames,
  isInactiveToday,
} from "@/lib/rosterStats";
import { riseItem, staggerParent, tFast } from "@/lib/motion";

/**
 * Compact header alert for members doing nothing today.
 * Hidden before 3 PM local so morning check-ins aren't flagged as low effort.
 * @param {{ members: object[], now: number }} props
 */
export function LowEffortAlert({ members, now }) {
  if (!isPastLowEffortThreshold(now)) return null;

  const names = inactiveMemberNames(members);
  const displayNames = formatLowEffortAlertText(names);
  if (!displayNames) return null;

  const label = `Very low effort today: ${names.join(", ")}`;

  return (
    <span role="status" aria-live="polite" aria-label={label} className="inline-flex max-w-full">
      <Badge tone="danger" className="!px-1.5 !py-0 text-[10px] font-medium sm:text-2xs" aria-hidden="true">
        Very low effort today: {displayNames}
      </Badge>
    </span>
  );
}

/**
 * Build badge configs for roster stat chips (pending, done, working hours).
 * Boss members show a single "Boss" badge instead of activity stats.
 * @param {object} m
 * @param {{ showLowEffortWarning: boolean }} opts
 * @returns {{ badges: { label: string, tone: string }[], ariaSummary: string, inactive: boolean }}
 */
function rosterStatBadges(m, { showLowEffortWarning }) {
  if (isBossMember(m)) {
    return {
      badges: [{ label: "Boss", tone: "neutral" }],
      ariaSummary: "Boss",
      inactive: false,
    };
  }

  const inactive = isInactiveToday(m);
  const hours = formatDurationMs(m.workingHoursMs) || "0m";
  const pendingCount = m.pendingToday ?? 0;
  const pendingLabel = `${pendingCount} pending`;
  const doneLabel = `${m.completedToday} done`;
  const warnInactive = inactive && showLowEffortWarning;

  const pendingTone = pendingCount > 0 ? "warning" : "neutral";
  const doneTone = warnInactive ? "danger" : m.completedToday > 0 ? "success" : "neutral";
  const hoursTone = warnInactive ? "danger" : "neutral";

  return {
    badges: [
      { label: pendingLabel, tone: pendingTone },
      { label: doneLabel, tone: doneTone },
      { label: hours, tone: hoursTone },
    ],
    ariaSummary: `${pendingLabel}, ${doneLabel}, ${hours} working`,
    inactive: warnInactive,
  };
}

/**
 * Team check-in grid. Doubles as the member filter for Today, Alerts and History.
 * Auto-fill columns keep rows balanced at 11+ members; each chip stacks name + stat badges.
 *
 * @param {{ members: object[], filterId: string, onFilter: (id: string) => void, now: number }} props
 */
export default function Roster({ members, filterId, onFilter, now }) {
  const reduced = useReducedMotion();
  const showLowEffortWarning = isPastLowEffortThreshold(now);

  return (
    <motion.div
      {...staggerParent(reduced, 0.02)}
      className="grid grid-cols-[repeat(auto-fill,minmax(9.75rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(10.75rem,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))]"
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
        const stats = rosterStatBadges(m, { showLowEffortWarning });
        return (
          <RosterChip
            key={m.id}
            reduced={reduced}
            selected={filterId === m.id}
            onClick={() => onFilter(m.id)}
            label={m.name}
            statBadges={stats.badges}
            badge={m.badgeCount > 0 ? m.badgeCount : null}
            ariaLabel={`${m.name}, ${stats.ariaSummary}${stats.inactive ? ", very low effort today" : ""}`}
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
  statBadges,
  leading,
  badge,
  ariaLabel,
}) {
  const borderClass = selected
    ? "border-brand-600 bg-brand-50 shadow-xs"
    : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover";

  return (
    <motion.button
      {...riseItem(reduced)}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel || label}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={tFast}
      className={`relative flex w-full min-w-0 items-start gap-2 rounded-2xl border py-2 pl-1.5 pr-2 text-left transition-[background-color,border-color,box-shadow] duration-fast ease-smooth sm:pr-2.5 ${borderClass}`}
    >
      <span className="mt-0.5 shrink-0">{leading}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink sm:text-[13px]"
          title={label}
        >
          {label}
        </span>
        {statBadges ? (
          <span className="flex flex-wrap items-center gap-1" aria-hidden="true">
            {statBadges.map((chip) => (
              <Badge
                key={chip.label}
                tone={chip.tone}
                className="!px-1.5 !py-0 text-[10px] tabular-nums sm:text-2xs"
              >
                {chip.label}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="truncate text-2xs leading-snug text-ink-500" title={sub}>
            {sub}
          </span>
        )}
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
