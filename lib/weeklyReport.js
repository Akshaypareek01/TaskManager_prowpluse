import { addDays, localDayStr, parseLocalDay } from "./dates.js";
import { taskDurationMs, formatDurationMs } from "./analytics.js";
import { memberTaskCounts } from "./alerts.js";
import { isBossMember } from "./members.js";
import {
  detectTaskInflation,
  deriveMemberInsights,
  mergeInsightLines,
} from "./reportInsights.js";

/** Local hour when weekly reports auto-generate (Monday). */
export const REPORT_GENERATION_HOUR = 9;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

/** Weekday indices for Mon–Fri check-in tracking (local getDay: 0=Sun). */
const WEEKDAYS = [1, 2, 3, 4, 5];

const SYSTEM_PROMPT = `You are a CEO/startup founder reviewing the team's weekly Impact Wall — like a sharp but fair manager giving direct feedback. Tone: motivational, constructive, specific, Hinglish OK. Never cruel or HR-worthy.

You MUST:
- Call out genuine high performers with specific task titles and hours
- Give clear improvement lines for underperformers
- WARN anyone flagged with "taskInflation" — they may be splitting one project into many similar tasks (e.g. "UI feature dashboard" then "UI feature users section") to inflate task counts. Tell them to use ONE main task + notes instead
- Reference actual task titles from the data

Return JSON only:
{
  "summary": "2-3 sentence team overview (CEO lens)",
  "teamSummary": "1 punchy headline for the week",
  "ceoNote": "2-3 sentences: what went well org-wide, what to fix next week",
  "members": [
    {
      "memberId": "same as input",
      "feedback": "2-4 sentences manager feedback — performance, punctuality, energy",
      "motivation": "1 short motivational line",
      "energyLevel": "high" | "medium" | "low" | "needs-energy",
      "strengths": ["1-2 specific wins"],
      "improvements": ["1-2 specific fixes"],
      "warning": "null OR direct warning about task inflation if flagged"
    }
  ]
}

Include every member. Boss/lead gets respectful appreciation, not low-effort shaming.`;

/**
 * Days from Monday for a local calendar date (Mon=0 … Sun=6).
 * @param {Date} d
 * @returns {number}
 */
export function daysFromMonday(d) {
  return (d.getDay() + 6) % 7;
}

/**
 * Monday–Sunday bounds for the week containing `date`.
 * @param {Date|string} date - Date instance or YYYY-MM-DD
 * @returns {{ weekStart: string, weekEnd: string }}
 */
export function getWeekBounds(date) {
  const d =
    typeof date === "string" ? parseLocalDay(date) : new Date(date.getTime());
  d.setHours(12, 0, 0, 0);
  const weekStart = addDays(localDayStr(d), -daysFromMonday(d));
  const weekEnd = addDays(weekStart, 6);
  return { weekStart, weekEnd };
}

/**
 * Bounds for the calendar week immediately before the week containing `date`.
 * @param {Date|string} [date]
 * @returns {{ weekStart: string, weekEnd: string }}
 */
export function getPreviousWeekBounds(date = new Date()) {
  const { weekStart } = getWeekBounds(date);
  const prevStart = addDays(weekStart, -7);
  return { weekStart: prevStart, weekEnd: addDays(prevStart, 6) };
}

/**
 * List YYYY-MM-DD strings for Mon–Fri within a week range.
 * @param {string} weekStart
 * @param {string} weekEnd
 * @returns {string[]}
 */
