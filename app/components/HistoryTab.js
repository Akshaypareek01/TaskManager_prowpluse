"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import EmptyState from "./ui/EmptyState";
import { StatusBadge } from "./ui/Badge";
import { Field, Select, TextInput } from "./ui/Field";
import Skeleton from "./ui/Skeleton";
import CompletionDonut from "./history/CompletionDonut";
import DailyTrendChart from "./history/DailyTrendChart";
import MemberBars from "./history/MemberBars";
import { addDays } from "@/lib/dates";
import { riseItem, staggerParent, tBase } from "@/lib/motion";

const QUICK_RANGES = [
  { key: "7", label: "7 days", days: 6 },
  { key: "14", label: "14 days", days: 13 },
  { key: "30", label: "30 days", days: 29 },
];

/**
 * "YYYY-MM-DD" -> "12 Aug", timezone-safe.
 * @param {string} iso
 */
function shortDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString([], { day: "numeric", month: "short" });
}

/**
 * Compact metric tile used above the charts.
 */
function Metric({ label, value, tone = "ink" }) {
  const toneClass =
    tone === "success" ? "text-success-fg" : tone === "danger" ? "text-danger-fg" : "text-ink";
  return (
    <div className="card px-3.5 py-3">
      <div className="eyebrow truncate">{label}</div>
      <div className={`mt-1.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card px-3.5 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-3 h-5 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-[212px] rounded-xl" />
        <Skeleton className="h-[212px] rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

/**
 * History & analytics for a date range.
 *
 * Owns its own fetch (the range is user-controlled), so it handles all four
 * states itself: skeleton on first load, quiet refresh on subsequent loads,
 * an error with retry, and an empty range.
 *
 * @param {{ team: object[], filterId: string, today: string, onFilterChange?: (id: string) => void, onViewTask?: (task: object) => void }} props
 */
export default function HistoryTab({ team, filterId, today, onFilterChange, onViewTask }) {
  const reduced = useReducedMotion();
  const [memberId, setMemberId] = useState(filterId);
  const [from, setFrom] = useState(() => addDays(today, -6));
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const rangeError = from > to ? "The start date must be on or before the end date." : "";

  /**
   * Fetch history — analytics on first page, tasks paginated.
   * @param {{ append?: boolean, offset?: number }} [opts]
   */
  const load = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      if (from > to) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const q = new URLSearchParams({
          memberId,
          from,
          to,
          taskLimit: "50",
          taskOffset: String(offset),
          includeAnalytics: append ? "false" : "true",
        });
        const res = await fetch(`/api/history?${q}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

        setData((prev) => {
          if (!append || !prev) return json;
          return {
            ...prev,
            tasks: [...prev.tasks, ...json.tasks],
            tasksTotal: json.tasksTotal,
            tasksHasMore: json.tasksHasMore,
          };
        });
      } catch (err) {
        setError(err?.message || "Could not load history.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [memberId, from, to]
  );

  useEffect(() => {
    load({ append: false, offset: 0 });
  }, [load]);

  // Keep in sync when the roster filter changes on another tab.
  useEffect(() => {
    setMemberId(filterId);
  }, [filterId]);

  function selectMember(id) {
    setMemberId(id);
    onFilterChange?.(id);
  }

  function applyQuickRange(days) {
    setFrom(addDays(today, -days));
    setTo(today);
  }

  const activeQuick = useMemo(() => {
    if (to !== today) return null;
    return QUICK_RANGES.find((r) => addDays(today, -r.days) === from)?.key || null;
  }, [from, to, today]);

  const summary = data?.analytics?.summary;
  const trend = data?.analytics?.trend || [];
  const tasks = data?.tasks || [];
  const tasksTotal = data?.tasksTotal ?? tasks.length;
  const tasksHasMore = Boolean(data?.tasksHasMore);
  const showSkeleton = loading && !data;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="panel px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Person" className="min-w-[150px] flex-1">
            <Select value={memberId} onChange={(e) => selectMember(e.target.value)}>
              <option value="all">All team</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="From" className="min-w-[140px] flex-1">
            <TextInput
              type="date"
              value={from}
              max={to}
              invalid={Boolean(rangeError)}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>

          <Field label="To" className="min-w-[140px] flex-1" error={rangeError}>
            <TextInput
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-1.5 pb-0.5">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => applyQuickRange(r.days)}
                aria-pressed={activeQuick === r.key}
                className={`h-10 rounded-lg border px-2.5 text-2xs font-semibold transition-colors duration-fast ${
                  activeQuick === r.key
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-line-strong bg-surface text-ink-600 hover:bg-surface-hover hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <p className="meta mt-2.5 flex items-center gap-1.5">
          <Icon name="calendar" size={12} />
          {shortDate(from)} — {shortDate(to)}
          {loading && data && <span className="ml-1 text-ink-400">· refreshing…</span>}
        </p>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <HistorySkeleton />
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <div className="panel">
              <EmptyState
                icon="alert-circle"
                tone="danger"
                title="Could not load history"
                description={error}
                action={{ label: "Try again", onClick: () => load({ append: false, offset: 0 }), icon: "refresh" }}
              />
            </div>
          </motion.div>
        ) : summary ? (
          <motion.div
            key="data"
            className="space-y-3"
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tBase}
          >
            <motion.div
              {...staggerParent(reduced)}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              {[
                { label: "Total tasks", value: summary.total },
                { label: "Completion", value: `${summary.completionRate}%`, tone: "success" },
                { label: "Avg time", value: summary.avgDurationLabel || "—" },
                { label: "Overdue", value: summary.overdue, tone: summary.overdue > 0 ? "danger" : "ink" },
                { label: "Backlog", value: summary.backlog ?? 0, tone: (summary.backlog ?? 0) > 0 ? "warning" : "ink" },
              ].map((m) => (
                <motion.div key={m.label} {...riseItem(reduced)}>
                  <Metric {...m} />
                </motion.div>
              ))}
            </motion.div>

            <div className="grid gap-3 lg:grid-cols-2">
              <CompletionDonut summary={summary} />
              {trend.length > 0 && <DailyTrendChart trend={trend} />}
            </div>

            {memberId === "all" && data.analytics.byMember?.length > 0 && (
              <MemberBars byMember={data.analytics.byMember} />
            )}

            <TaskHistoryList
              tasks={tasks}
              total={tasksTotal}
              hasMore={tasksHasMore}
              loadingMore={loadingMore}
              onLoadMore={() => load({ append: true, offset: tasks.length })}
              onViewTask={onViewTask}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Task history: a real table on desktop, stacked cards on mobile.
 * @param {{ tasks: object[], total: number, hasMore: boolean, loadingMore: boolean, onLoadMore: () => void, onViewTask?: (task: object) => void }} props
 */
function TaskHistoryList({ tasks, total, hasMore, loadingMore, onLoadMore, onViewTask }) {
  const remaining = Math.max(0, total - tasks.length);

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h3 className="section-title">Task history</h3>
        <span className="badge badge-neutral tabular-nums">
          {tasks.length < total ? `${tasks.length} of ${total}` : total}
        </span>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          size="sm"
          icon="inbox"
          title="No tasks in this range"
          description="Try widening the date range or choosing a different person."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-hover">
                  <th scope="col" className="px-5 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                    Task
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                    Person
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                    Due
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                    Assigned by
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                    Time
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                    Status
                  </th>
                  {onViewTask && (
                    <th scope="col" className="px-5 py-2.5 text-right text-2xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-line-soft transition-colors duration-fast last:border-0 hover:bg-surface-hover"
                  >
                    <td className="max-w-0 px-5 py-3">
                      <p className="truncate text-[13px] font-medium text-ink" title={t.title}>
                        {t.title}
                      </p>
                      {t.notes && (
                        <p className="truncate text-xs text-ink-500" title={t.notes}>
                          {t.notes}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar member={t.member} size="xs" ring={false} />
                        <span className="text-[13px] text-ink-700">{t.member.name}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] tabular-nums text-ink-600" suppressHydrationWarning>
                      {shortDate(t.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-ink-600">
                      {t.assignedBy?.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-[13px] tabular-nums text-ink-600">
                      {t.durationLabel || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <StatusBadge status={t.status} />
                    </td>
                    {onViewTask && (
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          iconLeft="eye"
                          aria-label={`View details for ${t.title}`}
                          onClick={() => onViewTask(t)}
                        >
                          View
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line-soft md:hidden">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                <Avatar member={t.member} size="sm" ring={false} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate-2 text-[13px] font-medium text-ink" title={t.title}>
                      {t.title}
                    </p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="meta mt-1 truncate" suppressHydrationWarning>
                    {t.member.name} · {shortDate(t.dueDate)}
                    {t.assignedBy ? ` · Assigned by ${t.assignedBy.name}` : ""}
                    {t.durationLabel ? ` · ${t.durationLabel}` : ""}
                  </p>
                </div>
                {onViewTask && (
                  <Button
                    size="sm"
                    variant="ghost"
                    iconLeft="eye"
                    className="shrink-0"
                    aria-label={`View details for ${t.title}`}
                    onClick={() => onViewTask(t)}
                  >
                    View
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="border-t border-line px-4 py-3 text-center sm:px-5">
              <Button
                variant="secondary"
                size="sm"
                iconRight="chevron-down"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : `Load more (${remaining} left)`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
