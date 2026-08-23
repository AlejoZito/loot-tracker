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

Data lives behind an `ISheetProvider` interface (`server/src/providers/`) with two
implementations: a local `.xlsx` file (the default) or a real Google Sheet.

## Using your own Google Sheet instead

The local `.xlsx` mode is great for trying the app, but it's a single static file — no
multi-device access, and its formula-driven tabs (`summary`, `expenses_by_installments`)
don't recompute themselves. 

For real, ongoing use:

A) point the app at a real Google Sheet:
set `DATA_SOURCE=google-sheets` and follow **[`quickstart/README.md`](quickstart/README.md)**
to create a Google Cloud service account and spreadsheet, then fill in `.env`
(`cp .env.example .env` first).

B) Implement a database schema

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

The UI is Spanish-first with ARS/USD/EUR currency support. See `quickstart/README.md`'s "Known
limitations" section and `docs/plans/2026-08-22-genericize-for-sharing.md` for more detail
and a sketch of what a database-backed, N-user version would take.

## License

GPL-3.0 — see [`LICENSE`](LICENSE).
