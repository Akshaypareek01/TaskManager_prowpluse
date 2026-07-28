import crypto from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "./db/index.js";
import { otpCodes, sessions, users } from "./db/schema.js";
import {
  ensureUserMemberId,
  generateUniqueMemberId,
  memberFromUser,
} from "./members.js";

export const SESSION_COOKIE = "pw_session";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_RATE_WINDOW_MS = 60 * 1000;
export const OTP_RATE_MAX = 3;

/**
 * Normalize an email for storage and lookup.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/**
 * Basic email format check.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

/**
 * Hash a secret value with SESSION_SECRET pepper.
 * @param {string} value
 * @returns {string}
 */
export function hashSecret(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return crypto.createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

/**
 * Generate a cryptographically secure session token.
 * @returns {string}
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generate a 6-digit OTP.
 * @returns {string}
 */
export function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Generate a prefixed unique id.
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Map a DB user row to the public session shape.
 * @param {object} row
 * @returns {object}
 */
export function userToSession(row) {
  const member = memberFromUser(row);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    memberId: row.memberId,
    member: member
      ? { id: member.id, name: member.name, color: member.color }
      : null,
    linked: Boolean(row.memberId),
  };
}

/**
 * Load the signed-in user from the session cookie, or null.
 * @returns {Promise<object|null>}
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const tokenHash = hashSecret(token);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      memberId: users.memberId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row || new Date(row.expiresAt) <= now) {
    if (row) {
      await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    }
    await clearSessionCookie();
    return null;
  }

  let userRow = row;
  if (!userRow.memberId) {
    const [full] = await db
      .select()
      .from(users)
      .where(eq(users.id, userRow.userId))
      .limit(1);
    if (full) {
      const updated = await ensureUserMemberId(db, full);
      userRow = { ...userRow, memberId: updated.memberId };
    }
  }

  return userToSession(userRow);
}

/**
 * Require an authenticated user; throws with status 401 when missing.
 * @returns {Promise<object>}
 */
export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error("Sign in required");
    err.status = 401;
    throw err;
  }
  return user;
}

/**
 * Ensure the user matches the target memberId (self-only task actions).
 * @param {object} user
 * @param {string} memberId
 */
export function assertCanActOnMember(user, memberId) {
  if (!user.memberId) {
    const err = new Error("Your account is not set up yet. Sign out and sign in again.");
    err.status = 403;
    throw err;
  }
  if (user.memberId !== memberId) {
    const err = new Error("You can only manage your own tasks");
    err.status = 403;
    throw err;
  }
}

/**
 * Persist a new OTP for an email after rate-limit checks.
 * @param {string} email
 * @returns {Promise<string>} plaintext OTP (for email only)
 */
export async function createOtpForEmail(email) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("Enter a valid email address");
  }

  const db = getDb();
  const since = new Date(Date.now() - OTP_RATE_WINDOW_MS);

  const recent = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(eq(otpCodes.email, normalized), gte(otpCodes.createdAt, since)));

  if (recent.length >= OTP_RATE_MAX) {
    const err = new Error("Too many codes sent. Wait a minute and try again.");
    err.status = 429;
    throw err;
  }

  const code = generateOtpCode();
  await db.insert(otpCodes).values({
    id: newId("otp"),
    email: normalized,
    codeHash: hashSecret(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    used: false,
  });

  return code;
}

/**
 * Verify an OTP and mark it used.
 * @param {string} email
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function verifyOtp(email, code) {
  const normalized = normalizeEmail(email);
  const trimmed = String(code || "").trim();
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error("Enter the 6-digit code from your email");
  }

  const db = getDb();
  const now = new Date();

  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.email, normalized), eq(otpCodes.used, false)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row || new Date(row.expiresAt) <= now) {
    throw new Error("Code expired or not found. Request a new one.");
  }

  if (row.codeHash !== hashSecret(trimmed)) {
    throw new Error("Incorrect code. Check your email and try again.");
  }

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, row.id));
  return true;
}

/**
 * Create a user on first registration with an auto-assigned roster member id.
 * @param {{ name: string, email: string }} data
 * @returns {Promise<object>}
 */
export async function registerUser({ name, email }) {
  const normalized = normalizeEmail(email);
  const displayName = String(name || "").trim();
  if (!displayName || displayName.length < 2) {
    throw new Error("Enter your name (at least 2 characters)");
  }

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("An account with this email already exists. Sign in instead.");
  }

  const memberId = await generateUniqueMemberId(db, displayName);
  const [created] = await db
    .insert(users)
    .values({
      id: newId("u"),
      name: displayName,
      email: normalized,
      memberId,
    })
    .returning();

  return userToSession(created);
}

/**
 * Load user by email for sign-in.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findUserByEmail(email) {
  const db = getDb();
  const normalized = normalizeEmail(email);
  const [row] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (!row) return null;

  const updated = await ensureUserMemberId(db, row);
  return userToSession(updated);
}

/**
 * Issue a session cookie for a user id.
 * @param {string} userId
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function createSession(userId) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) throw new Error("User not found");

  const userRow = await ensureUserMemberId(db, row);

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);

  await db.insert(sessions).values({
    id: newId("sess"),
    tokenHash: hashSecret(token),
    userId: userRow.id,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });

  return { token, user: userToSession(userRow) };
}

/**
 * Remove the session cookie from the browser.
 * @returns {Promise<void>}
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Clear the current session cookie and revoke the DB row.
 * @returns {Promise<void>}
 */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSecret(token)));
  }

  await clearSessionCookie();
}
