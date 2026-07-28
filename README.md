# TaskManager

Team task wall — post daily tasks, track completion, alerts, and analytics. Built with Next.js + PostgreSQL.

## Features

- **Public wall** — anyone can view today's tasks, alerts, history, and roster without signing in
- **Email + OTP sign-in** — add and complete tasks require a signed-in account (`/sign-in`)
- **Today tab** — today's tasks only, filter by person or view all
- **Add tasks** — signed-in users post tasks for their linked roster member
- **Complete tasks** — enter start/end time, duration tracked automatically (own tasks only)
- **Roster badges** — red badge shows overdue/pending count per person (visible to whole team)
- **Alerts tab** — congrats on completion, 6pm reminders, overdue notices
- **History & analytics** — filter by user, completion rate, avg duration, daily trends

## Setup (first time)

Requires **Node.js 18+** and **PostgreSQL**.

### 1. Database

**Option A — local Postgres (Homebrew):**
```bash
# Create DB (once)
createuser taskmgr -P   # password: taskmgr
createdb taskmgr -O taskmgr
```

**Option B — Docker:**
```bash
npm run db:up
```

### 2. Environment

```bash
cp .env.example .env
# Edit DATABASE_URL if needed
# Set SESSION_SECRET (openssl rand -hex 32)
# Set SMTP_* and EMAIL_FROM for email OTP sign-in
```

Required for auth:

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | Signs session tokens and OTP hashes |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Sends 6-digit OTP emails |
| `EMAIL_FROM` | From address on OTP emails |

### 3. Install & migrate

```bash
npm install
npm run db:migrate
# optional — import old data/data.json posts as completed tasks:
npm run db:import-legacy
```

### 4. Run

```bash
npm run dev        # http://localhost:3000
# or production:
npm run build && npm start
```

### LAN / wall display

```bash
npm run build && npm run start:lan
# Open http://<office-ip>:3000 from phones/TV
```

## Everyday use

1. **Sign in** at `/sign-in` (email + one-time code) to add or complete tasks
2. Tap **+ New task** — posts for your linked team member
3. Mark complete when done — enter start & end time
4. Use roster chips to filter by person
5. Check **Alerts** and **History & analytics** tabs

Anyone can browse the wall without signing in.

## Team roster

Edit `lib/team.js` to add/remove people or change colors. Add an optional `email` field to auto-link new accounts to a roster member:

```js
{ id: "akshay", name: "Akshay", color: "#38bdf8", email: "akshay@prowplus.ai" },
```

## Notes

- **Viewing is public**; **add/complete require sign-in** and a roster-linked account
- Sessions last **7 days** (httpOnly cookie)
- OTP codes expire in **10 minutes**
- "Today" and 6pm alerts use the **server machine's local timezone**
- Alerts auto-generate on each poll (every 20s) — no cron needed
# TaskManager_prowpluse
