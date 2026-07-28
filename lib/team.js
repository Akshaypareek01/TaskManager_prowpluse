/**
 * Team display utilities. Roster membership lives in the `users` table (lib/members.js).
 */

/** Avatar accent palette — assigned deterministically from email. */
export const COLOR_PALETTE = [
  "#f59e0b",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fb7185",
  "#facc15",
  "#c084fc",
  "#22d3ee",
  "#fda4af",
  "#4ade80",
  "#60a5fa",
  "#f9a8d4",
  "#2dd4bf",
  "#fbbf24",
];

/**
 * Derive initials from a display name.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic accent color from an email address.
 * @param {string} email
 * @returns {string}
 */
export function colorForEmail(email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

/**
 * Slugify a display name into a stable member id base.
 * @param {string} name
 * @returns {string}
 */
export function slugifyMemberId(name) {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "member";
}
