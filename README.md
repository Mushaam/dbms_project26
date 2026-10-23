# Museum Artifact Lifecycle and Exhibition Tracking System

Barebones Node.js + Express + MySQL web app for a university Database Systems project. Plain HTML/CSS/JS frontend with session auth, 20 report queries, and basic CRUD for core entities.

## Setup

1. **Create the database** (MySQL 8.0+):

```bash
mysql -u root -p < db/museum_lifecycle.sql
```

2. **Configure environment**:

```bash
cp .env.example .env
# edit DB_USER, DB_PASSWORD, SESSION_SECRET as needed
```

3. **Install and run** (or use the starter scripts):

```bash
# Linux / macOS
./start.sh
./start.sh --init-db   # optional: load schema + sample data from .env credentials

# Windows (cmd)
start.bat
start.bat --init-db

# Or manually
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Demo login

| Username | Password   |
|----------|------------|
| admin    | admin123   |
| curator  | curator123 |
| staff    | staff123   |

## Features

- **Login / logout** via `express-session` and `APP_USER`
- **Reports**: run Q1–Q20 from `server/queries.js` (Q16 accepts a numeric threshold, default `100000`)
- **Manage data**: CRUD for `ARTIFACT`, `EXHIBITION`, `LOAN`, `CONSERVATION_RECORD`, `INSURANCE_POLICY` with FK `<select>` dropdowns

## Project layout

```
db/museum_lifecycle.sql   # schema, sample data, view
server/
  index.js                # Express app
  queries.js              # Q1–Q20 SQL
  db.js                   # mysql2 pool
  routes/                 # auth, reports, CRUD
public/                   # HTML, CSS, vanilla JS
```

## API (authenticated except login)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/login` | Create session |
| POST | `/api/logout` | Destroy session |
| GET | `/api/me` | Current user |
| GET | `/api/reports/list` | Query catalogue |
| POST | `/api/reports/:id/run` | Run Q1–Q20 |
| GET/POST/PUT/DELETE | `/api/artifacts` … | Entity CRUD |
| GET | `/api/lookups` | FK dropdown options |
