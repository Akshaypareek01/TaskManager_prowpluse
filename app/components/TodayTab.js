"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import TaskCard from "./TaskCard";
import EmptyState from "./ui/EmptyState";
import { riseItem, staggerParent, tBase } from "@/lib/motion";

/**
 * @param {object[]} list
 * @param {string} filterId
 * @returns {object[]}
 */
function filterByMember(list, filterId) {
  if (filterId === "all") return list;
  return list.filter((t) => t.member.id === filterId);
}

/**
 * Group heading with a status dot and a count.
 */
function GroupHeading({ dot, title, count, description }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        {title}
      </h3>
      <span className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-ink-600">
        {count}
      </span>
      {description && <span className="meta">{description}</span>}
    </div>
  );
}

/**
 * Today's board: overdue work first (it is the thing that needs a decision),
 * then open tasks, then what's already done.
 *
 * @param {object} props
 * @param {object[]} props.tasks
 * @param {object[]} [props.overdueTasks]
 * @param {object[]} [props.backlogTasks]
 * @param {number} [props.overdueTotal]
 * @param {number} [props.backlogTotal]
 * @param {string} props.filterId
 * @param {string} [props.filterName]
 * @param {Function} props.onComplete
 * @param {() => void} props.onAddTask
 * @param {() => void} props.onClearFilter
 * @param {(task: object) => void} [props.onViewTask]
 */
export default function TodayTab({
  tasks,
  overdueTasks = [],
  backlogTasks = [],
  overdueTotal,
  backlogTotal,
  filterId,
  filterName,
  onComplete,
  onAddTask,
  onClearFilter,
  canCompleteTask,
  signInHref = "/sign-in",
  isAuthenticated = false,
  onViewTask,
}) {
  const reduced = useReducedMotion();

  const groups = useMemo(() => {
    const todays = filterByMember(tasks, filterId);
    return {
      overdue: filterByMember(overdueTasks, filterId),
      backlog: filterByMember(backlogTasks, filterId),
      open: todays.filter((t) => t.status !== "completed"),
      done: todays.filter((t) => t.status === "completed"),
    };
  }, [tasks, overdueTasks, backlogTasks, filterId]);

  const total =
    groups.overdue.length +
    groups.backlog.length +
    groups.open.length +
    groups.done.length;
  const overdueShown = groups.overdue.length;
  const backlogShown = groups.backlog.length;
  const overdueTruncated =
    overdueTotal != null && overdueTotal > overdueShown && filterId === "all";
  const backlogTruncated =
    backlogTotal != null && backlogTotal > backlogShown && filterId === "all";

  if (total === 0) {
    return (
      <div className="panel">
        {filterId === "all" ? (
          <EmptyState
            icon="list-checks"
            title="Nothing on the wall yet today"
            description="Post what you're working on so the rest of the team can see today's impact."
            action={{ label: "Add the first task", onClick: onAddTask, icon: "plus", variant: "primary" }}
          />
        ) : (
          <EmptyState
            icon="search"
            title={`No tasks for ${filterName || "this person"} today`}
            description="They haven't posted anything for today yet. Try another person or view the whole team."
            action={{ label: "Show all team", onClick: onClearFilter, icon: "users" }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <TaskGroup
        show={groups.overdue.length > 0}
        heading={
          <GroupHeading
            dot="bg-danger-solid"
            title="Overdue"
            count={overdueShown}
            description={
              overdueTruncated
                ? `Showing ${overdueShown} of ${overdueTotal} — last 30 days`
                : "Carried over from earlier days — can still be completed"
            }
          />
        }
        tasks={groups.overdue}
        onComplete={onComplete}
        reduced={reduced}
        canCompleteTask={canCompleteTask}
        signInHref={signInHref}
        isAuthenticated={isAuthenticated}
        onViewTask={onViewTask}
      />

      <TaskGroup
        show={groups.backlog.length > 0}
        heading={
          <GroupHeading
            dot="bg-warning-solid"
            title="Backlog"
            count={backlogShown}
            description={
              backlogTruncated
                ? `Showing ${backlogShown} of ${backlogTotal} — last 30 days`
                : "More than 3 days late — still completable for history"
            }
          />
        }
        tasks={groups.backlog}
        onComplete={onComplete}
        reduced={reduced}
        canCompleteTask={canCompleteTask}
        signInHref={signInHref}
        isAuthenticated={isAuthenticated}
        onViewTask={onViewTask}
      />

      <TaskGroup
        show={groups.open.length > 0}
        heading={<GroupHeading dot="bg-brand-600" title="Open today" count={groups.open.length} />}
        tasks={groups.open}
        onComplete={onComplete}
        reduced={reduced}
        canCompleteTask={canCompleteTask}
        signInHref={signInHref}
        isAuthenticated={isAuthenticated}
        onViewTask={onViewTask}
      />

      <TaskGroup
        show={groups.done.length > 0}
        heading={
          <GroupHeading dot="bg-success-solid" title="Completed today" count={groups.done.length} />
        }
        tasks={groups.done}
        onComplete={onComplete}
        reduced={reduced}
        canCompleteTask={canCompleteTask}
        signInHref={signInHref}
        isAuthenticated={isAuthenticated}
        onViewTask={onViewTask}
      />
    </div>
  );
}

function TaskGroup({
  show,
  heading,
  tasks,
  onComplete,
  reduced,
  canCompleteTask,
  signInHref,
  isAuthenticated,
  onViewTask,
}) {
  if (!show) return null;

  return (
    <section>
      {heading}
      <motion.div
        {...staggerParent(reduced)}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              {...riseItem(reduced)}
              layout={!reduced}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.97, transition: { duration: 0.15 } }}
              transition={tBase}
            >
              <TaskCard
                task={task}
                onComplete={onComplete}
                canComplete={canCompleteTask ? canCompleteTask(task) : false}
                isAuthenticated={isAuthenticated}
                signInHref={signInHref}
                onView={onViewTask ? () => onViewTask(task) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
