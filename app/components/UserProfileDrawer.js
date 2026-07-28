"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";
import Button from "./ui/Button";
import { tBase, tFast } from "@/lib/motion";
import { MAX_KEYWORD_LENGTH, MAX_ROAST_KEYWORDS, normalizeRoastKeywords } from "@/lib/roastKeywords";
import { initials } from "@/lib/team";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Opt-in switch for hourly roast visibility and targeting.
 * @param {object} props
 * @param {boolean} props.checked
 * @param {boolean} [props.disabled]
 * @param {(allow: boolean) => void} props.onChange
 */
function RoastPreferenceToggle({ checked, disabled = false, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Hourly roast participation"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-solid/40 disabled:opacity-50 ${
        checked ? "bg-success-solid" : "bg-ink-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-fast ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/**
 * Chip list editor for roast personality keywords.
 * @param {object} props
 * @param {string[]} props.keywords
 * @param {boolean} [props.disabled]
 * @param {(keywords: string[]) => void} props.onChange
 */
function RoastKeywordsEditor({ keywords, disabled = false, onChange }) {
  const [draft, setDraft] = useState("");

  /**
   * Add the draft keyword when valid and under the max count.
   */
  function handleAddKeyword() {
    const trimmed = draft.trim();
    if (!trimmed || keywords.length >= MAX_ROAST_KEYWORDS) return;

    const next = normalizeRoastKeywords([...keywords, trimmed]);
    if (next.length === keywords.length) {
      setDraft("");
      return;
    }

    onChange(next);
    setDraft("");
  }

  /**
   * Remove a keyword by index.
   * @param {number} index
   */
  function handleRemoveKeyword(index) {
    onChange(keywords.filter((_, i) => i !== index));
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label htmlFor="roast-keywords-input" className="text-sm font-medium text-ink">
        Your roast keywords
      </label>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
        Add up to {MAX_ROAST_KEYWORDS} traits used when you are the joke target. At least one
        keyword is required to view roasts.
      </p>

      {keywords.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Saved roast keywords">
          {keywords.map((keyword, index) => (
            <li key={keyword}>
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink">
                {keyword}
                <button
                  type="button"
                  className="rounded-full p-0.5 text-ink-400 transition-colors hover:text-ink disabled:opacity-50"
                  aria-label={`Remove keyword ${keyword}`}
                  disabled={disabled}
                  onClick={() => handleRemoveKeyword(index)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {keywords.length < MAX_ROAST_KEYWORDS ? (
        <div className="mt-3 flex gap-2">
          <input
            id="roast-keywords-input"
            type="text"
            value={draft}
            maxLength={MAX_KEYWORD_LENGTH}
            disabled={disabled}
            placeholder="cool, helps everyone, coffee addict"
            aria-describedby="roast-keywords-hint"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddKeyword();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || !draft.trim()}
            onClick={handleAddKeyword}
          >
            Add
          </Button>
        </div>
      ) : null}

      <p id="roast-keywords-hint" className="mt-2 text-xs text-ink-400">
        {keywords.length}/{MAX_ROAST_KEYWORDS} keywords
      </p>
    </div>
  );
}

/**
 * Right-side drawer with signed-in user details and hourly roast preference.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.user - Session user from /api/auth/me
 * @param {() => void} props.onClose
 * @param {(prefs: { allow?: boolean, keywords?: string[] }) => void|Promise<void>} [props.onRoastPreferenceChange]
 */
export default function UserProfileDrawer({
  open,
  user,
  onClose,
  onRoastPreferenceChange,
}) {
  const reduced = useReducedMotion();
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const onRoastPreferenceChangeRef = useRef(onRoastPreferenceChange);
  const [mounted, setMounted] = useState(false);
  const [roastSaving, setRoastSaving] = useState(false);
  const [roastChecked, setRoastChecked] = useState(Boolean(user?.allowHourlyRoast));
  const [keywords, setKeywords] = useState(() => normalizeRoastKeywords(user?.roastKeywords ?? []));
  const [keywordsDirty, setKeywordsDirty] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onRoastPreferenceChangeRef.current = onRoastPreferenceChange;
  }, [onRoastPreferenceChange]);

  useEffect(() => {
    setRoastChecked(Boolean(user?.allowHourlyRoast));
    setKeywords(normalizeRoastKeywords(user?.roastKeywords ?? []));
    setKeywordsDirty(false);
  }, [user?.allowHourlyRoast, user?.roastKeywords, user?.id]);

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

  /**
   * Persist roast settings with optimistic UI and rollback on failure.
   * @param {{ allow?: boolean, keywords?: string[] }} prefs
   * @param {{ previousAllow?: boolean, previousKeywords?: string[] }} rollback
   */
  async function persistRoastSettings(prefs, rollback = {}) {
    const previousAllow = rollback.previousAllow ?? roastChecked;
    const previousKeywords = rollback.previousKeywords ?? keywords;

    if (prefs.allow !== undefined) setRoastChecked(prefs.allow);
    if (prefs.keywords !== undefined) {
      setKeywords(normalizeRoastKeywords(prefs.keywords));
      setKeywordsDirty(false);
    }

    setRoastSaving(true);
    try {
      await onRoastPreferenceChangeRef.current?.(prefs);
    } catch {
      setRoastChecked(previousAllow);
      setKeywords(previousKeywords);
      setKeywordsDirty(false);
    } finally {
      setRoastSaving(false);
    }
  }

  /**
   * Toggle roast participation.
   * @param {boolean} allow
   */
  async function handleRoastToggle(allow) {
    await persistRoastSettings(
      { allow, keywords },
      { previousAllow: roastChecked, previousKeywords: keywords }
    );
  }

  /**
   * Save edited keywords while keeping the current toggle state.
   */
  async function handleSaveKeywords() {
    await persistRoastSettings(
      { allow: roastChecked, keywords },
      { previousAllow: roastChecked, previousKeywords: keywords }
    );
  }

  /**
   * Track local keyword edits before save.
   * @param {string[]} next
   */
  function handleKeywordsChange(next) {
    const normalized = normalizeRoastKeywords(next);
    setKeywords(normalized);
    setKeywordsDirty(
      JSON.stringify(normalized) !== JSON.stringify(normalizeRoastKeywords(user?.roastKeywords ?? []))
    );
  }

  if (!mounted) return null;

  const avatarMember = user
    ? {
        name: user.name,
        color: user.member?.color || "#667085",
        initials: user.member?.initials ?? initials(user.name),
      }
    : null;

  return createPortal(
    <AnimatePresence>
      {open && user && (
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
            aria-labelledby="profile-drawer-title"
            aria-describedby="profile-drawer-description"
            tabIndex={-1}
            className="relative flex h-full max-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-line bg-surface shadow-2xl"
            initial={{ x: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            transition={tBase}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <p id="profile-drawer-description" className="eyebrow">
                  Your profile
                </p>
                <h2
                  id="profile-drawer-title"
                  className="mt-1 break-words text-base font-semibold leading-snug text-ink"
                >
                  Account
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 -mt-1 h-8 w-8 shrink-0"
                onClick={requestClose}
                iconLeft="x"
                aria-label="Close profile"
              />
            </header>

            <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="flex items-center gap-3">
                {avatarMember ? (
                  <Avatar member={avatarMember} size="lg" ring={false} />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-ink">{user.name}</p>
                  <p className="mt-0.5 truncate text-sm text-ink-500">{user.email}</p>
                </div>
              </div>

              {onRoastPreferenceChange ? (
                <section
                  className="mt-6 rounded-xl border border-line bg-surface-sunken/60 p-4"
                  aria-labelledby="roast-preference-heading"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3
                        id="roast-preference-heading"
                        className="text-sm font-semibold text-ink"
                      >
                        Hourly roast
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
                        Opt in to see and participate in hourly team roasts.
                      </p>
                    </div>
                    <RoastPreferenceToggle
                      checked={roastChecked}
                      disabled={roastSaving}
                      onChange={handleRoastToggle}
                    />
                  </div>

                  {roastChecked ? (
                    <>
                      <RoastKeywordsEditor
                        keywords={keywords}
                        disabled={roastSaving}
                        onChange={handleKeywordsChange}
                      />
                      {keywordsDirty ? (
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={roastSaving}
                            onClick={handleSaveKeywords}
                          >
                            Save keywords
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </section>
              ) : null}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
