"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReportCard from "./reports/ReportCard";
import ReportDetailView from "./reports/ReportDetailView";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import EmptyState from "./ui/EmptyState";
import Skeleton from "./ui/Skeleton";
import { riseItem, staggerParent, tBase } from "@/lib/motion";

/**
 * "YYYY-MM-DD" -> "Mon, Jul 21"
 * @param {string} iso
 */
function longShortDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function ReportsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Weekly AI team reports tab — list view and full-page detail with member filter.
 */
export default function ReportsTab() {
  const reduced = useReducedMotion();
  const [reports, setReports] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(null);

  /**
   * Load reports list and schedule metadata.
   * @param {{ append?: boolean }} [opts]
   */
  const load = useCallback(async ({ append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const offset = append ? reports.length : 0;
      const [listRes, schedRes] = await Promise.all([
        fetch(`/api/reports?limit=20&offset=${offset}`, { cache: "no-store" }),
        append ? Promise.resolve(null) : fetch("/api/reports/schedule", { cache: "no-store" }),
      ]);

      const listJson = await listRes.json();
      if (!listRes.ok) throw new Error(listJson.error || "Failed to load reports");

      setReports((prev) =>
        append ? [...prev, ...(listJson.reports || [])] : listJson.reports || []
      );
      setHasMore(Boolean(listJson.hasMore));

      if (schedRes) {
        const schedJson = await schedRes.json();
        if (schedRes.ok) setSchedule(schedJson);
      }
    } catch (err) {
      setError(err?.message || "Could not load reports.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [reports.length]);

  useEffect(() => {
    load({ append: false });
  }, []);

  const showSkeleton = loading && reports.length === 0;

  const nextReportLabel = schedule?.nextReportAt
    ? `${longShortDate(new Date(schedule.nextReportAt).toISOString().slice(0, 10))} 9 AM`
    : null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <ReportDetailView
            key="detail"
            report={selected}
            onBack={() => setSelected(null)}
          />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase} className="space-y-3">
      <div className="panel px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="section-title flex items-center gap-2">
              <Icon name="file-text" size={16} className="text-brand-600" />
              Weekly team reports
            </h3>
            {nextReportLabel && (
              <p className="meta mt-1" aria-live="polite" suppressHydrationWarning>
                {nextReportLabel}
              </p>
            )}
            {schedule?.lastReport && (
              <p className="meta mt-0.5">
                Last generated: {longShortDate(schedule.lastReport.weekStart)} week
              </p>
            )}
          </div>
          {schedule?.generating && (
            <span className="badge badge-brand" role="status">
              Generating report…
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showSkeleton ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <ReportsSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <div className="panel">
              <EmptyState
                icon="alert-circle"
                tone="danger"
                title="Could not load reports"
                description={error}
                action={{ label: "Try again", onClick: () => load({ append: false }), icon: "refresh" }}
              />
            </div>
          </motion.div>
        ) : reports.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tBase}>
            <div className="panel">
              <EmptyState
                icon="file-text"
                title="No reports yet"
                description="The first weekly AI report will appear after the next Monday 9 AM run."
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            {...staggerParent(reduced)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {reports.map((report) => (
              <motion.div key={report.id} {...riseItem(reduced)}>
                <ReportCard report={report} onSelect={setSelected} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && !loading && (
        <div className="text-center">
          <Button
            variant="secondary"
            size="sm"
            iconRight="chevron-down"
            onClick={() => load({ append: true })}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more reports"}
          </Button>
        </div>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
