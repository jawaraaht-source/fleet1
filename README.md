# Maintenance Planner

A day-planning tool for fleet maintenance supervisors. Pulls in DVIR defects, engine fault codes, and overdue PM schedules, lets you convert them into prioritized work orders, and assigns them to technicians — all in one view.

---

## What it does

- **Tasks tab** — syncs live fleet data (DVIRs, fault codes, PM schedules), lets you create work orders from them, and builds a prioritized list
- **Assign Work Orders** — steps through your work orders one at a time and recommends the best available technician based on skills and capacity
- **Day Plan tab** — shows each technician's assigned work orders as time blocks on a calendar grid

---

## Prerequisites

- [Node.js](https://nodejs.org) (LTS version recommended) — if you're not sure whether you have it, open Terminal and run `node --version`
- Git — comes pre-installed on Mac

---

## Setup (first time only)

```bash
# 1. Clone the repo
git clone https://github.com/r0ute37/maintenance-planner.git
cd maintenance-planner

# 2. Install server dependencies
npm install

# 3. Install frontend dependencies
cd client
npm install

# 4. Build the frontend
npm run build
cd ..
```

---

## Running the app

```bash
node server.js
```

Then open **http://localhost:3002** in your browser.

The app creates its own local database on first run (`data/planner.db`) and seeds it with sample fleet data — trucks, technicians, DVIRs, fault codes, and PM schedules.

---

## Picking up updates

When new changes are pushed to the repo:

```bash
git pull
cd client && npm run build && cd ..
node server.js
```

---

## Tech stack

- **Backend** — Node.js, Express, SQLite (via better-sqlite3)
- **Frontend** — React 18, Vite, @dnd-kit for drag-and-drop
