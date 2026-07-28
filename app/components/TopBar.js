"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import { tFast } from "@/lib/motion";

/**
 * Application header: identity on the left, live clock and the primary action
 * on the right. Sticky, so "New task" is always one click away.
 *
 * The clock renders only after mount (a fixed-width placeholder holds its
 * space) — server and client clocks differ, and a mismatch there would either
 * warn in the console or shift the layout.
 *
 * @param {object} props
 * @param {number} props.now - epoch ms, ticked by the parent
 * @param {() => void} props.onAddTask
 * @param {() => void} props.onRefresh
 * @param {boolean} props.refreshing
 * @param {string} [props.lastSyncLabel]
 * @param {object|null} [props.user]
 */
export default function TopBar({
  now,
  onAddTask,
  onRefresh,
  refreshing,
  lastSyncLabel,
  user = null,
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const d = new Date(now);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  const date = d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-shell items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
        {/* Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="https://prowplus.ai/pp_icons.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg border border-line bg-surface object-contain p-1"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight">Impact Wall</h1>
            <p className="hidden truncate text-2xs text-ink-500 sm:block">
              PROWPLUS · daily team tasks
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {/* Live clock */}
          <div className="hidden text-right sm:block" aria-live="off">
            {mounted ? (
              <>
                <div className="text-[15px] font-semibold leading-tight tabular-nums text-ink">
                  {time}
                </div>
                <div className="text-2xs leading-tight text-ink-500">{date}</div>
              </>
            ) : (
              <div className="h-[30px] w-20" aria-hidden="true" />
            )}
          </div>

          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />

          {/* Sync state */}
          <button
            type="button"
            onClick={onRefresh}
            title={lastSyncLabel ? `Updated ${lastSyncLabel} — click to refresh` : "Refresh"}
            aria-label={lastSyncLabel ? `Updated ${lastSyncLabel}. Refresh now` : "Refresh"}
            className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-2xs font-medium text-ink-500 transition-colors duration-fast hover:bg-surface-sunken hover:text-ink-700 md:inline-flex"
          >
            <motion.span
              animate={refreshing && !reduced ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : tFast}
              className="grid place-items-center"
            >
              <Icon name="refresh" size={13} />
            </motion.span>
            {refreshing ? "Syncing" : lastSyncLabel || "Live"}
          </button>

          <Button variant="primary" iconLeft="plus" onClick={onAddTask} className="hidden sm:inline-flex">
            New task
          </Button>
          <Button
            variant="primary"
            size="icon"
            iconLeft="plus"
            onClick={onAddTask}
            aria-label="Add a new task"
            className="sm:hidden"
          />

          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />

          {user ? (
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-ink-700 sm:inline">
              {user.name}
            </span>
          ) : (
            <>
              <Link href="/sign-in" className="btn btn-secondary btn-sm hidden sm:inline-flex">
                Sign in
              </Link>
              <Link
                href="/sign-in"
                className="btn btn-secondary btn-icon sm:hidden"
                aria-label="Sign in"
              >
                <Icon name="user" size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
