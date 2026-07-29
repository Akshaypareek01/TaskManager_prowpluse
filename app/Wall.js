"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import TopBar from "./components/TopBar";
import StatCard from "./components/StatCard";
import Tabs from "./components/Tabs";
import Roster, { LowEffortAlert } from "./components/Roster";
import TodayTab from "./components/TodayTab";
import AlertsTab from "./components/AlertsTab";
import HistoryTab from "./components/HistoryTab";
import RankTab from "./components/RankTab";
import ReportsTab from "./components/ReportsTab";
import TaskComposer from "./components/TaskComposer";
import TaskDetailDrawer from "./components/TaskDetailDrawer";
import UserProfileDrawer from "./components/UserProfileDrawer";
import HourlyRoastBanner from "./components/HourlyRoastBanner";
import Icon from "./components/ui/Icon";
import Button from "./components/ui/Button";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { localDayStr } from "@/lib/dates";
import { getHourSlot } from "@/lib/hourlyJokes";
import { getDailyGreeting } from "@/lib/greetings";
import { staggerParent, tBase } from "@/lib/motion";
import { canViewHourlyJoke } from "@/lib/teamProfiles";

const POLL_MS = 20000;
const QUOTE_SEED_KEY = "prowplus-quote-seed";

/**
 * Persistent per-browser seed so guests get unique daily quotes.
 * @returns {string|null}
 */
function getOrCreateViewerSeed() {
  if (typeof window === "undefined") return null;
  try {
    let seed = localStorage.getItem(QUOTE_SEED_KEY);
    if (!seed) {
      seed = crypto.randomUUID();
      localStorage.setItem(QUOTE_SEED_KEY, seed);
    }
    return seed;
  } catch {
    return null;
  }
}

/**
 * "YYYY-MM-DD" -> "Monday, 28 July" without timezone drift.
 * @param {string} iso
 */
function longDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Root of the client app. Only job here is to own the toast host so every
 * screen below can report success and failure the same way.
 * @param {{ initialState: object }} props
 */
export default function Wall({ initialState }) {
  return (
    <ToastProvider>
      <WallShell initialState={initialState} />
    </ToastProvider>
  );
}

