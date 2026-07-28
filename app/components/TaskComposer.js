"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import { Field, TextArea, TextInput } from "./ui/Field";
import { addDays } from "@/lib/dates";
import { tFast } from "@/lib/motion";

const MAX_TITLE = 200;
const MAX_NOTES = 600;
const MIN_TITLE = 3;
/**
 * Client-side mirror of the server's rules (lib/store.js, lib/dates.js).
 * Server-side validation still runs — this exists so people get told what is
 * wrong before they wait for a round trip.
 *
 * @param {{ memberId: string, title: string, notes: string, dueDate: string, today: string }} values
 * @returns {Record<string, string>}
 */
function validate({ memberId, title, notes, dueDate, today }) {
  const errors = {};
  const trimmedTitle = title.trim();

  if (!memberId) errors.memberId = "Your account must be linked before you can add tasks.";

  if (!trimmedTitle) {
    errors.title = "Add a short title so the team knows what you're working on.";
  } else if (trimmedTitle.length < MIN_TITLE) {
    errors.title = `Use at least ${MIN_TITLE} characters.`;
  } else if (title.length > MAX_TITLE) {
    errors.title = `Keep it under ${MAX_TITLE} characters.`;
  }

  if (notes.length > MAX_NOTES) {
    errors.notes = `Notes must be under ${MAX_NOTES} characters.`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    errors.dueDate = "Pick a valid due date.";
  } else if (dueDate < addDays(today, -365) || dueDate > addDays(today, 365)) {
    errors.dueDate = "Pick a date within a year of today.";
  }

  return errors;
}

/**
 * Add-a-task dialog.
 *
 * @param {object} props
 * @param {object[]} props.team
 * @param {string} props.today
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(state: object, meta: object) => void} props.onPosted
 * @param {string|null} [props.lockedMemberId] - signed-in user's member id; only self-assignment is allowed
 * @param {() => void} [props.onSessionExpired] - called when the server rejects auth
 */
export default function TaskComposer({
  team,
  today,
  open,
  onClose,
  onPosted,
  lockedMemberId = null,
  onSessionExpired,
}) {
  const reduced = useReducedMotion();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const memberId = lockedMemberId ?? "";
  const selectedMember = useMemo(
    () => team.find((m) => m.id === memberId) ?? null,
    [team, memberId]
  );

  // Reset transient state each time the dialog opens.
  useEffect(() => {
    if (open) return;
    setTitle("");
    setNotes("");
    setDueDate(today);
    setTouched({});
    setSubmitted(false);
    setServerError("");
    setBusy(false);
  }, [open, today]);

  const errors = useMemo(
    () => validate({ memberId, title, notes, dueDate, today }),
    [memberId, title, notes, dueDate, today]
  );

  /** Only surface an error once the field was touched or a submit was attempted. */
  const shown = (key) => (submitted || touched[key] ? errors[key] : undefined);

  async function submit(e) {
    e?.preventDefault();
    setSubmitted(true);
    setServerError("");

    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          title: title.trim(),
          notes: notes.trim(),
          dueDate,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onSessionExpired?.();
        throw new Error("Sign in to add tasks.");
      }
      if (!res.ok) throw new Error(data.error || "Could not add the task.");

      onPosted(data, { title: title.trim(), memberName: selectedMember?.name });
    } catch (err) {
      // The form keeps everything the user typed — never make them retype.
      setServerError(err?.message || "Could not add the task. Check your connection and retry.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Add a task"
      description="Post what you're working on so it shows up on today's wall."
      footer={
        <>
          <span className="meta min-w-[4.5rem] tabular-nums">
            {title.trim().length > 0 ? `${title.length}/${MAX_TITLE}` : "\u00a0"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              loading={busy}
              loadingLabel="Adding"
              iconLeft="plus"
            >
              Add task
            </Button>
          </div>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {/* Who */}
        <fieldset className="mb-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <legend className="field-label mb-0">
              Who is this for
              <span className="ml-0.5 text-danger-solid" aria-hidden="true">
                *
              </span>
            </legend>
            <span className="text-2xs font-medium text-ink-500">Your account</span>
          </div>

          {selectedMember ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-hover p-3"
              aria-readonly="true"
            >
              <Avatar member={selectedMember} size="sm" ring={false} />
              <span className="text-sm font-medium text-ink">{selectedMember.name}</span>
            </div>
          ) : (
            <p className="rounded-lg border border-line bg-surface-hover px-3 py-2.5 text-sm text-ink-600">
              Your account is not linked yet. Sign out and sign in again.
            </p>
          )}

          {shown("memberId") && (
            <p className="field-error" role="alert">
              <Icon name="alert-circle" size={13} className="mt-px" />
              {errors.memberId}
            </p>
          )}
        </fieldset>

        <Field
          label="Task"
          required
          className="mb-4"
          error={shown("title")}
          hint="What are you working on today?"
          counter={`${title.length}/${MAX_TITLE}`}
        >
          <TextInput
            value={title}
            maxLength={MAX_TITLE}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="e.g. Ship the billing export fix"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, title: true }))}
          />
        </Field>

        <Field
          label="Notes"
          className="mb-4"
          error={shown("notes")}
          hint="Optional — context, blockers, links."
          counter={notes.length > 0 ? `${notes.length}/${MAX_NOTES}` : undefined}
        >
          <TextArea
            value={notes}
            rows={3}
            maxLength={MAX_NOTES}
            placeholder="Any extra detail…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, notes: true }))}
          />
        </Field>

        <Field label="Due date" required error={shown("dueDate")}>
          <TextInput
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, dueDate: true }))}
          />
        </Field>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { label: "Today", value: today },
            { label: "Tomorrow", value: addDays(today, 1) },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setDueDate(opt.value)}
              className={`rounded-md border px-2 py-1 text-2xs font-semibold transition-colors duration-fast ${
                dueDate === opt.value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line bg-surface text-ink-600 hover:border-line-strong hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {serverError && (
          <motion.p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-fg"
            initial={{ opacity: 0, y: reduced ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tFast}
          >
            <Icon name="alert-circle" size={15} className="mt-px" />
            {serverError}
          </motion.p>
        )}

        {/* Enables Enter-to-submit without a visible duplicate button. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Add task
        </button>
      </form>
    </Modal>
  );
}
