/** Stop words stripped when comparing task titles for inflation patterns. */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "in",
  "on",
  "to",
  "of",
  "with",
  "task",
  "fix",
  "update",
  "work",
  "working",
  "add",
  "new",
]);

/**
 * Tokenize a task title for similarity checks.
 * @param {string} title
 * @returns {string[]}
 */
export function tokenizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Jaccard similarity between two task titles (0–1).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function titleSimilarity(a, b) {
  const tokensA = tokenizeTitle(a);
  const tokensB = tokenizeTitle(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Detect when someone splits the same work across many similar tasks to inflate counts.
 * @param {string[]} titles
 * @returns {{ flagged: boolean, score: number, clusters: { titles: string[], count: number }[], summary: string|null }}
 */
export function detectTaskInflation(titles) {
  const clean = titles.map((t) => String(t).trim()).filter(Boolean);
  if (clean.length < 2) {
    return { flagged: false, score: 0, clusters: [], summary: null };
  }

  const SIM_THRESHOLD = 0.38;
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < clean.length; i += 1) {
    if (assigned.has(i)) continue;
    const group = [clean[i]];
    const indices = [i];

    for (let j = i + 1; j < clean.length; j += 1) {
      if (assigned.has(j)) continue;
      const sim = titleSimilarity(clean[i], clean[j]);
      if (sim >= SIM_THRESHOLD) {
        group.push(clean[j]);
        indices.push(j);
      }
    }

    if (group.length >= 2) {
      indices.forEach((idx) => assigned.add(idx));
      clusters.push({ titles: [...new Set(group)], count: group.length });
    }
  }

  const similarTaskCount = clusters.reduce((sum, c) => sum + c.count, 0);
  const score = Math.min(
    100,
    Math.round(
      (similarTaskCount / clean.length) * 55 +
        (clean.length >= 6 ? 25 : clean.length >= 4 ? 15 : clean.length >= 3 ? 8 : 0) +
        (clusters.length >= 2 ? 15 : 0)
    )
  );

  const flagged = score >= 40 && clean.length >= 3 && clusters.length >= 1;
  let summary = null;

  if (flagged && clusters[0]) {
    const example = clusters[0].titles.slice(0, 2).join('" · "');
    summary = `Heads up: ${similarTaskCount} of ${clean.length} tasks look like the same project split into separate entries (e.g. "${example}"). One main task with notes reads better than many similar tasks that inflate the dashboard.`;
  }

  return { flagged, score, clusters, summary };
}

/**
 * Deterministic CEO/manager-style strengths and improvements from weekly stats.
 * @param {object} memberStats
 * @param {ReturnType<typeof detectTaskInflation>} inflation
 * @returns {{ strengths: string[], improvements: string[], warning: string|null }}
 */
export function deriveMemberInsights(memberStats, inflation) {
  const strengths = [];
  const improvements = [];

  if (memberStats.isBoss) {
    strengths.push("Leadership presence — keeping the team aligned on the wall.");
  }

  if (memberStats.completedCount >= 3 && memberStats.completionRate >= 75) {
    strengths.push(
      `Strong delivery: ${memberStats.completedCount} tasks completed at ${memberStats.completionRate}% — real output, not just activity.`
    );
  } else if (memberStats.completionRate >= 85 && memberStats.completedCount >= 1) {
    strengths.push(`Excellent follow-through at ${memberStats.completionRate}% completion.`);
  }

  if (memberStats.workingHoursMs >= 5 * 3600000) {
    strengths.push(
      `${memberStats.workingHoursLabel} logged — serious focused time on meaningful work.`
    );
  } else if (memberStats.workingHoursMs >= 2 * 3600000 && memberStats.completedCount >= 2) {
    strengths.push(`${memberStats.workingHoursLabel} of logged work with solid completions.`);
  }

  if (memberStats.checkInStatus === "excellent") {
    strengths.push(
      `Punctual check-in all week (${memberStats.checkInDays}/${memberStats.checkInExpectedDays} weekdays).`
    );
  } else if (memberStats.checkInStatus === "good") {
    strengths.push(`Consistent weekday check-in (${memberStats.checkInDays}/${memberStats.checkInExpectedDays}).`);
  }

  if (memberStats.isInactive) {
    improvements.push("Show up earlier — post at least one task by Tuesday so the team knows you're in.");
  }

  if (memberStats.completionRate < 55 && memberStats.tasksCount >= 2) {
    improvements.push("Finish before you pile on — close pending tasks before opening new ones.");
  }

  if (memberStats.checkInStatus === "needs-improvement" || memberStats.checkInStatus === "fair") {
    improvements.push("Improve weekday check-in — the wall only works when everyone posts daily.");
  }

  if (memberStats.pendingCount > memberStats.completedCount && memberStats.tasksCount >= 2) {
    improvements.push("Reduce work-in-progress — too many open tasks vs completed.");
  }

  if (memberStats.tasksCount >= 5 && memberStats.avgDurationMs != null && memberStats.avgDurationMs < 20 * 60000) {
    improvements.push("Tasks look very short on average — batch related work into fewer, meatier tasks.");
  }

  const warning = inflation.flagged ? inflation.summary : null;
  if (warning) {
    improvements.push("Consolidate similar work into one task and use notes for sub-items.");
  }

  return { strengths, improvements, warning };
}

/**
 * Merge AI and deterministic insight lines without duplicates.
 * @param {string[]} primary
 * @param {string[]} fallback
 * @returns {string[]}
 */
export function mergeInsightLines(primary, fallback) {
  const seen = new Set();
  const out = [];
  for (const line of [...(primary || []), ...(fallback || [])]) {
    const trimmed = String(line || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.slice(0, 4);
}
