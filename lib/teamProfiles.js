/** @typedef {{ name: string, keys: string[], traits: string, isBoss?: boolean }} TeamProfile */

/** Office-hour joke targets — keyed by first name or full display name. */
/** @type {TeamProfile[]} */
export const TEAM_PROFILES = [
  {
    name: "Akshay",
    keys: ["Akshay"],
    traits: "very cool, helping nature, good friend",
  },
  {
    name: "Anshul",
    keys: ["Anshul"],
    traits: "kind of rude, serious, funny with team",
  },
  {
    name: "Prakhar",
    keys: ["Prakhar"],
    traits: "big built, speaks too fast sometimes hard to understand",
  },
  {
    name: "Rishika",
    keys: ["Rishika"],
    traits: "sensitive, overthinker",
  },
  {
    name: "Aanvi",
    keys: ["Aanvi"],
    traits: "funny, laughs a lot, entertainer",
  },
  {
    name: "Priyanshu",
    keys: ["Priyanshu"],
    traits: "aesthetic, tries to show off/cool but not quite",
  },
  {
    name: "Abhishek",
    keys: ["Abhishek"],
    traits: "calm, funny, lovable, good nature",
  },
  {
    name: "Vijay",
    keys: ["Vijay"],
    traits: "serious at work, new/learning, good nature, listens well",
  },
  {
    name: "Harsh",
    keys: ["Harsh"],
    traits: "QA/testing, serious, looks rude but isn't",
  },
  {
    name: "Ronak Sir",
    keys: ["Ronak", "Ronak Sir", "Ronak Vaya"],
    traits: "boss, leadership, funny sometimes, busy, handles pressure/clients",
    isBoss: true,
  },
];

/** Display names never selected for hourly roast jokes. */
export const HOURLY_JOKE_EXCLUDED_NAMES = new Set(["Aanvi", "Rishika", "Ronak Sir"]);

/**
 * Filter profiles to those eligible for hourly joke selection.
 * @param {TeamProfile[]} profiles
 * @returns {TeamProfile[]}
 */
export function filterEligibleJokeProfiles(profiles) {
  return profiles.filter((profile) => !HOURLY_JOKE_EXCLUDED_NAMES.has(profile.name));
}

/** Team profiles eligible for hourly roast jokes. */
export const JOKE_ELIGIBLE_PROFILES = filterEligibleJokeProfiles(TEAM_PROFILES);

/**
 * Normalize a display name to a lookup key (first token, trimmed).
 * @param {string} name
 * @returns {string}
 */
export function profileLookupKey(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

/**
 * Find a team profile by roster/display name (first name or full name).
 * @param {string} name
 * @returns {TeamProfile|null}
 */
export function findProfileByName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;

  const first = profileLookupKey(trimmed);
  for (const profile of TEAM_PROFILES) {
    if (profile.keys.some((k) => k === trimmed || k === first)) {
      return profile;
    }
    if (profile.name === trimmed || profile.name === first) {
      return profile;
    }
  }
  return null;
}

/**
 * Whether a signed-in user may view the hourly roast section.
 * Requires opt-in (`allowHourlyRoast`), and excludes Aanvi, Rishika, and Ronak Sir.
 * @param {{ id?: string, name?: string, allowHourlyRoast?: boolean }|null|undefined} user
 * @returns {boolean}
 */
export function canViewHourlyJoke(user) {
  const name = String(user?.name || "").trim();
  if (!user?.id || !name) return false;
  if (user.allowHourlyRoast !== true) return false;

  const profile = findProfileByName(name);
  if (profile && HOURLY_JOKE_EXCLUDED_NAMES.has(profile.name)) {
    return false;
  }

  if (HOURLY_JOKE_EXCLUDED_NAMES.has(name)) {
    return false;
  }

  return true;
}

/**
 * Filter predefined profiles to roster members who opted in (`allowHourlyRoast === true`).
 * Returns an empty list when the roster is empty or nobody opted in.
 * @param {{ name?: string, allowHourlyRoast?: boolean }[]} [rosterMembers]
 * @returns {TeamProfile[]}
 */
export function resolveJokeProfiles(rosterMembers = []) {
  if (!Array.isArray(rosterMembers) || rosterMembers.length === 0) {
    return [];
  }

  const matched = new Map();
  for (const member of rosterMembers) {
    if (member?.allowHourlyRoast !== true) continue;
    const profile = findProfileByName(member?.name);
    if (profile) matched.set(profile.name, profile);
  }

  return filterEligibleJokeProfiles([...matched.values()]);
}
