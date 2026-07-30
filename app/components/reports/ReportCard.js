"use client";

import Avatar from "../Avatar";
import Icon from "../ui/Icon";
import { StatusBadge } from "../ui/Badge";

/**
 * "YYYY-MM-DD" -> "Jul 21", timezone-safe.
 * @param {string} iso
 */
function shortDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString([], { day: "numeric", month: "short" });
}

/**
 * Format a week range label for cards.
 * @param {string} weekStart
 * @param {string} weekEnd
 * @returns {string}
 */
export function formatWeekRange(weekStart, weekEnd) {
  return `${shortDate(weekStart)} – ${shortDate(weekEnd)}`;
}

const ENERGY_TONES = {
  high: "badge-success",
  medium: "badge-brand",
  low: "badge-warning",
  "needs-energy": "badge-danger",
};

const CHECKIN_TONES = {
  excellent: "badge-success",
  good: "badge-brand",
  fair: "badge-warning",
  "needs-improvement": "badge-danger",
};

/**
 * Clickable card summarizing one weekly report.
 * @param {{ report: object, onSelect: (report: object) => void }} props
 */
export default function ReportCard({ report, onSelect }) {
  const memberCount = report.members?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(report)}
      className="card group flex h-full flex-col p-4 text-left transition-colors duration-fast hover:border-brand-300 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      aria-label={`View weekly report for ${formatWeekRange(report.weekStart, report.weekEnd)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">
            {formatWeekRange(report.weekStart, report.weekEnd)}
          </p>
          <p className="meta mt-0.5 flex items-center gap-1">
            <Icon name="calendar" size={11} />
            Weekly report
          </p>
        </div>
        <Icon
          name="chevron-right"
          size={16}
          className="shrink-0 text-ink-400 transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-brand-600"
        />
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-600">
        {report.teamSummary || report.summary || "Team weekly summary"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="badge badge-neutral tabular-nums">
          <Icon name="users" size={11} />
          {memberCount} members
        </span>
        {report.generatedAt && (
          <span className="meta tabular-nums">
            Generated {shortDate(new Date(report.generatedAt).toISOString().slice(0, 10))}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Energy level badge for a member section.
 * @param {{ level: string }} props
 */
export function EnergyBadge({ level }) {
  const tone = ENERGY_TONES[level] || "badge-neutral";
  const label =
    level === "needs-energy"
      ? "Needs energy"
      : level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={`badge ${tone}`} aria-label={`Energy level: ${label}`}>
      {label}
    </span>
  );
}

/**
 * Check-in punctuality badge.
 * @param {{ status: string, days: number, expected: number }} props
 */
export function CheckInBadge({ status, days, expected }) {
  const tone = CHECKIN_TONES[status] || "badge-neutral";
  const label = status.replace(/-/g, " ");
  return (
    <span className={`badge ${tone}`} title={`${days}/${expected} weekdays checked in`}>
      Check-in: {label}
    </span>
  );
}

/**
 * Full per-member section inside report detail.
 * @param {{ member: object }} props
 */
export function MemberReportSection({ member }) {
  const hasWarning = Boolean(member.warning && member.warning !== "null");
  const borderClass = hasWarning
    ? "border-2 border-orange-400 bg-gradient-to-br from-orange-50/60 to-surface"
    : "border border-line bg-surface";

  return (
    <article
      className={`rounded-xl p-4 ${borderClass}`}
      aria-labelledby={`member-report-${member.memberId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            member={{
              id: member.memberId,
              name: member.name,
              color: member.color,
              initials: member.initials,
            }}
            size="md"
            ring={false}
          />
          <div className="min-w-0">
            <h4 id={`member-report-${member.memberId}`} className="text-[13px] font-semibold text-ink">
              {member.name}
            </h4>
            <p className="meta mt-0.5 tabular-nums">
              {member.tasksCount} tasks · {member.workingHoursLabel} logged · {member.completionRate}%
              done
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <EnergyBadge level={member.energyLevel} />
          <CheckInBadge
            status={member.checkInStatus}
            days={member.checkInDays}
            expected={member.checkInExpectedDays}
          />
        </div>
      </div>

      {hasWarning && (
        <div
          className="mt-3 flex gap-2 rounded-lg border border-orange-300 bg-orange-100/80 px-3 py-2.5"
          role="alert"
        >
          <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0 text-orange-700" />
          <p className="text-xs font-medium leading-relaxed text-orange-900">{member.warning}</p>
        </div>
      )}

      {member.strengths?.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-success-fg">Strengths</p>
          <ul className="mt-1.5 space-y-1">
            {member.strengths.map((line) => (
              <li key={line} className="flex gap-2 text-xs leading-relaxed text-ink-700">
                <Icon name="check-circle" size={13} className="mt-0.5 shrink-0 text-success-fg" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {member.improvements?.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-warning-fg">Improve</p>
          <ul className="mt-1.5 space-y-1">
            {member.improvements.map((line) => (
              <li key={line} className="flex gap-2 text-xs leading-relaxed text-ink-700">
                <Icon name="arrow-right" size={13} className="mt-0.5 shrink-0 text-warning-fg" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {member.taskTitles?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Tasks for ${member.name}`}>
          {member.taskTitles.slice(0, 6).map((title) => (
            <li key={title} className="badge badge-neutral max-w-[200px] truncate" title={title}>
              {title}
            </li>
          ))}
          {member.taskTitles.length > 6 && (
            <li className="badge badge-neutral">+{member.taskTitles.length - 6} more</li>
          )}
        </ul>
      )}

      <p className="mt-3 text-sm leading-relaxed text-ink-700">{member.feedback}</p>
      <p className="mt-2 text-sm font-medium text-brand-700">{member.motivation}</p>
    </article>
  );
}

export { StatusBadge };
