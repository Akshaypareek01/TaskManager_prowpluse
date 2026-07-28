/** Maximum roast keywords a user may save. */
export const MAX_ROAST_KEYWORDS = 4;

/** Maximum length per keyword string. */
export const MAX_KEYWORD_LENGTH = 30;

/**
 * Normalize a keyword list: trim, dedupe (case-insensitive), cap count and length.
 * @param {unknown} input
 * @returns {string[]}
 */
export function normalizeRoastKeywords(input) {
  if (!Array.isArray(input)) return [];

  const seen = new Set();
  const result = [];

  for (const raw of input) {
    const keyword = String(raw ?? "")
      .trim()
      .slice(0, MAX_KEYWORD_LENGTH);
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(keyword);
    if (result.length >= MAX_ROAST_KEYWORDS) break;
  }

  return result;
}

/**
 * Parse roast keywords from a DB text/JSON column.
 * @param {unknown} value
 * @returns {string[]}
 */
export function parseRoastKeywordsFromDb(value) {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeRoastKeywords(value);

  try {
    const parsed = JSON.parse(String(value));
    return normalizeRoastKeywords(parsed);
  } catch {
    return [];
  }
}

/**
 * Serialize keywords for storage in the users.roast_keywords column.
 * @param {unknown} input
 * @returns {string}
 */
export function serializeRoastKeywords(input) {
  return JSON.stringify(normalizeRoastKeywords(input));
}
