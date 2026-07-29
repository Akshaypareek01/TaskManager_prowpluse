"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import TaskCard from "./TaskCard";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import EmptyState from "./ui/EmptyState";
import { collapse, riseItem, staggerParent } from "@/lib/motion";

const ALERT_META = {
  completion_congrats: {
    label: "Completed",
    icon: "check-circle",
    ring: "bg-success-bg text-success-fg",
  },
  reminder_6pm: {
    label: "Reminder",
    icon: "bell",
    ring: "bg-warning-bg text-warning-fg",
  },
  overdue: {
    label: "Overdue",
    icon: "alert-triangle",
    ring: "bg-danger-bg text-danger-fg",
  },
  announcement: {
    label: "Announcement",
    icon: "megaphone",
    ring: "bg-orange-100 text-orange-700",
  },
};

const FALLBACK_META = { label: "Update", icon: "sparkle", ring: "bg-info-bg text-info-fg" };

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "30d", label: "Last 30 days" },
];

/**
 * Relative time from epoch ms.
 * @param {number} ts
 * @param {number} now
 * @returns {string}
 */
function relTime(ts, now) {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/**
 * Filter alerts by selected member.
 * @param {object[]} list
 * @param {string} filterId
 * @returns {object[]}
 */
function filterByMember(list, filterId) {
  const announcements = list.filter((a) => a.type === "announcement");
  if (filterId === "all") return list;
  const memberAlerts = list.filter(
    (a) => a.type !== "announcement" && a.member?.id === filterId
  );
  return [...announcements, ...memberAlerts].sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

/**
 * Activity feed with today default and paginated 30-day history.
 *
 * @param {{ alerts: object[], now: number, filterId?: string, filterName?: string, tasks?: object[], onComplete?: Function, onGoToday?: () => void, onClearFilter?: () => void, onAlertsRead?: () => void }} props
 */
export default function AlertsTab({
  alerts,
  now,
  filterId = "all",
  filterName,
  tasks = [],
  onComplete,
  onGoToday,
  onClearFilter,
  canCompleteTask,
  signInHref = "/sign-in",
  isAuthenticated = false,
  onAlertsRead,
}) {
  const reduced = useReducedMotion();
  const markedRef = useRef(new Set());
  const [range, setRange] = useState("today");
  const [historicalAlerts, setHistoricalAlerts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setExpandedTaskId(null), [filterId, range]);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    markedRef.current.clear();
  }, [filterId, range]);

  /**
   * Load a page of historical alerts from the server.
   * @param {number} offset
   * @param {boolean} reset
   */
  const loadHistorical = useCallback(
    async (offset, reset) => {
      setLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams({
          days: "30",
          memberId: filterId,
          limit: "50",
          offset: String(offset),
        });
        const res = await fetch(`/api/alerts?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load alerts");

        setHistoricalAlerts((prev) =>
          reset ? data.alerts : [...prev, ...data.alerts]
        );
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [filterId]
  );

  useEffect(() => {
    if (range !== "30d") {
      setHistoricalAlerts([]);
      setHasMore(false);
      setLoadError("");
      return;
    }
    loadHistorical(0, true);
  }, [range, filterId, loadHistorical]);

  const visibleAlerts = useMemo(() => {
    const source = range === "today" ? alerts : historicalAlerts;
    return filterByMember(source, filterId);
  }, [alerts, historicalAlerts, filterId, range]);

  /**
   * Mark visible unread alerts as read once the user opens this tab.
   */
  useEffect(() => {
    const unreadIds = visibleAlerts
      .filter((a) => !a.read && !markedRef.current.has(a.id))
      .map((a) => a.id);
    if (unreadIds.length === 0) return;

    unreadIds.forEach((id) => markedRef.current.add(id));

    fetch("/api/alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertIds: unreadIds }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to mark alerts read");
        onAlertsRead?.();
      })
      .catch(() => {
        unreadIds.forEach((id) => markedRef.current.delete(id));
      });
  }, [visibleAlerts, onAlertsRead]);

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  const rangeHint =
    range === "today"
      ? "Showing today's alerts"
      : `Showing last 30 days${visibleAlerts.length > 0 ? ` · ${visibleAlerts.length} loaded` : ""}`;

  if (visibleAlerts.length === 0 && !loading) {
    return (
      <div className="flex flex-col gap-3">
        <RangeBar range={range} onChange={setRange} hint={rangeHint} />
        <div className="panel">
          <EmptyState
            icon="bell"
            title={
              filterId === "all"
                ? range === "today"
                  ? "No alerts today"
                  : "No alerts in the last 30 days"
                : `No alerts for ${filterName || "this person"}`
            }
            description={
              filterId === "all"
                ? range === "today"
                  ? "Completions, 6pm reminders and overdue notices land here as the day goes on."
                  : "Try switching back to Today or check another teammate."
                : "Try another teammate or clear the filter to see everyone."
            }
            action={
              filterId !== "all" && onClearFilter
                ? { label: "Clear filter", onClick: onClearFilter, icon: "x" }
                : onGoToday
                ? { label: "Back to today", onClick: onGoToday, icon: "list-checks" }
                : undefined
            }
          />
        </div>
        {loadError && (
          <p className="text-center text-xs text-danger-fg" role="alert">
            {loadError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <RangeBar range={range} onChange={setRange} hint={rangeHint} />

      <motion.ul
        {...staggerParent(reduced, 0.025)}
        className="flex flex-col gap-2"
        aria-label={
          filterId === "all"
            ? "Team activity"
            : `Activity for ${filterName || "selected member"}`
        }
      >
        {visibleAlerts.map((a) => {
          const meta = ALERT_META[a.type] || FALLBACK_META;
          const isAnnouncement = a.type === "announcement";
          const linkedTask = a.taskId && a.type === "overdue" ? taskById[a.taskId] : null;
          const canComplete =
            linkedTask &&
            linkedTask.status !== "completed" &&
            typeof onComplete === "function" &&
            (canCompleteTask ? canCompleteTask(linkedTask) : false);
          const canAttemptComplete =
            linkedTask &&
            linkedTask.status !== "completed" &&
            typeof onComplete === "function";
          const isExpanded = expandedTaskId === a.taskId;

          return (
            <motion.li key={a.id} {...riseItem(reduced)}>
              <article
                className={`card relative overflow-hidden ${
                  isAnnouncement
                    ? "border-2 border-orange-400 bg-gradient-to-br from-orange-50/90 to-amber-50/50 shadow-sm"
                    : !a.read
                      ? "ring-1 ring-danger-border/60"
                      : ""
                }`}
              >
                {!a.read && !isAnnouncement && (
                  <span
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-danger-solid px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                    aria-label="Unread alert"
                  >
                    New
                  </span>
                )}
                {!a.read && isAnnouncement && (
                  <span
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                    aria-label="Unread announcement"
                  >
                    New
                  </span>
                )}
                <div className="flex items-start gap-3 p-3.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${meta.ring}`}>
                    <Icon name={meta.icon} size={16} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13px] font-semibold text-ink">{meta.label}</span>
                      {!isAnnouncement && a.member?.name && (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Avatar member={a.member} size="xs" ring={false} />
                          <span className="truncate text-xs text-ink-500">{a.member.name}</span>
                        </span>
                      )}
                      <time
                        className="meta ml-auto shrink-0 tabular-nums"
                        dateTime={new Date(a.createdAt).toISOString()}
                        suppressHydrationWarning
                      >
                        {mounted ? relTime(a.createdAt, now) : ""}
                      </time>
                    </div>

                    {isAnnouncement && a.title && (
                      <h4 className="mt-1.5 text-[14px] font-semibold leading-snug text-ink">
                        {a.title}
                      </h4>
                    )}

                    <p className={`text-[13px] leading-relaxed text-ink-700 ${isAnnouncement ? "mt-1.5" : "mt-1"}`}>
                      {a.message}
                    </p>

                    {isAnnouncement && a.announcedBy && (
                      <p className="mt-2 text-xs font-semibold text-orange-800">
                        Announcement by {a.announcedBy}
                      </p>
                    )}

                    {canAttemptComplete && !isExpanded && (
                      canComplete ? (
                        <Button
                          variant="link"
                          className="mt-2"
                          iconRight="arrow-right"
                          onClick={() => setExpandedTaskId(a.taskId)}
                          aria-expanded={false}
                        >
                          Complete it now
                        </Button>
                      ) : !isAuthenticated ? (
                        <a
                          href={signInHref}
                          className="btn btn-link mt-2 inline-flex text-[13px]"
                        >
                          Sign in to complete
                          <Icon name="arrow-right" size={14} />
                        </a>
                      ) : null
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {canComplete && isExpanded && (
                    <motion.div {...collapse(reduced)} className="overflow-hidden border-t border-line">
                      <div className="bg-surface-hover p-3">
                        <TaskCard
                          task={linkedTask}
                          compact
                          defaultOpen
                          canComplete={canComplete}
                          isAuthenticated={isAuthenticated}
                          signInHref={signInHref}
                          onComplete={async (...args) => {
                            await onComplete(...args);
                            setExpandedTaskId(null);
                          }}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setExpandedTaskId(null)}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            </motion.li>
          );
        })}
      </motion.ul>

      {range === "30d" && hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="secondary"
            size="sm"
            iconLeft="chevron-down"
            onClick={() => loadHistorical(historicalAlerts.length, false)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      {loadError && (
        <p className="text-center text-xs text-danger-fg" role="alert">
          {loadError}
        </p>
      )}
    </div>
  );
}

/**
 * Today vs 30-day range toggle for the alerts feed.
 * @param {{ range: string, onChange: (key: string) => void, hint: string }} props
 */
function RangeBar({ range, onChange, hint }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-sunken p-1"
        role="group"
        aria-label="Alert time range"
      >
        {RANGE_OPTIONS.map((opt) => {
          const active = range === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-fast ease-smooth ${
                active
                  ? "bg-surface text-ink shadow-xs"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="meta tabular-nums">{hint}</p>
    </div>
  );
}
