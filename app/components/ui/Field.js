"use client";

import { Children, cloneElement, isValidElement, useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";
import { tFast } from "@/lib/motion";

/**
 * Labelled form field. Wires id / aria-invalid / aria-describedby onto its
 * single child control so callers can't forget the accessibility plumbing.
 *
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {boolean} [props.required]
 * @param {string} [props.error] - shown in place of the hint when present
 * @param {React.ReactNode} [props.hint]
 * @param {React.ReactNode} [props.counter] - right-aligned label-row slot (e.g. "12/200")
 * @param {string} [props.id] - optional stable id; generated otherwise
 */
export function Field({
  label,
  required = false,
  error,
  hint,
  counter,
  id,
  className = "",
  children,
}) {
  const reduced = useReducedMotion();
  const autoId = useId();
  const fieldId = id || autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy = error ? errorId : hint ? hintId : undefined;

  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child, {
        id: fieldId,
        invalid: Boolean(error) || child.props.invalid,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required: required || child.props.required,
      })
    : child;

  return (
    <div className={className}>
      {(label || counter) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={fieldId} className="field-label mb-0">
              {label}
              {required && (
                <span className="ml-0.5 text-danger-solid" aria-hidden="true">
                  *
                </span>
              )}
            </label>
          )}
          {counter && <span className="text-2xs tabular-nums text-ink-400">{counter}</span>}
        </div>
      )}

      {control}

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
    </div>
  );
}

/**
 * @param {{ invalid?: boolean, className?: string }} props
 */
export function TextInput({ invalid = false, className = "", ...rest }) {
  return <input className={`input input-h ${invalid ? "input-invalid" : ""} ${className}`} {...rest} />;
}

/**
 * @param {{ invalid?: boolean, className?: string }} props
 */
export function TextArea({ invalid = false, className = "", rows = 3, ...rest }) {
  return (
    <textarea
      rows={rows}
      className={`input resize-y py-2.5 leading-relaxed ${invalid ? "input-invalid" : ""} ${className}`}
      {...rest}
    />
  );
}

/**
 * @param {{ invalid?: boolean, className?: string }} props
 */
export function Select({ invalid = false, className = "", children, ...rest }) {
  return (
    <select className={`select ${invalid ? "input-invalid" : ""} ${className}`} {...rest}>
      {children}
    </select>
  );
}
