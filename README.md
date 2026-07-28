# TaskManager

Team task wall — post daily tasks, track completion, alerts, and analytics. Built with Next.js + PostgreSQL.

## Features

- **Today tab** — today's tasks only, filter by person or view all
- **Add tasks** — anyone picks their name, adds title + optional notes
- **Complete tasks** — enter start/end time, duration tracked automatically
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
```

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

1. Tap **+ Add task**
2. Pick your name, enter task title
3. Mark complete when done — enter start & end time
4. Use roster chips to filter by person
5. Check **Alerts** and **History & analytics** tabs

## Team roster

Edit `lib/team.js` to add/remove people or change colors.

## Notes

- No login — trust-based name picker (same as before)
- "Today" and 6pm alerts use the **server machine's local timezone**
- Alerts auto-generate on each poll (every 20s) — no cron needed
# TaskManager_prowpluse
