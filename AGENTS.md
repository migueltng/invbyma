# BYMA Dashboard - AGENTS.md

## Start server
```bash
cd server && npm start
```
Server on `http://0.0.0.0:3001` (PORT/HOST from `.env`, defaults 3001/0.0.0.0). Root has NO `package.json` — all npm commands run from `server/`. `.env` is loaded from BOTH `server/.env` and repo-root `.env` (dotenv called twice in `server.js`, `config/db.js`, `database/init.js`), so env vars may come from either place.

## Init DB (first-time only)
```bash
cd server && npm run init-db
```
Executes `server/database/schema.sql` (10 tables + seed: admin/admin123 + 26 tickers). No migration system — schema changes go in that file. `init.js` connects WITHOUT `DB_NAME` and uses `multipleStatements: true` so the script can `CREATE DATABASE` and seed in one shot.

## Key architecture
- **Monolith**: Express serves both `/api/*` and static `public/` SPA on same port
- **Frontend**: Vanilla JS + Bootstrap 5 + Lightweight Charts (CDN). Hash routing in `public/js/app.js`
- **Auth**: JWT (24h expiry). Login at `#/login`. Admin nav only visible for `role === admin`
- **DB**: MySQL via `mysql2/promise` connection pool in `server/config/db.js`

## Auth quirks
- New users: `is_active = 0` in production, `1` in development (`routes/auth.js:56`)
- Admin reset-password: resets to `123456` (hardcoded `routes/admin.js:33`)
- Schema seeds `admin` with bcrypt hash of `admin123`
- `JWT_SECRET` falls back to literal `'secret'` if unset (`routes/auth.js`, `middleware/auth.js`)

## API pattern
All authenticated endpoints need `Authorization: Bearer <token>`. The frontend `api.js` auto-redirects to `#/login` on 401.

## External services (configure in .env)
| Service | Config key | Fallback |
|---------|-----------|----------|
| Yahoo Finance | (none, direct HTTPS) | history: try `.BA` then bare symbol |
| NVIDIA Nemotron | `NVIDIA_API_KEY` (+ optional `NVIDIA_API_URL`) | `/api/ai/chat` returns 503 if key unset |
| Telegram Bot | `TELEGRAM_BOT_TOKEN` | — |

- AI model hardcoded to `nvidia/nemotron-3-super-120b-a12b` (`routes/ai.js`), Spanish BYMA-expert system prompt.
- `fetchHistory` (used by charts/signals) tries `SYMBOL.BA` then bare `SYMBOL`; `fetchQuote`/`fetchBymaQuote` strip/add `.BA`. USD/ARS cached 5 min from bluelytics, with hardcoded fallback rates on error (`services/marketData.js`).

## Monitor (price alerts)
Only starts when `NODE_ENV=production` (`server.js:81`). Cron `*/15 11-17 * * 1-5` runs in the **server's local time** (not guaranteed ART); in dev the same cron is `*/15 * * * *` but is never started. Only fires Telegram alerts for open analyses where `notified = 0` and user has `telegram_chat_id`.

## Important file locations
| Purpose | Path |
|---------|------|
| Express entry | `server/server.js` |
| Route modules | `server/routes/*.js` (9 files) |
| TA indicators (pure JS) | `server/services/technicalAnalysis.js` |
| Yahoo Finance client | `server/services/marketData.js` |
| SPA entry | `public/index.html` |
| SPA router | `public/js/app.js` |
| API client | `public/js/api.js` |
| Page modules | `public/js/pages/*.js` (9 files) |

## Common commands
- `npm start` — start dev server
- `npm run init-db` — reset database from schema.sql (also the only sanity check; there are NO tests, linter, or typecheck scripts)
