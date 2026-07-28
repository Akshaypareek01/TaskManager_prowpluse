"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";
import { tBase } from "@/lib/motion";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: "check-circle", ring: "bg-success-bg text-success-fg", bar: "bg-success-solid" },
  error: { icon: "alert-circle", ring: "bg-danger-bg text-danger-fg", bar: "bg-danger-solid" },
  info: { icon: "sparkle", ring: "bg-info-bg text-info-fg", bar: "bg-brand-600" },
};

const DEFAULT_MS = 4000;

/**
 * Toast host. Wrap the client tree once; call `useToast()` anywhere below.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map());

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "info", duration = DEFAULT_MS }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((list) => [...list.slice(-2), { id, title, description, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && createPortal(<Toaster toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

/**
 * @returns {{ toast: (t: {title: string, description?: string, tone?: "success"|"error"|"info", duration?: number}) => string, dismiss: (id: string) => void }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function Toaster({ toasts, onDismiss }) {
  const reduced = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              role="status"
              aria-live="polite"
              className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface p-3.5 pr-10 shadow-lg"
              initial={{ opacity: 0, y: reduced ? 0 : 12, scale: reduced ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.98, transition: { duration: 0.15 } }}
              transition={tBase}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} aria-hidden="true" />
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone.ring}`}>
                <Icon name={tone.icon} size={15} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-semibold leading-snug text-ink">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs leading-snug text-ink-500">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-ink-400 transition-colors duration-fast hover:bg-surface-sunken hover:text-ink-600"
              >
                <Icon name="x" size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
