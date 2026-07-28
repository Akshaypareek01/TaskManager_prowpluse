"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import { StatusBadge } from "./ui/Badge";
import { tBase, tFast } from "@/lib/motion";
import { formatDateTime12h } from "@/lib/dates";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "YYYY-MM-DD" -> short local date label.
 * @param {string} dueDate
 * @returns {string}
 */
function formatDueDate(dueDate) {
  const [y, m, d] = String(dueDate).split("-").map(Number);
  if (!y || !m || !d) return dueDate;
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Epoch ms -> readable date/time string.
 * @param {number|null|undefined} ts
 * @returns {string}
 */
function formatDateTime(ts) {
  return formatDateTime12h(ts);
}

/**
 * Label + value row for the detail panel.
 * @param {{ label: string, children: React.ReactNode }} props
 */
function DetailRow({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-line-soft py-3.5 last:border-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-[13px] leading-relaxed text-ink-700">{children}</dd>
    </div>
  );
}

/**
 * Read-only right-side drawer showing full task metadata.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.task - API task shape from taskToApi
 * @param {() => void} props.onClose
 */
export default function TaskDetailDrawer({ open, task, onClose }) {
  const reduced = useReducedMotion();
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /** Stable close handler — avoids re-running the open/lock effect when parents re-render. */
  const requestClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const focusTimer = window.setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const first = node.querySelector(FOCUSABLE);
      (first || node).focus({ preventScroll: true });
    }, 40);

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const node = dialogRef.current;
      if (!node) return;
      const items = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (restoreRef.current instanceof HTMLElement) {
        restoreRef.current.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!mounted) return null;

  const isCompleted = task?.status === "completed";
  const hasTiming = Boolean(task?.startTime || task?.endTime || task?.durationLabel);

  return createPortal(
    <AnimatePresence>
      {open && task && (
        <div className="fixed inset-0 z-50 flex justify-end supports-[height:100dvh]:max-h-[100dvh]">
          <motion.div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tFast}
            onClick={requestClose}
            aria-hidden="true"
          />

          <motion.aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
            aria-describedby="task-detail-description"
            tabIndex={-1}
            className="relative flex h-full max-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-line bg-surface shadow-2xl"
            initial={{ x: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            transition={tBase}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <p id="task-detail-description" className="eyebrow">
                  Task details
                </p>
                <h2
                  id="task-detail-title"
                  className="mt-1 break-words text-base font-semibold leading-snug text-ink"
                >
                  {task.title}
                </h2>
                <div className="mt-2">
                  <StatusBadge status={task.status} />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 -mt-1 h-8 w-8 shrink-0"
                onClick={requestClose}
                iconLeft="x"
                aria-label="Close task details"
              />
            </header>

            <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5">
              <dl>
                {task.notes ? (
                  <DetailRow label="Notes">
                    <p className="whitespace-pre-wrap break-words text-ink">{task.notes}</p>
                  </DetailRow>
                ) : null}

                <DetailRow label="Assignee">
                  <span className="inline-flex items-center gap-2">
                    <Avatar member={task.member} size="xs" ring={false} />
                    <span className="font-medium text-ink">{task.member.name}</span>
                  </span>
                </DetailRow>

                <DetailRow label="Assigned by">
                  {task.assignedBy ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="user" size={14} className="text-ink-500" />
                      {task.assignedBy.name}
                    </span>
                  ) : (
                    "—"
                  )}
                </DetailRow>

                <DetailRow label="Due date">
                  <span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
                    <Icon name="calendar" size={14} className="text-ink-500" />
                    {formatDueDate(task.dueDate)}
                  </span>
                </DetailRow>

                <DetailRow label="Status">
                  <StatusBadge status={task.status} />
                </DetailRow>

                {hasTiming && (
                  <>
                    <DetailRow label="Start time">
                      <span suppressHydrationWarning>{formatDateTime(task.startTime)}</span>
                    </DetailRow>
                    <DetailRow label="End time">
                      <span suppressHydrationWarning>{formatDateTime(task.endTime)}</span>
                    </DetailRow>
                    <DetailRow label="Duration">
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Icon name="hourglass" size={14} className="text-ink-500" />
                        {task.durationLabel || "—"}
                      </span>
                    </DetailRow>
                  </>
                )}

                {isCompleted && task.completedAt && (
                  <DetailRow label="Completed at">
                    <span suppressHydrationWarning>{formatDateTime(task.completedAt)}</span>
                  </DetailRow>
                )}

                <DetailRow label="Created">
                  <span suppressHydrationWarning>{formatDateTime(task.createdAt)}</span>
                </DetailRow>
              </dl>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
