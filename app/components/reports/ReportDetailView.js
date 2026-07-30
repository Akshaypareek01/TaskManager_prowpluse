"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Avatar from "../Avatar";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { MemberReportSection, formatWeekRange } from "./ReportCard";
import { riseItem, staggerParent, tBase } from "@/lib/motion";

const ALL_KEY = "all";

/**
 * Horizontal member picker for filtering report sections.
 * @param {{ members: object[], value: string, onChange: (id: string) => void }} props
 */
function ReportMemberFilter({ members, value, onChange }) {
  const reduced = useReducedMotion();

  const tabs = useMemo(
    () => [{ key: ALL_KEY, label: "All team", member: null }, ...members.map((m) => ({ key: m.memberId, label: m.name, member: m }))],
    [members]
  );

  return (
    <div
      role="tablist"
      aria-label="Filter report by team member"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <motion.button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            {...riseItem(reduced)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? "border-brand-300 bg-brand-50 text-brand-800 shadow-xs"
                : "border-line bg-surface text-ink-600 hover:border-brand-200 hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {tab.member ? (
              <Avatar
                member={{
                  id: tab.member.memberId,
                  name: tab.member.name,
                  color: tab.member.color,
                  initials: tab.member.initials,
                }}
                size="xs"
                ring={false}
              />
            ) : (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-600">
                <Icon name="users" size={13} />
              </span>
            )}
            <span className="max-w-[9rem] truncate">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Full-page weekly report detail with member filter at the top.
 * @param {{ report: object, onBack: () => void }} props
 */
export default function ReportDetailView({ report, onBack }) {
  const reduced = useReducedMotion();
  const [memberFilter, setMemberFilter] = useState(ALL_KEY);
  const members = report.members || [];

  const visibleMembers = useMemo(() => {
    if (memberFilter === ALL_KEY) return members;
    return members.filter((m) => m.memberId === memberFilter);
  }, [memberFilter, members]);

  const showTeamBlocks = memberFilter === ALL_KEY;

  return (
    <motion.div
      key={report.id}
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -8 }}
      transition={tBase}
      className="space-y-3"
    >
      <div className="panel px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              iconLeft="arrow-left"
              onClick={onBack}
              className="-ml-2"
            >
              All reports
            </Button>
            <h2 className="mt-1 text-display-xs font-semibold text-ink">
              {formatWeekRange(report.weekStart, report.weekEnd)}
            </h2>
            <p className="meta mt-0.5 flex items-center gap-1">
              <Icon name="file-text" size={11} />
              Weekly team report
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <p className="eyebrow mb-2">Team member</p>
          <ReportMemberFilter
            members={members}
            value={memberFilter}
            onChange={setMemberFilter}
          />
        </div>
      </div>

      {showTeamBlocks && (
        <>
          <section
            className="panel rounded-xl border-brand-200 bg-brand-50/50 p-4 sm:p-5"
            aria-label="Team summary"
          >
            <h3 className="text-[13px] font-semibold text-brand-800">Team summary</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{report.summary}</p>
            {report.teamSummary && report.teamSummary !== report.summary && (
              <p className="mt-2 text-sm font-medium text-brand-700">{report.teamSummary}</p>
            )}
          </section>

          {report.ceoNote && (
            <section className="panel p-4 sm:p-5" aria-label="CEO note">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Icon name="users" size={14} className="text-brand-600" />
                CEO / manager note
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{report.ceoNote}</p>
            </section>
          )}
        </>
      )}

      <motion.div {...staggerParent(reduced)} className="space-y-3">
        {visibleMembers.length === 0 ? (
          <div className="panel p-6 text-center">
            <p className="text-sm text-ink-600">No report data for this member this week.</p>
          </div>
        ) : (
          visibleMembers.map((member) => (
            <motion.div key={member.memberId} {...riseItem(reduced)}>
              <MemberReportSection member={member} />
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
