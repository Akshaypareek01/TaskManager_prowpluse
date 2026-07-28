import { localDayStr } from "./dates.js";
import { fnv1aHash } from "./greetings.js";
import {
  JOKE_ELIGIBLE_PROFILES,
  resolveJokeProfiles,
} from "./teamProfiles.js";

/** Local hour (inclusive) when office-hour jokes begin. */
export const OFFICE_HOURS_START = 10;

/** Local hour (exclusive) when office-hour jokes end — active through 5:59 PM. */
export const OFFICE_HOURS_END = 18;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

/** @type {Map<string, { joke: string, memberName: string, emoji: string, hourSlot: string }>} */
const jokeCache = new Map();

const SYSTEM_PROMPT = `You are a funny Indian startup office comedian. Write ONE short joke/roast (1-2 sentences max) about the named teammate using their personality traits. Hinglish is fine. Never cruel, racist, body-shame heavily, or HR-worthy. Playful sarcasm only. Include one emoji at the end.

Return JSON: { "joke": "...", "emoji": "😂" }`;

/**
 * Whether local time is within office hours for hourly jokes (10 AM – 6 PM).
 * @param {Date} now
 * @returns {boolean}
 */
export function isWithinOfficeHours(now) {
  const hour = now.getHours();
  return hour >= OFFICE_HOURS_START && hour < OFFICE_HOURS_END;
}

/**
 * Build the active hour slot identifier for caching and client refresh.
 * @param {Date} now
 * @returns {{ dateKey: string, hour: number, hourSlot: string }}
 */
export function getHourSlot(now) {
  const dateKey = localDayStr(now);
  const hour = now.getHours();
  const hourSlot = `${dateKey}T${String(hour).padStart(2, "0")}`;
  return { dateKey, hour, hourSlot };
}

/**
 * Cache key for a date + hour pair.
 * @param {string} dateKey
 * @param {number} hour
 * @returns {string}
 */
export function buildJokeCacheKey(dateKey, hour) {
  return `${dateKey}:${hour}`;
}

/**
 * Deterministically pick a team profile for the given date/hour slot.
 * @param {string} dateKey YYYY-MM-DD
 * @param {number} hour 0–23
 * @param {import("./teamProfiles.js").TeamProfile[]} [profiles]
 * @returns {import("./teamProfiles.js").TeamProfile}
 */
export function pickMemberForSlot(dateKey, hour, profiles = JOKE_ELIGIBLE_PROFILES) {
  const pool = profiles.length > 0 ? profiles : JOKE_ELIGIBLE_PROFILES;
  const seed = `${dateKey}:${hour}:hourly-joke`;
  const index = fnv1aHash(seed) % pool.length;
  return pool[index];
}

/**
 * Build the user prompt for OpenAI from a team profile.
 * @param {import("./teamProfiles.js").TeamProfile} profile
 * @returns {string}
 */
export function buildJokeUserPrompt(profile) {
  const bossNote = profile.isBoss
    ? " They are the team lead/boss — keep it respectful-funny, appreciative of leadership and pressure-handling. No low-effort shaming."
    : "";
  return `Write one playful startup-office joke about ${profile.name}. Personality traits: ${profile.traits}.${bossNote}`;
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
 * Parse OpenAI JSON content into joke + emoji.
 * @param {string} raw
 * @returns {{ joke: string, emoji: string }|null}
 */
export function parseJokeResponse(raw) {
  try {
    const parsed = JSON.parse(raw);
    const joke = String(parsed?.joke || "").trim();
    const emoji = String(parsed?.emoji || "😂").trim() || "😂";
    if (!joke) return null;
    return { joke, emoji };
  } catch {
    return null;
  }
}

/**
 * Call OpenAI to generate a joke for the given profile.
 * @param {string} apiKey
 * @param {import("./teamProfiles.js").TeamProfile} profile
 * @returns {Promise<{ joke: string, emoji: string }|null>}
 */
export async function generateJokeWithOpenAI(apiKey, profile) {
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
          temperature: 0.9,
          max_tokens: 150,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildJokeUserPrompt(profile) },
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

      const parsed = parseJokeResponse(content);
      if (parsed) return parsed;
      lastError = new Error("Invalid joke JSON");
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
    console.error("[hourlyJokes] OpenAI failed:", lastError.message);
  }
  return null;
}

/**
 * Resolve the hourly joke payload for the current slot (cached per date+hour).
 * Returns null outside office hours or when generation fails.
 * @param {{ now?: Date, apiKey?: string|null, rosterMembers?: { name?: string }[] }} [opts]
 * @returns {Promise<{ joke: string, memberName: string, emoji: string, hourSlot: string }|null>}
 */
export async function getHourlyJoke({
  now = new Date(),
  apiKey = process.env.OPENAI_API_KEY ?? null,
  rosterMembers = [],
} = {}) {
  if (!isWithinOfficeHours(now)) return null;

  const { dateKey, hour, hourSlot } = getHourSlot(now);
  const cacheKey = buildJokeCacheKey(dateKey, hour);
  const cached = jokeCache.get(cacheKey);
  if (cached) return cached;

  const profiles = resolveJokeProfiles(rosterMembers);
  const profile = pickMemberForSlot(dateKey, hour, profiles);
  const generated = await generateJokeWithOpenAI(apiKey, profile);
  if (!generated) return null;

  const payload = {
    joke: generated.joke,
    memberName: profile.name,
    emoji: generated.emoji,
    hourSlot,
  };
  jokeCache.set(cacheKey, payload);
  return payload;
}

/**
 * Clear in-memory joke cache (for tests).
 */
export function clearJokeCache() {
  jokeCache.clear();
}
