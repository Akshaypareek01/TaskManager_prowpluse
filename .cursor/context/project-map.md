# TaskManager / Impact Wall — Project Map

Last verified: 2026-07-28

## STACK

- **Runtime**: Node.js 18+
- **Framework**: Next.js 14.2.35 (App Router)
- **UI**: React 18.3.1, JavaScript, Tailwind CSS 3.4, Framer Motion
- **Database**: PostgreSQL via `pg` + Drizzle ORM 0.45
- **Auth**: Email OTP + httpOnly cookie `pw_session` (`lib/auth.js`)
- **Email**: Nodemailer for OTP delivery
- **Path alias**: `@/*` → project root

## STRUCTURE

- `app/` — Pages, client components, API routes
- `app/components/` — TopBar, TaskCard, TaskComposer, tabs, UI primitives
- `lib/` — auth, store, db, members, team, email, analytics
- `lib/db/` — Drizzle schema + connection
- `scripts/` — migrate, import-legacy, test-unit
- `.cursor/context/` — Agent context docs

## ENTRY POINTS

- **Dev**: `npm run dev`
- **Page**: `app/page.js` — SSR `getState()` → `<Wall initialState={...} />`
- **Sign-in**: `app/sign-in/page.js` → `SignInForm.js`
- **Client root**: `app/Wall.js` — auth state, polling, tabs, composer
- **API (public read)**: GET `/api/state`, `/api/history`, `/api/alerts`
- **API (auth)**: `/api/auth/{me,send-otp,verify-otp,logout}`
- **API (protected write)**: POST/PATCH `/api/tasks`, PATCH `/api/tasks/[id]`

## FEATURES

| Feature | UI | API | Service | Storage |
|---------|----|----|---------|---------|
| View wall | `Wall.js`, tabs | GET `/api/state` | `getState()` | tasks, alerts |
| Sign in (OTP) | `SignInForm.js` | POST `/api/auth/send-otp`, `verify-otp` | `lib/auth.js` | users, otp_codes, sessions |
| Session | `Wall.js` mount | GET `/api/auth/me` | `getSessionUser()` | sessions cookie + DB |
| Add task | `TaskComposer.js` | POST `/api/tasks` | `addTask()` | tasks |
| Complete task | `TaskCard.js` | PATCH `/api/tasks/[id]` | `completeTask()` | tasks |
| History | `HistoryTab.js` | GET `/api/history` | `getHistory()` | tasks |
| Alerts | `AlertsTab.js` | GET `/api/alerts` | `getAlerts()` | alerts |

## DATA MODEL

### Auth (`lib/db/schema.js`)
- `users`: id, name, email (unique), memberId (roster link), createdAt
- `otp_codes`: email, codeHash, expiresAt, used
- `sessions`: tokenHash (unique), userId → users, expiresAt (7 days)

### Tasks / alerts
- `tasks`: memberId, title, notes, dueDate, status, completion timestamps
- `alerts`: type, memberId, taskId?, message, dedupeKey

### Session user shape (`userToSession`)
```js
{ id, name, email, memberId, member: { id, name, color } | null, linked: boolean }
```

## CONVENTIONS

- **Auth guard**: `requireAuth()` in route handlers; throws `{ status: 401 }`
- **Self-only actions**: `assertCanActOnMember(user, memberId)` → 403
- **Cookie**: `pw_session`, httpOnly, sameSite=lax, secure in production, 7d maxAge
- **Token storage**: raw token in cookie only; DB stores SHA256(`SESSION_SECRET:token`)
- **Client auth**: single fetch on mount; no middleware; wall viewing is public
- **Client fetch**: `cache: "no-store"`; state poll 20s; auth NOT re-polled
- **API errors**: `{ error: string }` with err.status or 400
- **Mutations return**: full `getState()` JSON after task create/complete

## INTEGRATIONS

- **PostgreSQL**: `DATABASE_URL` → `lib/db/index.js`
- **SMTP**: `SMTP_*`, `EMAIL_FROM` → `lib/email.js` (OTP)
- **SESSION_SECRET**: required pepper for token/OTP hashing

## GOTCHAS

- No Next.js middleware — route-level auth only on task mutations
- `getSessionUser()` deletes expired DB session but does NOT clear stale cookie
- Client has no auto-logout on expiry; auth loaded once on mount only
- `app/api/tasks/route.js` contains a stray GET handler (duplicate of `/api/state`) — dead/unused path
- TopBar shows "Sign in" until `authLoaded`; no loading skeleton for auth
- `canCompleteTask` requires `user.memberId === task.member.id` — wrong member shows "Your tasks only"
- Legacy project-map described JSON-only storage — now Postgres via Drizzle