function WallShell({ initialState }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { toast } = useToast();

  const [state, setState] = useState(initialState);
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [filterId, setFilterId] = useState("all");
  const [now, setNow] = useState(() => Date.now());
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncError, setSyncError] = useState(false);
  const [clientSeed] = useState(getOrCreateViewerSeed);
  const inFlight = useRef(false);

  /* Clock — 1s tick drives the header time and relative timestamps. */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /** Reconcile client auth with the server session (handles expiry). */
  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401 || !data.user) {
        setUser(null);
        setComposerOpen(false);
        return;
      }
      setUser(data.user);
    } catch {
      /* Network blip — keep last known auth state. */
    }
  }, []);

  /**
   * Persist hourly roast opt-in/keywords and refresh local user state for Wall gating.
   * @param {{ allow?: boolean, keywords?: string[] }} prefs
   */
  const handleRoastPreferenceChange = useCallback(async (prefs) => {
    const res = await fetch("/api/auth/roast-preference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not update roast preference");
    }
    setUser(data.user);
  }, []);

  /** Load session on mount. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          if (res.status === 401 || !data.user) {
            setUser(null);
          } else {
            setUser(data.user);
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInHref = "/sign-in?returnUrl=%2F";

  /**
   * Whether the signed-in user may complete a given task.
   * @param {object} task
   * @returns {boolean}
   */
  const canCompleteTask = useCallback(
    (task) => Boolean(user?.memberId && task?.member?.id === user.memberId),
    [user]
  );

  /**
   * Open composer or redirect to sign-in when anonymous.
   */
  const openComposer = useCallback(() => {
    if (!user) {
      router.push(signInHref);
      return;
    }
    setComposerOpen(true);
  }, [user, router, signInHref]);

  /**
   * Clear local auth when the server session is gone (expired or revoked).
   */
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setComposerOpen(false);
    setProfileOpen(false);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
  }, []);

  /** Open read-only task detail drawer. */
  const openTaskDetail = useCallback((task) => {
    setSelectedTask(task);
  }, []);

  /** Close task detail drawer. */
  const closeTaskDetail = useCallback(() => {
    setSelectedTask(null);
  }, []);

  /** Open signed-in user profile drawer. */
  const openProfile = useCallback(() => {
    setProfileOpen(true);
  }, []);

  /** Close profile drawer. */
  const closeProfile = useCallback(() => {
    setProfileOpen(false);
  }, []);

  const handleTaskPosted = useCallback(
    (nextState, meta) => {
      setState(nextState);
      setLastSyncAt(Date.now());
      setSyncError(false);
      setComposerOpen(false);
      setTab("today");
      toast({
        tone: "success",
        title: "Task added",
        description: meta?.memberName ? `Posted for ${meta.memberName}.` : undefined,
      });
    },
    [toast]
  );

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (!silent) setRefreshing(true);
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        setState(await res.json());
        setLastSyncAt(Date.now());
        setSyncError(false);
      } catch {
        // Keep the last good state on screen; just flag that it may be stale.
        setSyncError(true);
      } finally {
        inFlight.current = false;
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const t = setInterval(() => {
      refresh({ silent: true });
      refreshAuth();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh, refreshAuth]);

  /* Pause-free catch-up: refetch as soon as the tab is looked at again. */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh({ silent: true });
        refreshAuth();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh, refreshAuth]);

  const completeTask = useCallback(
    async (taskId, startTime, endTime) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      const data = await res.json();
      if (res.status === 401) {
        handleSessionExpired();
        throw new Error(data.error || "Sign in required");
      }
      if (!res.ok) throw new Error(data.error || "Failed to complete task");
      setState(data);
      setLastSyncAt(Date.now());
      setSyncError(false);
      toast({
        tone: "success",
        title: "Task completed",
        description: "Nice — the wall has been updated.",
      });
    },
    [toast, handleSessionExpired]
  );

  const {
    stats,
    members,
    tasks,
    overdueTasks = [],
    backlogTasks = [],
    alerts,
    team,
    today,
    analytics,
  } = state;

  /** Refetch when the local calendar day rolls over (midnight). */
  useEffect(() => {
    const localToday = localDayStr(new Date(now));
    if (localToday !== today) {
      refresh({ silent: true });
    }
  }, [now, today, refresh]);

  const donePct = stats.totalToday > 0 ? (stats.completedToday / stats.totalToday) * 100 : 0;
  const checkedInPct = stats.totalMembers > 0 ? (stats.checkedInCount / stats.totalMembers) * 100 : 0;

  const filterName = useMemo(
    () => (filterId === "all" ? null : members.find((m) => m.id === filterId)?.name),
    [filterId, members]
  );

  /** Tab badge: unread alerts for the current filter (including all team). */
  const alertsTabCount = useMemo(() => {
    const unread = alerts.filter((a) => !a.read);
    if (filterId === "all") return unread.length;
    return unread.filter((a) => a.member?.id === filterId).length;
  }, [alerts, filterId]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return null;
    const secs = Math.floor((now - lastSyncAt) / 1000);
    if (secs < 45) return "just now";
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  }, [lastSyncAt, now]);

  /** Daily-stable greeting + quote; recomputes on hour boundary or auth change. */
  const dailyGreeting = useMemo(() => {
    const d = new Date(now);
    const firstName = user?.name?.trim().split(/\s+/)[0] || null;
    const viewerSeed = user?.id ?? clientSeed;
    return getDailyGreeting({
      now: d,
      userName: authLoaded ? firstName : null,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      memberId: user?.memberId ?? null,
      viewerSeed,
    });
  }, [now, user?.id, user?.name, user?.email, user?.memberId, authLoaded, clientSeed]);

  /** Changes once per IST hour — drives hourly joke refresh. */
  const hourSlotKey = useMemo(() => getHourSlot(new Date(now)).hourSlot, [
    getHourSlot(new Date(now)).hourSlot,
  ]);

  const mayViewHourlyJoke = authLoaded && Boolean(user) && canViewHourlyJoke(user);

  const tabs = [
    { key: "today", label: "Today", icon: "list-checks", count: stats.totalToday },
    {
      key: "alerts",
      label: "Alerts",
      icon: "bell",
      count: alertsTabCount,
      tone: alertsTabCount > 0 ? "danger" : "neutral",
    },
    { key: "history", label: "Analytics", icon: "activity" },
    { key: "rank", label: "Rank", icon: "trophy" },
    { key: "reports", label: "Reports", icon: "file-text" },
  ];

  return (
    <div className="min-h-screen">
      <TopBar
        now={now}
        onAddTask={openComposer}
        onRefresh={() => refresh()}
        refreshing={refreshing}
        lastSyncLabel={lastSyncLabel}
        user={authLoaded ? user : null}
        onOpenProfile={user ? openProfile : undefined}
      />

      <main id="main" className="mx-auto max-w-shell px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* Page heading */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-display-xs font-semibold">Today at a glance</h2>
            <p className="mt-1 text-[13px] text-ink-500" suppressHydrationWarning>
              {longDate(today)}
              {stats.totalToday > 0 && (
                <>
                  {" · "}
                  <span className="tabular-nums">
                    {stats.completedToday} of {stats.totalToday}
                  </span>{" "}
                  tasks completed
                </>
              )}
            </p>
            <aside
              className="relative mt-4 max-w-2xl rounded-r-lg border-l-2 border-brand-600 bg-gradient-to-r from-brand-50/50 to-transparent py-2 pl-3.5 pr-1 sm:py-2.5 sm:pl-4"
              aria-label={`${dailyGreeting.greeting}. ${dailyGreeting.quote}`}
            >
              <p className="text-[15px] font-semibold leading-snug text-ink" suppressHydrationWarning>
                <span className="mr-1.5 select-none" aria-hidden="true" suppressHydrationWarning>
                  {dailyGreeting.emoji}
                </span>
                {dailyGreeting.greeting}
              </p>
              <p className="mt-1.5 text-sm italic leading-relaxed text-ink-600" suppressHydrationWarning>
                {dailyGreeting.quote}
              </p>
            </aside>
            {mayViewHourlyJoke ? (
              <HourlyRoastBanner hourSlotKey={hourSlotKey} now={now} />
            ) : null}
          </div>
        </div>

        {/* Stale-data notice */}
        <AnimatePresence initial={false}>
          {syncError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={tBase}
              className="overflow-hidden"
            >
              <div
                role="status"
                className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3"
              >
                <Icon name="alert-triangle" size={16} className="text-warning-fg" />
                <p className="min-w-0 flex-1 text-[13px] font-medium text-warning-fg">
                  Live updates paused — showing the last data we loaded.
                </p>
                <Button size="sm" variant="secondary" iconLeft="refresh" onClick={() => refresh()}>
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI row */}
        <motion.div
          {...staggerParent(reduced)}
          className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <StatCard
            label="Completed today"
            count={stats.completedToday}
            sub={`of ${stats.totalToday}`}
            icon="check-circle"
            tone="success"
            progress={donePct}
            progressTone="success"
          />
          <StatCard
            label="Overdue"
            count={stats.overdueCount}
            sub={stats.overdueCount === 0 ? "all clear" : "needs attention"}
            icon="alert-triangle"
            tone={stats.overdueCount > 0 ? "danger" : "neutral"}
          />
          <StatCard
            label="Checked in"
            count={stats.checkedInCount}
            sub={`of ${stats.totalMembers} people`}
            icon="users"
            tone="brand"
            progress={checkedInPct}
          />
          <StatCard
            label="Last 7 days"
            count={analytics?.completionRate ?? 0}
            suffix="%"
            sub={analytics?.avgDurationLabel ? `avg ${analytics.avgDurationLabel}` : "completion"}
            icon="trending-up"
            tone="brand"
          />
        </motion.div>

        {/* Team check-in */}
        <section className="panel mb-5" aria-labelledby="checkin-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              <div className="flex items-baseline gap-2">
                <h2 id="checkin-heading" className="section-title">
                  Team check-in
                </h2>
                <span className="meta tabular-nums">
                  {stats.checkedInCount}/{stats.totalMembers} checked in today
                </span>
              </div>
              <LowEffortAlert members={members} now={now} />
            </div>
            {filterId !== "all" && (
              <Button variant="link" iconLeft="x" onClick={() => setFilterId("all")}>
                Clear filter
              </Button>
            )}
          </div>
          <div className="px-4 py-3.5 sm:px-5">
            <Roster
              members={members}
              filterId={filterId}
              now={now}
              onFilter={(id) => {
                setFilterId(id);
                if (tab !== "history" && tab !== "rank" && tab !== "alerts" && tab !== "reports") setTab("today");
              }}
            />
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {filterId !== "all" && (
            <span className="badge badge-brand">
              <Icon name="filter" size={11} />
              Filtered: {filterName}
            </span>
          )}
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={-1}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -4 }}
            transition={tBase}
          >
            {tab === "today" && (
              <TodayTab
                tasks={tasks}
                overdueTasks={overdueTasks}
                backlogTasks={backlogTasks}
                overdueTotal={stats.overdueTotal ?? stats.overdueCount}
                backlogTotal={stats.backlogTotal ?? stats.backlogCount}
                filterId={filterId}
                filterName={filterName}
                onComplete={completeTask}
                onAddTask={openComposer}
                onClearFilter={() => setFilterId("all")}
                canCompleteTask={canCompleteTask}
                signInHref={signInHref}
                isAuthenticated={Boolean(user)}
                onViewTask={openTaskDetail}
              />
            )}
            {tab === "alerts" && (
              <AlertsTab
                alerts={alerts}
                now={now}
                filterId={filterId}
                filterName={filterName}
                tasks={[...overdueTasks, ...backlogTasks, ...tasks]}
                onComplete={completeTask}
                onGoToday={() => setTab("today")}
                onClearFilter={() => setFilterId("all")}
                canCompleteTask={canCompleteTask}
                signInHref={signInHref}
                isAuthenticated={Boolean(user)}
                onAlertsRead={() => refresh({ silent: true })}
              />
            )}
            {tab === "history" && (
              <HistoryTab
                team={team}
                filterId={filterId}
                today={today}
                onFilterChange={setFilterId}
                onViewTask={openTaskDetail}
              />
            )}
            {tab === "rank" && <RankTab today={today} />}
            {tab === "reports" && <ReportsTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <TaskComposer
        team={team}
        today={today}
        open={composerOpen}
        onClose={closeComposer}
        lockedMemberId={user?.memberId ?? null}
        onSessionExpired={handleSessionExpired}
        onPosted={handleTaskPosted}
      />

      <TaskDetailDrawer
        open={Boolean(selectedTask)}
        task={selectedTask}
        onClose={closeTaskDetail}
      />

      <UserProfileDrawer
        open={profileOpen && Boolean(user)}
        user={user}
        onClose={closeProfile}
        onRoastPreferenceChange={user ? handleRoastPreferenceChange : undefined}
      />
    </div>
  );
}
