# BYMA Dashboard - AGENTS.md

BYMA technical-analysis dashboard (Express monolith + vanilla-JS SPA). No CI, no lint/test/typecheck scripts — verification is manual: `npm start` then browser at `http://127.0.0.1:3001`.

## Commands (run from `server/`)
```bash
npm start       # dev server (same as npm run dev)
npm run init-db # apply server/database/schema.sql (idempotent: IF NOT EXISTS, keeps data)
npm run migrate # safe ALTER migration (price_history.date DATE -> DATETIME)
```

## Gotchas
- **`npm run migrate` reads `.env` from the repo root only** (`migrate.js:3`), but the real DB creds live in `server/.env` (gitignored; no root `.env` exists). Without DB env vars it silently falls back to `localhost/root/byma_dashboard` and fails to connect. Set them explicitly or create a root `.env`.
- `server/.env` contains DB/Telegram secrets and IS gitignored — never print or hardcode values from it.
- Root `package-lock.json` is a leftover (no root `package.json`); the real manifest is `server/package.json`. Heroku `Procfile` runs `cd server && node server.js`.
- The seeded `admin` user's bcrypt hash in `schema.sql` does **not** match `admin123` (verified). After a fresh `init-db` you can't log in as admin/admin123 — reset via the admin endpoint or replace the hash.
- CORS is origin-gated by `ALLOWED_ORIGINS` (empty or `*` = allow all).

## Architecture
- **Monolith**: Express serves `/api/*` and static `public/` (SPA) on the same port (default 3001, `server/server.js`).
- **Frontend**: Vanilla JS + Bootstrap 5.3.2 + Lightweight Charts 4.1.1 (CDN). Hash router `public/js/app.js`; page modules in `public/js/pages/*.js`; API wrapper `public/js/api.js`.
- **Auth**: JWT, 24h expiry (`auth.js:35`). Public routes only: `/api/auth/login`, `/api/auth/register`, `/api/health`. Frontend clears token + redirects to `#/login` on 401 (`api.js:33`). Admin routes guarded by `middleware/adminAuth.js`; admin nav hidden unless `role === 'admin'`.
- **DB**: MySQL via `mysql2/promise` pool (`server/config/db.js`). `schema.sql` creates 10 tables and seeds 26 tickers + 1 admin.

## Auth quirks (verified)
- New registrations get `is_active = 0` in production, `1` in development (`auth.js:56-57`); inactive users cannot log in.
- Admin "reset password" generates a **random temp password** returned in the response field `tempPassword` — it does NOT reset to a fixed `123456` (`admin.js:31-40`).

## External services (.env)
| Service | Config keys | Notes |
|---------|------------|-------|
| Yahoo Finance | none | `marketData.js` tries suffixes `.BA`/`.DF`/`.CI`/none; CEDEARs matched via US exchange search then enriched with a `.BA` quote |
| NVIDIA Nemotron | `NVIDIA_API_KEY` | falls back to `nvapi-key` |
| Telegram | `TELEGRAM_BOT_TOKEN` | price alerts + `telegram_messages` history |
| BullMarket (bonos) | `BULLMARKET_EMAIL`, `BULLMARKET_PASSWORD`, `BULLMARKET_FINGERPRINT` | optional; bond quotes fall back to Yahoo |

## Monitor (price alerts)
Only starts when `NODE_ENV=production` (`server.js:100-102`). Cron `*/15 11-17 * * 1-5` (Mon-Fri 11-17 ART) polls open analyses for target/stop-loss and notifies via Telegram.

## Known bugs
- `GET /api/messaging-status` (`server.js:61-75`) references `pool`, which is never imported in `server.js` — always returns 500.

## Key files
| Purpose | Path |
|---------|------|
| Express entry | `server/server.js` |
| Routes (10 modules) | `server/routes/*.js` |
| TA indicators (pure JS) | `server/services/technicalAnalysis.js` |
| Yahoo Finance client | `server/services/marketData.js` |
| Bond broker | `server/services/bullmarket.js` |
| RSS news (symbol->keywords map) | `server/services/news.js` |
| Alerts cron | `server/services/monitor.js` |
| SPA entry / router | `public/index.html`, `public/js/app.js` |
| DB init / migration | `server/database/init.js`, `server/database/migrate.js` (+ raw SQL `migrate_intraday.sql`) |
