# Architecture & API Guide

Museum Artifact Lifecycle and Exhibition Tracking System — a university Database Systems project web app for querying museum data and performing basic record management.

---

## What the app does

The system tracks museum artifacts through storage, display, loans, conservation, and insurance. Users can:

1. **Sign in / sign up** — Session-based access for museum staff (`APP_USER`, with signup also creating a `STAFF` row).
2. **Run reports (Q1–Q20)** — Execute the project SQL queries and view results in a dynamic HTML table. Q16 accepts a numeric insured-value threshold (default `100000`).
3. **Manage core data (CRUD)** — View, add, edit, and delete:
   - `ARTIFACT`
   - `EXHIBITION`
   - `LOAN`
   - `CONSERVATION_RECORD`
   - `INSURANCE_POLICY`  
   Foreign keys use labeled `<select>` dropdowns (category name, artifact title, staff name, etc.).

### Frontend pages

| Page | Path | Access |
|------|------|--------|
| Login / Sign up | `/login.html` | Public (redirects to reports if already logged in) |
| Reports | `/index.html` | Logged-in users only |
| Manage data | `/manage.html` | Logged-in users only |

Unauthenticated visits to protected pages are redirected to `/login.html`. API data routes return `401` when there is no session.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Plain HTML, CSS, vanilla JavaScript (`fetch`) — no frameworks or build tools |
| Backend | Node.js (≥18) + Express |
| Database | MySQL 8.0+ (`mysql2/promise` connection pool) |
| Auth | `express-session` cookie sessions; credentials in `APP_USER` (plain username/password for course demo) |
| Config | `dotenv` (`.env`) |

### Project layout

```
db/museum_lifecycle.sql   # Schema, sample data, vw_artifact_details
server/
  index.js                # Express entry, static files, page auth
  db.js                   # MySQL pool + parameterized query helper
  queries.js              # Q1–Q20 SQL strings
  middleware.js           # requireAuth for API routes
  routes/
    auth.js               # login, signup, logout, me
    reports.js            # query list + run
    crud.js               # lookups + entity CRUD
public/
  login.html / index.html / manage.html
  css/style.css
  js/api.js, reports.js, manage.js
start.sh / start.bat      # Starter scripts (Linux / Windows)
```

### Request flow (high level)

```
Browser (HTML/JS)
    │  fetch(..., credentials: 'same-origin')
    ▼
Express (session cookie: connect.sid)
    │  requireAuth on protected /api/* routes
    ▼
Route handlers (auth / reports / crud)
    │  parameterized SQL only (?)
    ▼
MySQL (museum_lifecycle)
```

All user-supplied values are bound with `?` placeholders via `mysql2` — SQL strings are never concatenated with input.

---

## How to run

### Prerequisites

- Node.js 18+
- MySQL 8.0+ running locally
- `npm` available on `PATH`

### 1. Create the database

```bash
mysql -u root -p < db/museum_lifecycle.sql
```

Or, after configuring `.env`, use the starter script flag:

```bash
./start.sh --init-db      # Linux / macOS
start.bat --init-db       # Windows
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit at least `DB_USER`, `DB_PASSWORD`, and optionally `SESSION_SECRET` / `PORT`.

Example `.env` keys:

| Variable | Purpose |
|----------|---------|
| `DB_HOST` | MySQL host (default `127.0.0.1`) |
| `DB_PORT` | MySQL port (default `3306`) |
| `DB_USER` / `DB_PASSWORD` | MySQL credentials |
| `DB_NAME` | Database name (`museum_lifecycle`) |
| `SESSION_SECRET` | Session signing secret |
| `PORT` | HTTP port (default `3000`) |

### 3. Install and start

```bash
# Linux / macOS
./start.sh

# Windows
start.bat

