"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { MemberReportSection, formatWeekRange } from "./ReportCard";
import { tBase } from "@/lib/motion";

/**
 * Slide-over drawer with full weekly report detail.
 * @param {{ open: boolean, report: object|null, onClose: () => void }} props
 */
export default function ReportDetailDrawer({ open, report, onClose }) {
  const reduced = useReducedMotion();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && report && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tBase}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
            aria-label="Close report detail"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            initial={{ x: reduced ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduced ? 0 : "100%" }}
            transition={tBase}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-line bg-surface shadow-panel"
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="eyebrow flex items-center gap-1.5">
                  <Icon name="file-text" size={12} />
                  Weekly report
                </p>
                <h2 id="report-detail-title" className="mt-1 text-display-xs font-semibold">
                  {formatWeekRange(report.weekStart, report.weekEnd)}
                </h2>
              </div>
              <Button
                ref={closeRef}
                variant="ghost"
                size="sm"
                iconLeft="x"
                aria-label="Close report"
                onClick={onClose}
              />
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <section className="rounded-xl border border-brand-200 bg-brand-50/50 p-4" aria-label="Team summary">
                <h3 className="text-[13px] font-semibold text-brand-800">Team summary</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{report.summary}</p>
                {report.teamSummary && report.teamSummary !== report.summary && (
                  <p className="mt-2 text-sm font-medium text-brand-700">{report.teamSummary}</p>
                )}
              </section>

              <h3 className="section-title mt-5 mb-3">Per member</h3>
              <ul className="space-y-3">
                {(report.members || []).map((member) => (
                  <li key={member.memberId}>
                    <MemberReportSection member={member} />
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
