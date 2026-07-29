"use client";

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "./ui/Icon";
import { Select, TextInput } from "./ui/Field";
import { tFast } from "@/lib/motion";
import { QUARTER_MINUTES } from "@/lib/dates";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Friendly date + 12-hour time picker (quarter-hour minutes, AM/PM toggle).
 * Replaces native datetime-local for clearer, mobile-friendly completion flows.
 *
 * @param {object} props
 * @param {string} props.label - Field label (e.g. "Start", "End")
 * @param {{ date: string, hour12: number, minute: number, ampm: "AM"|"PM" }} props.value
 * @param {(next: { date: string, hour12: number, minute: number, ampm: "AM"|"PM" }) => void} props.onChange
 * @param {string} [props.maxDate] - YYYY-MM-DD upper bound for the date input
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {() => void} [props.onBlur]
 * @param {string} [props.id]
 */
export default function TaskTimePicker({
  label,
  value,
  onChange,
  maxDate,
  error,
  hint,
  onBlur,
  id,
}) {
  const reduced = useReducedMotion();
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const ampmId = `${fieldId}-ampm`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  /**
   * Merge a partial update into the current value and notify parent.
   * @param {Partial<typeof value>} patch
   */
  function patch(next) {
    onChange({ ...value, ...next });
  }

  return (
    <fieldset className="min-w-0 border-0 p-0" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="field-label mb-1.5 float-left w-full">{label}</legend>

      <div className="clear-both space-y-2">
        <TextInput
          type="date"
          value={value.date}
          max={maxDate}
          onChange={(e) => patch({ date: e.target.value })}
          onBlur={onBlur}
          className="text-[13px]"
          aria-label={`${label} date`}
          invalid={Boolean(error)}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr_auto]">
          <Select
            value={String(value.hour12)}
            onChange={(e) => patch({ hour12: Number(e.target.value) })}
            onBlur={onBlur}
            className="min-h-10 text-[13px] tabular-nums"
            aria-label={`${label} hour`}
            invalid={Boolean(error)}
          >
            {HOURS_12.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>

          <span className="select-none text-sm font-medium text-ink-400" aria-hidden="true">
            :
          </span>

          <Select
            value={String(value.minute)}
            onChange={(e) => patch({ minute: Number(e.target.value) })}
            onBlur={onBlur}
            className="min-h-10 text-[13px] tabular-nums"
            aria-label={`${label} minutes`}
            invalid={Boolean(error)}
          >
            {QUARTER_MINUTES.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </Select>

          <div
            className="inline-flex min-h-10 shrink-0 rounded-md border border-line-strong bg-surface p-0.5"
            role="group"
            aria-labelledby={ampmId}
          >
            <span id={ampmId} className="sr-only">
              {label} AM or PM
            </span>
            {(["AM", "PM"]).map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={value.ampm === period}
                onClick={() => {
                  patch({ ampm: period });
                  onBlur?.();
                }}
                className={`min-w-[2.75rem] rounded px-2 py-1.5 text-2xs font-semibold transition-colors duration-fast ${
                  value.ampm === period
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-ink-600 hover:bg-surface-hover hover:text-ink"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            className="field-error"
            initial={{ opacity: 0, y: reduced ? 0 : -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tFast}
          >
            <Icon name="alert-circle" size={13} className="mt-px" />
            <span>{error}</span>
          </motion.p>
        ) : hint ? (
          <p key="hint" id={hintId} className="field-hint">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </fieldset>
  );
}