# Or manually
npm install
npm start
```

Open **http://localhost:3000**.

### Demo accounts

| Username | Password   | Role    |
|----------|------------|---------|
| `admin`  | `admin123` | admin   |
| `curator`| `curator123` | curator |
| `staff`  | `staff123` | staff   |
| `user1`  | `user123`  | staff   |

New staff can also register via **Sign up as staff** on the login page.

---

## API access architecture

### Auth model

| Kind | Endpoints | Rule |
|------|-----------|------|
| Public | `POST /api/login`, `POST /api/signup` | No session required |
| Session destroy | `POST /api/logout` | Allowed without a valid user (destroys session if present) |
| Protected | All other `/api/*` routes | `requireAuth` — needs `req.session.user`; otherwise **401** `{ "error": "Unauthorized" }` |

Sessions are stored server-side; the browser sends the `connect.sid` HTTP-only cookie. The frontend always calls APIs with `credentials: 'same-origin'`.

### Auth & session

| Method | Path | Auth | Body / notes | Response |
|--------|------|------|--------------|----------|
| `POST` | `/api/login` | Public | `{ username, password }` | `{ user }` + sets session |
| `POST` | `/api/signup` | Public | `{ username, password, full_name }` — creates `STAFF` + `APP_USER` (role `staff`), then session | `201` `{ user }` |
| `POST` | `/api/logout` | Optional | — | `{ ok: true }`, clears cookie |
| `GET` | `/api/me` | Required | — | `{ user }` |

`user` shape: `{ userId, username, fullName, role }`.

### Reports (Q1–Q20)

Mounted under `/api/reports`. All routes require a session.

| Method | Path | Auth | Body / notes | Response |
|--------|------|------|--------------|----------|
| `GET` | `/api/reports/list` | Required | — | `[{ id, title, needsParam }, …]` |
| `POST` | `/api/reports/:id/run` | Required | For **Q16** only: `{ threshold?: number }` (default `100000`) | `{ id, title, rows }` |

`:id` is `Q1` … `Q20` (case-insensitive). Unknown IDs return **404**. SQL definitions live in `server/queries.js` and are not altered by the client.

### Lookups (FK dropdowns)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/lookups` | Required | Categories, locations, staff, institutions, artifacts, exhibitions, plus status/type enums |

Used by the Manage Data UI to populate `<select>` options with human-readable labels.

### Entity CRUD

All CRUD routes require a session. Bodies are JSON. IDs are path parameters. Writes use parameterized `INSERT` / `UPDATE` / `DELETE`.

#### Artifacts — `/api/artifacts`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/artifacts` | List (joined category/location names) |
| `POST` | `/api/artifacts` | Create |
| `PUT` | `/api/artifacts/:id` | Update |
| `DELETE` | `/api/artifacts/:id` | Delete |

**Create/update body:** `title`, `period`, `material`, `current_status`, `category_id`, `location_id`, `acquisition_date`  
Required: `title`, `category_id`, `location_id`.

#### Exhibitions — `/api/exhibitions`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/exhibitions` | List |
| `POST` | `/api/exhibitions` | Create |
| `PUT` | `/api/exhibitions/:id` | Update |
| `DELETE` | `/api/exhibitions/:id` | Delete |

**Body:** `title`, `start_date`, `end_date`, `curator_id`, `gallery_id`  
Required: `title`, `start_date`, `end_date`, `curator_id`.

#### Loans — `/api/loans`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/loans` | List |
| `POST` | `/api/loans` | Create |
| `PUT` | `/api/loans/:id` | Update |
| `DELETE` | `/api/loans/:id` | Delete |

**Body:** `artifact_id`, `institution_id`, `loan_type`, `start_date`, `due_date`, `return_date`, `status`  
Required: `artifact_id`, `institution_id`, `loan_type`, `start_date`, `due_date`.

#### Conservation — `/api/conservation`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/conservation` | List |
| `POST` | `/api/conservation` | Create |
| `PUT` | `/api/conservation/:id` | Update |
| `DELETE` | `/api/conservation/:id` | Delete |

**Body:** `artifact_id`, `staff_id`, `condition_before`, `treatment_done`, `condition_after`, `start_date`, `end_date`, `cost`  
Required: `artifact_id`, `staff_id`, `condition_before`, `treatment_done`, `start_date`.

#### Insurance — `/api/insurance`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/insurance` | List |
| `POST` | `/api/insurance` | Create |
| `PUT` | `/api/insurance/:id` | Update |
| `DELETE` | `/api/insurance/:id` | Delete |

**Body:** `artifact_id`, `insurer_name`, `policy_number`, `insured_value`, `start_date`, `end_date`  
Required: all of the above.

### Typical error responses

| Status | When |
|--------|------|
| `400` | Missing/invalid request fields |
| `401` | Not logged in (protected route) or bad login credentials |
| `409` | Signup username (or unique email) already exists |
| `404` | Unknown report id or unknown API path |
| `500` | Server/DB failure (e.g. FK violation, access denied) — message may include MySQL `ER_*` code |

### Access diagram

```
                    ┌─────────────────────┐
                    │   Public (no auth)  │
                    │  POST /api/login    │
                    │  POST /api/signup   │
                    └──────────┬──────────┘
                               │ session cookie
                               ▼
┌──────────────────────────────────────────────────────────┐
│              Protected (requireAuth / session)           │
│                                                          │
│  GET  /api/me                                            │
│  GET  /api/reports/list                                  │
│  POST /api/reports/:id/run                               │
│  GET  /api/lookups                                       │
│  CRUD /api/artifacts | /exhibitions | /loans             │
│       /conservation | /insurance                         │
│  POST /api/logout                                        │
└──────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   MySQL 8 database  │
                    │  museum_lifecycle   │
                    └─────────────────────┘
```

---

## Database (summary)

Defined in `db/museum_lifecycle.sql`:

- **Reference:** `CATEGORY`, `LOCATION`, `STAFF`, `INSTITUTION`
- **Core:** `ARTIFACT`, `EXHIBITION`, `EXHIBITION_ARTIFACT`, `LOAN`, `CONSERVATION_RECORD`, `INSURANCE_POLICY`
- **App auth:** `APP_USER`
- **View:** `vw_artifact_details` (used by Q12)

Do not rename existing tables or columns; the report queries depend on them.
