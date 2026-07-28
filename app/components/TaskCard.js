"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import { StatusBadge } from "./ui/Badge";
import { Field, TextInput } from "./ui/Field";
import { collapse, tFast } from "@/lib/motion";

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Epoch ms -> value for <input type="datetime-local">.
 * @param {number} ts
 * @returns {string}
 */
function toInputValue(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

/**
 * "YYYY-MM-DD" -> short local date label.
 * @param {string} dueDate
 * @returns {string}
 */
function formatDueDate(dueDate) {
  const [y, m, d] = String(dueDate).split("-").map(Number);
  if (!y || !m || !d) return dueDate;
  return new Date(y, m - 1, d).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

/**
 * Human duration between two epoch ms values.
 * @param {number} ms
 * @returns {string}
 */
function humanDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

const STATUS_STRIPE = {
  completed: "bg-success-solid",
  overdue: "bg-danger-solid",
  backlog: "bg-warning-solid",
  in_progress: "bg-brand-600",
  pending: "bg-line-strong",
};

/**
 * A single task on the wall.
 *
 * The complete-flow is inline rather than a modal: marking work done is the
 * most frequent action here and shouldn't cost a context switch.
 *
 * @param {object} props
 * @param {object} props.task
 * @param {(id: string, start: number, end: number) => Promise<void>} props.onComplete
 * @param {boolean} [props.defaultOpen] - start with the complete form expanded
 * @param {boolean} [props.compact] - denser padding, used inside the alerts list
 * @param {boolean} [props.canComplete] - false when logged out or wrong member
 * @param {boolean} [props.isAuthenticated] - signed-in session present
 * @param {string} [props.signInHref] - link target when auth is required
 * @param {() => void} [props.onView] - opens read-only task detail drawer
 */
export default function TaskCard({
  task,
  onComplete,
  defaultOpen = false,
  compact = false,
  canComplete = true,
  isAuthenticated = false,
  signInHref = "/sign-in",
  onView,
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const [startTime, setStartTime] = useState(() => toInputValue(Date.now() - 3600000));
  const [endTime, setEndTime] = useState(() => toInputValue(Date.now()));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState("");

  const isDone = task.status === "completed";
  const isOverdue = task.status === "overdue";
  const isBacklog = task.status === "backlog";
  const isLate = isOverdue || isBacklog;

  /** Live validation — drives both the inline errors and the duration preview. */
  const validation = useMemo(() => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const next = {};

    if (!startTime || Number.isNaN(start)) next.start = "Pick a valid start time.";
    if (!endTime || Number.isNaN(end)) next.end = "Pick a valid end time.";

    if (!next.start && !next.end) {
      if (end <= start) {
        next.end = "End time must be after the start time.";
      } else if (end - start > MAX_DURATION_MS) {
        next.end = "That is over 24 hours — check the dates.";
      } else if (end > Date.now() + 60000) {
        next.end = "End time cannot be in the future.";
      }
    }

    return {
      errors: next,
      valid: Object.keys(next).length === 0,
      durationLabel: !next.start && !next.end ? humanDuration(end - start) : null,
    };
  }, [startTime, endTime]);

  /**
   * Errors are derived from live state rather than copied into their own
   * store on blur — a snapshot taken in the blur handler is one render stale
   * and silently loses the error the user just created.
   */
  const shown = (key) => (attempted || touched[key] ? validation.errors[key] : undefined);

  /** Sets start relative to now — covers the common "I just finished" case. */
  function applyPreset(minutes) {
    const now = Date.now();
    setStartTime(toInputValue(now - minutes * 60000));
    setEndTime(toInputValue(now));
    setTouched({});
    setAttempted(false);
    setFormError("");
  }

  async function submitComplete() {
    setFormError("");
    setAttempted(true);
    if (!validation.valid) return;

    setBusy(true);
    try {
      await onComplete(
        task.id,
        new Date(startTime).getTime(),
        new Date(endTime).getTime()
      );
      setOpen(false);
      setTouched({});
      setAttempted(false);
    } catch (err) {
      setFormError(err?.message || "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`card-interactive relative flex h-full flex-col overflow-hidden ${
        isDone ? "bg-surface-hover" : ""
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${STATUS_STRIPE[task.status] || STATUS_STRIPE.pending}`}
        aria-hidden="true"
      />

      <div className={compact ? "p-3 pl-4" : "p-4 pl-4.5"}>
        <div className="flex items-start gap-3">
          <Avatar member={task.member} size={compact ? "sm" : "md"} ring={false} />

          <div className="min-w-0 flex-1">
            <h3
              className={`truncate-2 break-words font-medium leading-snug text-ink ${
                compact ? "text-[13px]" : "text-[15px]"
              } ${isDone ? "text-ink-600" : ""}`}
              title={task.title}
            >
              {task.title}
            </h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
              <span className="font-medium text-ink-600">{task.member.name}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex items-center gap-1 ${isLate ? "font-medium text-danger-fg" : ""} ${isBacklog ? "!text-warning-fg" : ""}`}
                suppressHydrationWarning
              >
                <Icon name="calendar" size={12} />
                {formatDueDate(task.dueDate)}
              </span>
              {isDone && task.durationLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="hourglass" size={12} />
                    {task.durationLabel}
                  </span>
                </>
              )}
              {task.assignedBy && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="user" size={12} />
                    Assigned by {task.assignedBy.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-start">
            <StatusBadge status={task.status} />
          </div>
        </div>

        {task.notes && (
          <p className="truncate-2 mt-2.5 pl-0 text-[13px] leading-relaxed text-ink-600" title={task.notes}>
            {task.notes}
          </p>
        )}
      </div>

      {/* Action row */}
      {!isDone && !open && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft px-4 py-2.5">
          <span className="meta">
            {isOverdue ? "Late — still completable" : isBacklog ? "Backlog — still completable" : "Not started"}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {canComplete ? (
              <Button size="sm" variant="secondary" iconLeft="check" onClick={() => setOpen(true)}>
                Mark complete
              </Button>
            ) : !isAuthenticated ? (
              <Link href={signInHref} className="btn btn-secondary btn-sm inline-flex">
                Sign in to complete
              </Link>
            ) : (
              <span className="text-2xs font-medium text-ink-400">Your tasks only</span>
            )}
            {onView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-500"
                iconLeft="eye"
                aria-label={`View details for ${task.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              />
            )}
          </div>
        </div>
      )}

      {isDone && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-success-fg">
            <Icon name="check-circle" size={13} />
            Completed
            {task.completedAt && (
              <span className="font-normal text-ink-500" suppressHydrationWarning>
                at{" "}
                {new Date(task.completedAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          {onView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-ink-500"
              iconLeft="eye"
              aria-label={`View details for ${task.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            />
          )}
        </div>
      )}

      {/* Complete form */}
      <AnimatePresence initial={false}>
        {!isDone && open && (
          <motion.div {...collapse(reduced)} className="overflow-hidden border-t border-line">
            <div className="bg-surface-hover px-4 py-3.5">
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span className="eyebrow mr-1">Worked for</span>
                {[30, 60, 120].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => applyPreset(m)}
                    className="rounded-md border border-line bg-surface px-2 py-1 text-2xs font-semibold text-ink-600 transition-colors duration-fast hover:border-brand-600 hover:text-brand-600"
                  >
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </button>
                ))}
              </div>

              {/* Single column: the card sits in a 3-up grid, so a viewport
                  breakpoint can't tell us how wide it actually is, and a
                  half-width datetime input clips its own value. */}
              <div className="grid gap-3">
                <Field label="Started" error={shown("start")}>
                  <TextInput
                    type="datetime-local"
                    value={startTime}
                    max={toInputValue(Date.now())}
                    onChange={(e) => setStartTime(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, start: true }))}
                    className="text-[13px]"
                  />
                </Field>
                <Field label="Finished" error={shown("end")}>
                  <TextInput
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, end: true }))}
                    className="text-[13px]"
                  />
                </Field>
              </div>

              <AnimatePresence>
                {formError && (
                  <motion.p
                    role="alert"
                    className="mt-3 flex items-start gap-1.5 rounded-md border border-danger-border bg-danger-bg px-2.5 py-2 text-xs font-medium text-danger-fg"
                    initial={{ opacity: 0, y: reduced ? 0 : -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={tFast}
                  >
                    <Icon name="alert-circle" size={13} className="mt-px" />
                    {formError}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-3.5 flex items-center justify-between gap-3">
                <span className="meta truncate" aria-live="polite">
                  {validation.durationLabel ? (
                    <>
                      Duration{" "}
                      <span className="font-semibold tabular-nums text-ink-700">
                        {validation.durationLabel}
                      </span>
                    </>
                  ) : validation.valid ? (
                    "Set both times"
                  ) : (
                    "Check the times above"
                  )}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={submitComplete}
                    loading={busy}
                    loadingLabel="Saving"
                    disabled={!validation.valid}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
