import { eq, isNotNull } from "drizzle-orm";
import { users } from "./db/schema.js";
import { colorForEmail, initials, slugifyMemberId } from "./team.js";
import { parseRoastKeywordsFromDb } from "./roastKeywords.js";

/** Display name of the team boss — excluded from low-effort metrics and stat chips. */
export const BOSS_MEMBER_NAME = "Ronak Vaya";

/**
 * Whether a roster member is the designated boss.
 * Boss members skip pending/done/hours chips and never appear in low-effort alerts.
 * @param {{ name?: string }} member
 * @returns {boolean}
 */
export function isBossMember(member) {
  if (!member?.name) return false;
  return member.name.trim() === BOSS_MEMBER_NAME;
}

/**
 * Build a roster member object from a users row.
 * @param {{ memberId: string|null, name: string, email: string }} row
 * @returns {object|null}
 */
export function memberFromUser(row) {
  if (!row.memberId) return null;
  return {
    id: row.memberId,
    name: row.name,
    color: colorForEmail(row.email),
    initials: initials(row.name),
    email: row.email,
  };
}

/**
 * Public member shape for API responses.
 * @param {object} m
 * @returns {object}
 */
export function memberView(m) {
  return { id: m.id, name: m.name, color: m.color, initials: m.initials };
}

/**
 * Index roster members by member id.
 * @param {object[]} members
 * @returns {Record<string, object>}
 */
export function membersById(members) {
  return Object.fromEntries(members.map((m) => [m.id, m]));
}

/**
 * Load roster names with hourly-roast opt-in for joke target selection.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @returns {Promise<{ name: string, allowHourlyRoast: boolean, roastKeywords: string[] }[]>}
 */
export async function getRoastEligibleRoster(db) {
  const rows = await db
    .select({
      name: users.name,
      allowHourlyRoast: users.allowHourlyRoast,
      roastKeywords: users.roastKeywords,
    })
    .from(users)
    .where(isNotNull(users.memberId))
    .orderBy(users.createdAt);

  return rows.map((row) => ({
    name: row.name,
    allowHourlyRoast: Boolean(row.allowHourlyRoast),
    roastKeywords: parseRoastKeywordsFromDb(row.roastKeywords),
  }));
}

/**
 * Load all registered users who have a roster member id.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @returns {Promise<object[]>}
 */
export async function getRegisteredMembers(db) {
  const rows = await db
    .select()
    .from(users)
    .where(isNotNull(users.memberId))
    .orderBy(users.createdAt);

  return rows.map((row) => memberFromUser(row)).filter(Boolean);
}

/**
 * Look up a single roster member by member id.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @param {string} memberId
 * @returns {Promise<object|null>}
 */
export async function getMemberByMemberId(db, memberId) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.memberId, memberId))
    .limit(1);

  return row ? memberFromUser(row) : null;
}

/**
 * Generate a unique member id slug from a display name.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function generateUniqueMemberId(db, name) {
  const base = slugifyMemberId(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.memberId, candidate))
      .limit(1);

    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

/**
 * Backfill memberId for legacy user rows created before auto-assignment.
 * @param {import("drizzle-orm/node-postgres").NodePgDatabase} db
 * @param {object} row
 * @returns {Promise<object>}
 */
export async function ensureUserMemberId(db, row) {
  if (row.memberId) return row;

  const memberId = await generateUniqueMemberId(db, row.name);
  const [updated] = await db
    .update(users)
    .set({ memberId })
    .where(eq(users.id, row.id))
    .returning();

  return updated;
}
