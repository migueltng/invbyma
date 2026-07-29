# BYMA Dashboard - AGENTS.md

## Start server
```bash
cd server && npm start
```
Server on `http://0.0.0.0:3001`. Config in `.env` (DB, JWT, Telegram, NVIDIA API).

## Init DB (first-time only)
```bash
cd server && npm run init-db
```
Executes `server/database/schema.sql` (9 tables + seed: admin/admin123 + 26 tickers). Use `npm run migrate` for safe schema changes (ALTERs) without data loss.

## Key architecture
- **Monolith**: Express serves both `/api/*` and static `public/` SPA on same port
- **Frontend**: Vanilla JS + Bootstrap 5 + Lightweight Charts (CDN). Hash routing in `public/js/app.js`
- **Auth**: JWT (24h expiry). Login at `#/login`. Admin nav only visible for `role === admin`
- **DB**: MySQL via `mysql2/promise` connection pool in `server/config/db.js`

## Auth quirks
- New users: `is_active = 0` in production, `1` in development (`auth.js:56`)
- Admin reset-password: resets to `123456` (hardcoded `admin.js:33`)
- Schema seeds `admin` with bcrypt hash of `admin123`

## API pattern
All authenticated endpoints need `Authorization: Bearer <token>`. The frontend `api.js` auto-redirects to `#/login` on 401.

## External services (configure in .env)
| Service | Config key | Fallback |
|---------|-----------|----------|
| Yahoo Finance | (none, direct HTTPS) | CEDEARs sent without `.BA` suffix |
| NVIDIA Nemotron | `NVIDIA_API_KEY` | Defaults to `nvapi-key` |
| Telegram Bot | `TELEGRAM_BOT_TOKEN` | — |

## Monitor (price alerts)
Only activates when `NODE_ENV=production` (`server.js:70-72`). Cron: every 15 min during market hours (Mon-Fri 11-17 ART).

## Important file locations
| Purpose | Path |
|---------|------|
| Express entry | `server/server.js` |
| Route modules | `server/routes/*.js` (9 files) |
| TA indicators (pure JS) | `server/services/technicalAnalysis.js` |
| Yahoo Finance client | `server/services/marketData.js` |
| SPA entry | `public/index.html` |
| SPA router | `public/js/app.js` |
| DB init | `server/database/init.js` |
| DB migration | `server/database/migrate.js` |
| DB migration (raw SQL) | `server/database/migrate_intraday.sql` |

## DB migration
- `npm run migrate` — runs `server/database/migrate.js` (safe ALTERs with backup + validation + rollback)
- Migration scripts also available in `server/database/migrate_intraday.sql` (raw SQL)

## Common commands
- `npm start` — start dev server
- `npm run init-db` — reset database from schema.sql
- `npm run migrate` — apply safe schema migration (DATE→DATETIME for price_history.date)
