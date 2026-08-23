# loot-tracker

A household budget tracker for two people, built as a React + Express app. Track shared and
individual expenses/income, category and habit breakdowns, and cross-month summaries —
themed as a small RPG (an in-app "advisor" character narrates your spending).

This repo ships with **no personal data and no live credentials** — it's a template.

## Try it now

```
npm install
npm install --prefix client
npm install --prefix server
cp .env.example .env
```

Open `.env` and set `AUTH_USERNAME_A/B`, `AUTH_PASSWORD_A/B` (pick anything), and
`JWT_SECRET` (`openssl rand -hex 32`) — that's the only setup required. Leave
`DATA_SOURCE=xlsx` (the default) and skip the whole Google Sheets section entirely:

```
npm run dev
```

The app runs against a local `.xlsx` file seeded with realistic sample data. Client:
`http://localhost:5173`. Server: `http://localhost:3000`.

Writes persist to your own gitignored copy at `server/data/expensesDb.xlsx` — delete it any
time to reset back to the sample data.

## Stack

- **`client/`** — React + Vite + TypeScript frontend (PWA, offline-queue support)
- **`server/`** — Express + TypeScript backend
- **`common/`** — Shared DTOs (`types.ts`), the single source of truth for both sides
- **`api/`** — Vercel serverless entry point (imports the same Express app as `server/`)

- **`supabase/`** — SQL migrations for the Postgres datasource

Data lives behind repository interfaces (`server/src/repositories/`), with the datasource
chosen once in `server/src/repositories/index.ts` from `DATA_SOURCE`: a local `.xlsx` file
(the default), a real Google Sheet, or Postgres. The two sheet backends share an
`ISheetProvider` (`server/src/providers/`); Postgres implements the repository interfaces
directly, because a spreadsheet's cell-range API is a poor fit for SQL.

## Using your own Google Sheet instead

The local `.xlsx` mode is great for trying the app, but it's a single static file — no
multi-device access, and its formula-driven tabs (`summary`, `expenses_by_installments`)
don't recompute themselves. 

For real, ongoing use:

A) point the app at a real Google Sheet:
set `DATA_SOURCE=google-sheets` and follow **[`quickstart/README.md`](quickstart/README.md)**
to create a Google Cloud service account and spreadsheet, then fill in `.env`
(`cp .env.example .env` first).

B) **use a real database** — set `DATA_SOURCE=db`:

```
# 1. provision Postgres (Vercel Marketplace) and pull the credentials
npm i -g vercel && vercel link
vercel integration add supabase
vercel env pull

# 2. apply supabase/migrations/*.sql to the database

# 3. import your existing sheet data (idempotent, safe to re-run)
MIGRATE_FROM=google-sheets npm run migrate:db --prefix server
```

This is the only mode where **the app computes its own numbers**. `summary`,
`summary_by_categories` and `expenses_by_installments` are SQL views over `expenses`, so
they recompute on every read and cannot go stale — no Apps Script, no formula maintenance,
and editing an old expense immediately corrects every month it touches. It also makes the
reporting currency configurable (`app_config.main_currency`) rather than hardcoded to USD.

## Testing

```
npm test              # unit tests
npm run test:e2e       # requires a throwaway E2E_SPREADSHEET_ID — see quickstart
```

Repository tests run against a small synthetic `.xlsx` fixture at
`tests/resources/expenses_db_february2026.xlsx`
separate from the larger sample database at `server/resources/sample-sheet-db/` that backs
the app's default `DATA_SOURCE=xlsx` mode. Regenerate the test fixture with
`npx tsx tests/resources/generate-fixture.ts` if you change a sheet's column layout. If the
file is ever missing, those tests are skipped automatically rather than failing.

## Known limitations

This is built around a **two-person household** — the sheet's `summary` tab is a fixed
two-column-per-metric layout, and auth is fixed to two accounts (`userA`/`userB` slots,
with configurable ids and display names). It is not a general multi-user system. 

The UI is Spanish-first. Currency support is ARS/USD/EUR in the sheet modes; `DATA_SOURCE=db`
adds BRL and makes the offered set configurable via the `currencies` table. See
`quickstart/README.md`'s "Known limitations" section for more detail.

**The `summary` tab does the math, not the app** — but only in the sheet modes, where
category totals, splits and savings come from spreadsheet formulas (or, in `xlsx` mode, a
static snapshot that never recomputes). `DATA_SOURCE=db` removes this limitation entirely:
that logic lives in `supabase/migrations/` as SQL views.

## License

GPL-3.0 — see [`LICENSE`](LICENSE).
