"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Avatar from "../Avatar";
import Button from "../ui/Button";
import Progress from "../ui/Progress";
import { deepen } from "@/lib/colors";
import { riseItem, staggerParent } from "@/lib/motion";
import { rankTopPerformers } from "./LeaderboardPodium";

const COLLAPSED_ROWS = 6;

/**
 * Per-person completion. One row per member: identity, a meter, and the raw
 * counts — sorted by completion rate so the list has an order worth reading.
 *
 * @param {{ byMember: Array<{ member: object, completionRate: number, completed: number, total: number, overdue: number, avgDurationLabel?: string }> }} props
 */
export default function MemberBars({ byMember }) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  if (!byMember?.length) return null;

  const rows = [...byMember].sort(
    (a, b) => b.completionRate - a.completionRate || b.total - a.total
  );
  const rankByMemberId = Object.fromEntries(
    rankTopPerformers(byMember).map((row) => [row.member.id, row.rank])
  );
  const rankBadgeClass = {
    1: "bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950",
    2: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800",
    3: "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950",
  };
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const hidden = rows.length - visible.length;

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">Per person</h3>
        <span className="text-2xs text-ink-400">{rows.length} with activity</span>
      </div>

      <motion.ul {...staggerParent(reduced, 0.03)} className="space-y-3.5">
        {visible.map((row) => (
          <motion.li key={row.member.id} {...riseItem(reduced)} className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar member={row.member} size="sm" ring={false} />
              {rankByMemberId[row.member.id] && (
                <span
                  className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-extrabold tabular-nums ring-2 ring-white ${
                    rankBadgeClass[rankByMemberId[row.member.id]]
                  }`}
                  aria-label={`Rank ${rankByMemberId[row.member.id]}`}
                >
                  {rankByMemberId[row.member.id]}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-ink">{row.member.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-ink-500">
                  <span className="font-semibold text-ink">{row.completed}</span>/{row.total}
                  {row.overdue > 0 && (
                    <span className="ml-1.5 font-medium text-danger-fg">{row.overdue} late</span>
                  )}
                  {row.backlog > 0 && (
                    <span className="ml-1.5 font-medium text-warning-fg">{row.backlog} backlog</span>
                  )}
                </span>
              </div>
              <Progress
                value={row.completionRate}
                color={deepen(row.member.color, 0.18)}
                label={`${row.member.name}: ${row.completionRate}% complete`}
              />
            </div>

            <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-600">
              {row.completionRate}%
            </span>
          </motion.li>
        ))}
      </motion.ul>

      {(hidden > 0 || expanded) && (
        <div className="mt-4 border-t border-line-soft pt-3">
          <Button
            variant="link"
            iconRight={expanded ? "chevron-down" : "chevron-right"}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show fewer" : `Show ${hidden} more`}
          </Button>
        </div>
      )}
    </div>
  );
}
