import { isBossMember } from "./members.js";
import { normalizeRoastKeywords } from "./roastKeywords.js";

/** @typedef {{ name: string, keywords: string[], isBoss?: boolean }} JokeTarget */

/**
 * Extract normalized roast keywords from a user or roster member.
 * @param {{ roastKeywords?: unknown }|null|undefined} user
 * @returns {string[]}
 */
export function getUserRoastKeywords(user) {
  return normalizeRoastKeywords(user?.roastKeywords ?? []);
}

/**
 * Whether a signed-in user may view the hourly roast section.
 * Requires sign-in (id + name) and explicit opt-in only; keywords are optional.
 * @param {{ id?: string, name?: string, allowHourlyRoast?: boolean, roastKeywords?: unknown }|null|undefined} user
 * @returns {boolean}
 */
export function canViewHourlyJoke(user) {
  const name = String(user?.name || "").trim();
  if (!user?.id || !name) return false;
  return user.allowHourlyRoast === true;
}

/**
 * Build joke targets from roster members who opted in (keywords optional).
 * @param {{ name?: string, allowHourlyRoast?: boolean, roastKeywords?: unknown }[]} [rosterMembers]
 * @returns {JokeTarget[]}
 */
export function resolveJokeProfiles(rosterMembers = []) {
  if (!Array.isArray(rosterMembers) || rosterMembers.length === 0) {
    return [];
  }

  const matched = new Map();

  for (const member of rosterMembers) {
    if (member?.allowHourlyRoast !== true) continue;

    const name = String(member?.name || "").trim();
    if (!name) continue;

    const keywords = getUserRoastKeywords(member);
    const key = name.toLowerCase();
    if (matched.has(key)) continue;

    matched.set(key, {
      name,
      keywords,
      isBoss: isBossMember(member),
    });
  }

  return [...matched.values()];
}
