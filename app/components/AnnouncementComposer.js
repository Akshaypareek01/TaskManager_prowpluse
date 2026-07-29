"use client";

import { useEffect, useState } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import { Field, TextArea, TextInput } from "./ui/Field";

const MAX_TITLE = 120;
const MAX_BODY = 600;
const MIN_LEN = 3;

/**
 * Validate announcement form fields.
 * @param {{ title: string, description: string }} values
 * @returns {Record<string, string>}
 */
function validate({ title, description }) {
  const errors = {};
  const trimmedTitle = title.trim();
  const trimmedDesc = description.trim();

  if (!trimmedTitle) {
    errors.title = "Add a title for the announcement.";
  } else if (trimmedTitle.length < MIN_LEN) {
    errors.title = `Use at least ${MIN_LEN} characters.`;
  } else if (title.length > MAX_TITLE) {
    errors.title = `Keep the title under ${MAX_TITLE} characters.`;
  }

  if (!trimmedDesc) {
    errors.description = "Add a message for the team.";
  } else if (trimmedDesc.length < MIN_LEN) {
    errors.description = `Use at least ${MIN_LEN} characters.`;
  } else if (description.length > MAX_BODY) {
    errors.description = `Keep it under ${MAX_BODY} characters.`;
  }

  return errors;
}

/**
 * Modal to post a team-wide announcement alert.
 * @param {{ open: boolean, onClose: () => void, user: object|null, onPosted: (state: object) => void, onSessionExpired?: () => void }} props
 */
export default function AnnouncementComposer({
  open,
  onClose,
  user,
  onPosted,
  onSessionExpired,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setSubmitted(false);
    setServerError("");
  }, [open]);

  const errors = validate({ title, description });
  const canSubmit = Object.keys(errors).length === 0 && !busy;

  /**
   * Post announcement to the team alerts feed.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    setServerError("");
    try {
      const res = await fetch("/api/alerts/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (res.status === 401) {
        onSessionExpired?.();
        throw new Error(data.error || "Sign in required");
      }
      if (!res.ok) throw new Error(data.error || "Could not post announcement");
      onPosted(data);
      onClose();
    } catch (err) {
      setServerError(err?.message || "Could not post announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title="Team announcement"
      description="Everyone will see this in Alerts — one notice for the whole team."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            iconLeft="megaphone"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={busy}
            loadingLabel="Posting…"
          >
            Post announcement
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Title"
          error={submitted ? errors.title : undefined}
        >
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint demo moved to Friday"
            maxLength={MAX_TITLE}
            invalid={submitted && Boolean(errors.title)}
            autoFocus
          />
        </Field>

        <Field
          label="Message"
          error={submitted ? errors.description : undefined}
        >
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should the team know?"
            rows={4}
            maxLength={MAX_BODY}
            invalid={submitted && Boolean(errors.description)}
          />
        </Field>

        {user?.name && (
          <p className="text-xs text-ink-500">
            Announcement by <span className="font-semibold text-ink-700">{user.name}</span>
          </p>
        )}

        {serverError && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-sm font-medium text-danger-fg">
            <Icon name="alert-circle" size={15} className="mt-0.5 shrink-0" />
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