export function getWeekdayDates(weekStart, weekEnd) {
  const days = [];
  let cursor = weekStart;
  while (cursor <= weekEnd) {
    const dow = parseLocalDay(cursor).getDay();
    if (WEEKDAYS.includes(dow)) days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * Derive check-in punctuality label from weekday attendance.
 * @param {number} checkedInDays
 * @param {number} expectedDays
 * @returns {"excellent"|"good"|"fair"|"needs-improvement"}
 */
export function deriveCheckInStatus(checkedInDays, expectedDays) {
  if (expectedDays <= 0) return "good";
  const ratio = checkedInDays / expectedDays;
  if (ratio >= 0.9) return "excellent";
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.5) return "fair";
  return "needs-improvement";
}

/**
 * Whether a member checked in on a given day (task due that day).
 * @param {object[]} memberTasks
 * @param {string} day
 * @returns {boolean}
 */
function checkedInOnDay(memberTasks, day) {
  return memberTasks.some((t) => String(t.dueDate) === day);
}

/**
 * Aggregate weekly stats per team member from raw task rows.
 * @param {object[]} tasks - DB task rows
 * @param {object[]} members - registered roster members
 * @param {string} weekStart - YYYY-MM-DD (Monday)
 * @param {string} weekEnd - YYYY-MM-DD (Sunday)
 * @returns {{ weekStart: string, weekEnd: string, members: object[] }}
 */
export function aggregateWeekStats(tasks, members, weekStart, weekEnd) {
  const weekdays = getWeekdayDates(weekStart, weekEnd);
  const expectedDays = weekdays.length;
  const weekTasks = tasks.filter((t) => {
    const due = String(t.dueDate);
    return due >= weekStart && due <= weekEnd;
  });

  const memberStats = members.map((m) => {
    const mine = weekTasks.filter((t) => t.memberId === m.id);
    const completed = mine.filter((t) => t.status === "completed");
    const pending = mine.filter((t) => t.status !== "completed");
    const workingHoursMs = completed.reduce((sum, t) => {
      const ms = taskDurationMs(t);
      return sum + (ms != null && ms > 0 ? ms : 0);
    }, 0);

    const checkedInDays = weekdays.filter((day) =>
      checkedInOnDay(mine, day)
    ).length;

    const checkInStatus = deriveCheckInStatus(checkedInDays, expectedDays);
    const taskTitles = mine.map((t) => t.title).slice(0, 20);
    const avgDurationMs =
      completed.length > 0
        ? Math.round(workingHoursMs / completed.length)
        : null;

    const isBoss = isBossMember(m);
    const isInactive =
      !isBoss &&
      mine.length === 0 &&
      workingHoursMs === 0 &&
      checkedInDays === 0;

    const taskInflation = detectTaskInflation(mine.map((t) => t.title || ""));
    const insights = deriveMemberInsights(
      {
        isBoss,
        isInactive,
        completedCount: completed.length,
        completionRate:
          mine.length > 0
            ? Math.round((completed.length / mine.length) * 100)
            : 0,
        workingHoursMs,
        workingHoursLabel: formatDurationMs(workingHoursMs) || "0m",
        checkInStatus,
        checkInDays: checkedInDays,
        checkInExpectedDays: expectedDays,
        tasksCount: mine.length,
        pendingCount: pending.length,
        avgDurationMs,
      },
      taskInflation
    );

    return {
      memberId: m.id,
      name: m.name,
      color: m.color,
      initials: m.initials,
      isBoss,
      tasksCount: mine.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      overdueCount: pending.filter((t) => String(t.dueDate) < weekEnd).length,
      workingHoursMs,
      workingHoursLabel: formatDurationMs(workingHoursMs) || "0m",
      avgDurationMs,
      avgDurationLabel: formatDurationMs(avgDurationMs),
      checkInStatus,
      checkInDays: checkedInDays,
      checkInExpectedDays: expectedDays,
      taskTitles,
      completionRate:
        mine.length > 0
          ? Math.round((completed.length / mine.length) * 100)
          : 0,
      isInactive,
      taskInflation,
      strengths: insights.strengths,
      improvements: insights.improvements,
      warning: insights.warning,
    };
  });

  return { weekStart, weekEnd, members: memberStats };
}

/**
 * Build OpenAI user prompt from aggregated stats.
 * @param {{ weekStart: string, weekEnd: string, members: object[] }} stats
 * @returns {string}
 */
export function buildWeeklyReportPrompt(stats) {
  const lines = stats.members.map((m) => {
    const titles =
      m.taskTitles.length > 0
        ? m.taskTitles.slice(0, 8).join("; ")
        : "no tasks posted";
    return [
      `- ${m.name} (id: ${m.memberId})`,
      `  tasks: ${m.tasksCount} total, ${m.completedCount} done, ${m.pendingCount} pending`,
      `  hours: ${m.workingHoursLabel}, completion ${m.completionRate}%`,
      `  check-in: ${m.checkInDays}/${m.checkInExpectedDays} weekdays (${m.checkInStatus})`,
      `  titles: ${titles}`,
      m.taskInflation?.flagged
        ? `  ⚠ task inflation suspected (score ${m.taskInflation.score}): ${m.taskInflation.summary}`
        : "",
      m.isInactive ? "  flag: low activity / needs energy" : "",
      m.isBoss ? "  note: team lead — keep respectful" : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `Write the weekly team report for ${stats.weekStart} to ${stats.weekEnd}.

Team member stats:
${lines.join("\n")}

Be specific about task titles and hours. Praise real performers with clear strengths. For task inflation flags, give a direct but fair warning to consolidate work. Give actionable improvements for anyone struggling.`;
}

/**
 * Sleep helper for retry backoff.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse OpenAI JSON into report content fields.
 * @param {string} raw
 * @param {{ weekStart: string, weekEnd: string, members: object[] }} stats
 * @returns {object|null}
 */
export function parseReportResponse(raw, stats) {
  try {
    const parsed = JSON.parse(raw);
    const aiMembers = Array.isArray(parsed?.members) ? parsed.members : [];
    const byId = Object.fromEntries(aiMembers.map((m) => [m.memberId, m]));

    const members = stats.members.map((m) => {
      const ai = byId[m.memberId] || {};
      const aiStrengths = Array.isArray(ai.strengths) ? ai.strengths.map(String) : [];
      const aiImprovements = Array.isArray(ai.improvements) ? ai.improvements.map(String) : [];
      const warning =
        String(ai.warning || "").trim() || m.warning || null;

      return {
        memberId: m.memberId,
        name: m.name,
        color: m.color,
        initials: m.initials,
        tasksCount: m.tasksCount,
        completedCount: m.completedCount,
        pendingCount: m.pendingCount,
        workingHoursMs: m.workingHoursMs,
        workingHoursLabel: m.workingHoursLabel,
        checkInStatus: m.checkInStatus,
        checkInDays: m.checkInDays,
        checkInExpectedDays: m.checkInExpectedDays,
        taskTitles: m.taskTitles,
        completionRate: m.completionRate,
        taskInflation: m.taskInflation,
        feedback: String(ai.feedback || buildFallbackFeedback(m)).trim(),
        motivation: String(ai.motivation || "Keep showing up — consistency wins.").trim(),
        energyLevel: validateEnergyLevel(ai.energyLevel, m),
        strengths: mergeInsightLines(aiStrengths, m.strengths),
        improvements: mergeInsightLines(aiImprovements, m.improvements),
        warning,
      };
    });

    return {
      summary: String(parsed?.summary || buildFallbackSummary(stats)).trim(),
      teamSummary: String(
        parsed?.teamSummary || "Another week in the books — let's keep the momentum."
      ).trim(),
      ceoNote: String(
        parsed?.ceoNote ||
          "Solid week overall — double down on what worked and tighten up where we slipped."
      ).trim(),
      members,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string|undefined} level
 * @param {object} memberStats
 * @returns {"high"|"medium"|"low"|"needs-energy"}
 */
function validateEnergyLevel(level, memberStats) {
  const valid = ["high", "medium", "low", "needs-energy"];
  if (valid.includes(level)) return level;
  if (memberStats.isInactive || memberStats.checkInDays <= 1) return "needs-energy";
  if (memberStats.completionRate >= 80 && memberStats.workingHoursMs > 0) return "high";
  if (memberStats.tasksCount === 0) return "low";
  return "medium";
}

/**
 * Deterministic fallback feedback when OpenAI is unavailable.
 * @param {object} m
 * @returns {string}
 */
function buildFallbackFeedback(m) {
  if (m.isBoss) {
    return `${m.name}, thanks for keeping the ship steady this week — ${m.completedCount} tasks closed and the team felt your presence.`;
  }
  if (m.warning) {
    return `${m.name}, your output numbers look high but several tasks appear to be the same work split up — consolidate into one main task and use notes for details. Quality over quantity on the wall.`;
  }
  if (m.isInactive) {
    return `${m.name}, quiet week on the wall — next week let's get at least one task posted early and build from there.`;
  }
  const titles =
    m.taskTitles.length > 0 ? ` Highlights: ${m.taskTitles.slice(0, 3).join(", ")}.` : "";
  return `${m.name} logged ${m.workingHoursLabel} across ${m.tasksCount} tasks (${m.completionRate}% done). Check-in ${m.checkInDays}/${m.checkInExpectedDays} weekdays.${titles}`;
}

/**
 * @param {{ members: object[] }} stats
 * @returns {string}
 */
function buildFallbackSummary(stats) {
  const active = stats.members.filter((m) => m.tasksCount > 0).length;
  const total = stats.members.length;
  return `Team posted tasks on the wall — ${active} of ${total} members were active this week. Solid effort overall; let's push completion rates up next week.`;
}

/**
 * Call OpenAI gpt-4o-mini to generate structured weekly report content.
 * @param {string} apiKey
 * @param {{ weekStart: string, weekEnd: string, members: object[] }} stats
 * @returns {Promise<object|null>}
 */
export async function generateWeeklyReportWithOpenAI(apiKey, stats) {
  if (!apiKey?.trim()) return null;

  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.75,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildWeeklyReportPrompt(stats) },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        lastError = new Error(`OpenAI HTTP ${res.status}`);
        await delay(500 * 2 ** attempt);
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error("Empty OpenAI response");
        await delay(500 * 2 ** attempt);
        continue;
      }

      const parsed = parseReportResponse(content, stats);
      if (parsed) return parsed;
      lastError = new Error("Invalid report JSON");
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < MAX_RETRIES - 1) {
      await delay(500 * 2 ** attempt);
    }
  }

  if (lastError) {
    console.error("[weeklyReport] OpenAI failed:", lastError.message);
  }
  return null;
}

/**
 * Build report content with AI or deterministic fallback.
 * @param {{ weekStart: string, weekEnd: string, members: object[] }} stats
 * @param {string|null} [apiKey]
 * @returns {Promise<object>}
 */
export async function generateWeeklyReportContent(stats, apiKey = null) {
  const key = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  const ai = await generateWeeklyReportWithOpenAI(key, stats);
  if (ai) return ai;
  return parseReportResponse("{}", stats);
}

/**
 * Next Monday 9:00 AM local time (when the next report generates).
 * @param {Date} [now]
 * @returns {Date}
 */
export function getNextReportDate(now = new Date()) {
  const d = new Date(now.getTime());
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;

  const next = new Date(d);
  if (day === 1) {
    const mondayNine = new Date(d);
    mondayNine.setHours(REPORT_GENERATION_HOUR, 0, 0, 0);
    if (d.getTime() < mondayNine.getTime()) {
      return mondayNine;
    }
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + daysUntilMonday);
  }
  next.setHours(REPORT_GENERATION_HOUR, 0, 0, 0);
  next.setMinutes(0, 0, 0);
  return next;
}

/**
 * Whole calendar days until the next scheduled report.
 * @param {Date} [now]
 * @returns {number}
 */
export function getDaysUntilNextReport(now = new Date()) {
  const next = getNextReportDate(now);
  const ms = next.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

/**
 * Whether the previous week's report should be generated now.
 * @param {Date} [now]
 * @returns {boolean}
 */
export function shouldGeneratePreviousWeekReport(now = new Date()) {
  const d = new Date(now.getTime());
  if (d.getDay() !== 1) return false;
  const mondayNine = new Date(d);
  mondayNine.setHours(REPORT_GENERATION_HOUR, 0, 0, 0);
  return d.getTime() >= mondayNine.getTime();
}

/**
 * Daily check-in counts for a member across a week (uses roster logic per day).
 * @param {object[]} allTasks
 * @param {string} memberId
 * @param {string} weekStart
 * @param {string} weekEnd
 * @returns {number}
 */
export function countWeekdayCheckIns(allTasks, memberId, weekStart, weekEnd) {
  const weekdays = getWeekdayDates(weekStart, weekEnd);
  let count = 0;
  for (const day of weekdays) {
    const c = memberTaskCounts(allTasks, memberId, day, parseLocalDay(day));
    if (c.pendingToday + c.completedToday > 0 || c.workingHoursMs > 0) {
      count += 1;
    }
  }
  return count;
}
