"use client";

import { motion, useReducedMotion } from "framer-motion";
import Avatar from "../Avatar";
import Icon from "../ui/Icon";
import { riseItem, staggerParent } from "@/lib/motion";
import { rankTopPerformers } from "./LeaderboardPodium";

const RANK_BADGE = {
  1: "bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950",
  2: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800",
  3: "bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950",
};

/**
 * Full overall rank table — every team member with completed tasks and working hours.
 * @param {{ byMember: Array<object> }} props
 */
export default function RankOverallList({ byMember }) {
  const reduced = useReducedMotion();
  const ranked = rankTopPerformers(byMember, Infinity);

  if (!ranked.length) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Icon name="trophy" size={15} className="text-amber-600" />
          <h3 className="section-title">Overall rank</h3>
        </div>
        <span className="badge badge-neutral tabular-nums">{ranked.length} people</span>
      </div>

      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-hover">
              <th scope="col" className="px-5 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                Rank
              </th>
              <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                Person
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                Completed
              </th>
              <th scope="col" className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                Working hours
              </th>
              <th scope="col" className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                Rate
              </th>
            </tr>
          </thead>
          <motion.tbody {...staggerParent(reduced, 0.025)}>
            {ranked.map((row) => (
              <motion.tr
                key={row.member.id}
                {...riseItem(reduced)}
                className="border-b border-line-soft transition-colors duration-fast last:border-0 hover:bg-surface-hover"
              >
                <td className="whitespace-nowrap px-5 py-3">
                  <RankChip rank={row.rank} />
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="flex items-center gap-2">
                    <Avatar member={row.member} size="sm" ring={false} />
                    <span className="text-[13px] font-medium text-ink">{row.member.name}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold tabular-nums text-ink">
                  {row.completed}
                  <span className="ml-1 font-normal text-ink-500">/ {row.total}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold tabular-nums text-ink">
                  {row.totalDurationLabel || "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-[13px] tabular-nums text-ink-600">
                  {row.completionRate}%
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      <motion.ul {...staggerParent(reduced, 0.025)} className="divide-y divide-line-soft md:hidden">
        {ranked.map((row) => (
          <motion.li key={row.member.id} {...riseItem(reduced)} className="flex items-center gap-3 px-4 py-3">
            <RankChip rank={row.rank} />
            <Avatar member={row.member} size="sm" ring={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{row.member.name}</p>
              <p className="meta mt-0.5 tabular-nums">
                {row.completed}/{row.total} done · {row.totalDurationLabel || "0h"} · {row.completionRate}%
              </p>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

/**
 * Rank number chip with medal styling for top three.
 * @param {{ rank: number }} props
 */
function RankChip({ rank }) {
  const medal = RANK_BADGE[rank];

  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums ${
        medal || "bg-surface-sunken text-ink-600"
      }`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}
