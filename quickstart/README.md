# Quickstart

Nothing personal ships in this repo. There are two ways to run it:

- **Local `.xlsx` file** (`DATA_SOURCE=xlsx`, the default) — zero Google Cloud setup, just
  `.env` with login credentials. Seeded with sample data at
  `server/resources/sample-sheet-db/`. Good for trying the app or fully offline use.
- **A real Google Sheet** (`DATA_SOURCE=google-sheets`) — multi-device access, and the
  `summary`/`expenses_by_installments` tabs actually recompute live as you edit data
  (Google Sheets does that on its own; a static local file can't). Needs a one-time Google
  Cloud service account setup, covered below.

Either way, start with:

```
npm install
npm install --prefix client
npm install --prefix server
cp .env.example .env
```

## Fast path: local `.xlsx`, no Google Cloud account

Open `.env` and set:
- `AUTH_USERNAME_A` / `AUTH_PASSWORD_A` and `AUTH_USERNAME_B` / `AUTH_PASSWORD_B` — login
  credentials for the app's two accounts. Pick anything.
- `JWT_SECRET` — any random string. Generate one with `openssl rand -hex 32`.

Leave `DATA_SOURCE=xlsx` (the default) and skip straight to **"Install and run"** near the
bottom of this doc — you don't need anything else on this page. `BUDGET_USER_A/B` and its
`_LABEL` variants are optional too (defaults: `user-a`/`User A`, `user-b`/`User B`).

Writes go to your own gitignored copy at `server/data/expensesDb.xlsx`, seeded on first run
from the bundled sample database. Delete that file any time to reset back to sample data. See
`server/resources/sample-sheet-db/README.md` for how that seed data works and what it's for.

---

## Using a real Google Sheet instead

Set `DATA_SOURCE=google-sheets` in `.env`, then follow the rest of this guide — it walks
through every value `.env.example` asks for related to Google Sheets, in order.

## 1. Create a Google Cloud service account

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
   (or reuse one).
2. Enable the **Google Sheets API** for that project (APIs & Services → Library → search
   "Google Sheets API" → Enable).
3. Create a **service account** (APIs & Services → Credentials → Create Credentials →
   Service account). Any name works.
4. Open the service account → **Keys** tab → Add Key → Create new key → **JSON**. This
   downloads a file — that's your `credentials.json`.
5. Save it as `server/credentials.json` in this repo (already gitignored — it will never
   be committed).

## 2. Create your spreadsheet and share it with the service account

1. In Google Sheets, create a new spreadsheet.
2. Open the downloaded JSON key and copy the `client_email` value (looks like
   `something@your-project.iam.gserviceaccount.com`).
3. In your spreadsheet, click **Share** and add that email as an **Editor**. This is the
   step almost everyone forgets — without it the app gets a 403 from every request.
4. Copy the spreadsheet id from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit` → this is your
   `GOOGLE_SHEETS_ID`.

## 3. Set up the sheet tabs

Create the tabs below, with these exact headers in row 1. Tab names are configurable (see
`.env.example`'s `*_SHEET_NAME` vars) but must match whatever you put in `.env`. Column
**names** are the ones the app expects (Spanish, matching `server/src/mappers/sheetMapper.ts`)
— you can translate the sheet's display header text if you like, but the app doesn't read
headers, only column *position*. Do not reorder columns.

Headers-only CSVs for every tab (no data rows) are in
[`quickstart/sheet-template/`](sheet-template/) — import each one as a new tab
(File → Import → Upload, "Insert new sheet") to get the column layout right without typing
it by hand.

### `expenses` (A:J)
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| id | periodo | categoria | monto | cuotas | moneda | comentario | tipo | compartido | usuario |

- `periodo`: `M/D/YYYY H:MM:SS` (e.g. `6/20/2024 14:30:00`)
- `tipo`: `Ingreso` or `Egreso`
- `compartido`: `Si` or `No`
- `usuario`: your `BUDGET_USER_A` or `BUDGET_USER_B` value, or `shared`

### `expenses-categories` (A:E)
| A | B | C | D | E |
|---|---|---|---|---|
| id | nombre | emoji | tipo | usuario |

- `id`: a short slug used in code/icons (e.g. `groceries`) — this is what
  `client/src/config/categoryIcons.ts` can optionally map to an icon
- `tipo`: `Ingreso` or `Egreso`
- `usuario`: `shared`, or restrict a category to one budget-user id

Add whatever categories fit your household — nothing is hardcoded.

### `habits-categories` (A:D)
| A | B | C | D |
|---|---|---|---|
| id | nombre | emoji | default |

One row per habit you want to track (e.g. gym, reading, no smoking — anything). `default`
is `TRUE`/`FALSE`, the starting value each day.

### `habits` (A:Z)
Transposed layout: column A = day (`DD/MM/YYYY`), then one column per habit category **in
the same order as the `habits-categories` tab**, then a final column = user. Width grows
with however many habit categories you define — leave the extra columns in the `A:Z` range
empty if you have fewer.

### `summary` (A:AB)
A fixed 28-column, two-person layout — see the header comment above `rowToSummaryMonth` in
`server/src/mappers/sheetMapper.ts` for the exact column-by-column meaning (year, month
label, individual/shared/total expenses and income per user, savings, and the inter-user
settlement). This tab is typically **computed with spreadsheet formulas** you write once
against your `expenses` tab — the app only reads the results. This is the part of the app
most tied to a two-person household; see "Known limitations" below.

### `summary_by_categories` (A:F)
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| categoria | tipo | usuario | compartido | periodo | monto |

One row per category per period per user — typically generated with a spreadsheet formula
or pivot from your `expenses` tab. `periodo` is `YYYY-MM`.

### `expenses_by_installments` (A:N) — optional
Only needed if you use the installment-purchase / cross-month summary views.
| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id | periodo | periodo_origen | categoria | monto_cuota | cuotas | moneda | comentario | tipo | compartido | usuario | usd_mes_cuota | usd_origen |

Expands a purchase paid in N installments into N rows (one per installment month), with the
USD value at both the installment month's and the original purchase month's exchange rate.
This tab is generated, not hand-filled — see the Apps Script below.

#### `exchange` — required only if you use `expenses_by_installments`
A small lookup table the installment script reads for currency conversion. No fixed header
names required, just: column A = month key (`YYYY-MM`), column B = USD rate, column C = EUR
rate. One row per month you want a rate for.

#### Generating `expenses_by_installments` with Apps Script
[`docs/sheets-apps-script/cuotificar.gs`](../docs/sheets-apps-script/cuotificar.gs) is a
ready-to-use script that reads `expenses` + `exchange` and (re)writes the entire
`expenses_by_installments` tab. To use it:
1. In your spreadsheet: **Extensions → Apps Script**.
2. Paste in the contents of `cuotificar.gs`.
3. Run `procesarDatos` once manually to backfill (Apps Script will ask you to authorize).
4. Optional but recommended: **Triggers** (clock icon in the left sidebar) → Add Trigger →
   function `onChange`, event source "From spreadsheet", event type "On change" — so the
   tab regenerates automatically whenever you edit `expenses`.

## 4. Auth

- `AUTH_USERNAME_A` / `AUTH_PASSWORD_A` and `AUTH_USERNAME_B` / `AUTH_PASSWORD_B` — login
  credentials for the app's two accounts. Pick anything.
- `BUDGET_USER_A` / `BUDGET_USER_B` — the id written into the sheet's `usuario` column and
  embedded in the JWT. Keep these stable once you have data.
- `BUDGET_USER_A_LABEL` / `BUDGET_USER_B_LABEL` — display names shown in the UI.
- `JWT_SECRET` — any random string. Generate one with:
  ```
  openssl rand -hex 32
  ```

This is intentionally simple, fixed two-account auth for a household — not a general user
system. See "Known limitations" below if you need more than two people.

## 5. Install and run

```
npm install
npm install --prefix client
npm install --prefix server
cp .env.example .env    # then fill it in with everything above
npm run dev
```

Client runs on `http://localhost:5173`, server on `http://localhost:3000` (the client dev
server proxies `/api` to it).

## 6. Optional: E2E tests

`npm run test:e2e` runs a real-Google-Sheets test suite. Point `E2E_SPREADSHEET_ID` at a
**throwaway** spreadsheet (share it with the same service account) — the suite writes and
deletes test rows in it. Never point this at your real data.

---

## Known limitations

- **Two-person household only.** The `summary` sheet tab is a fixed two-column layout per
  metric, and the app's auth is fixed to two accounts. Supporting more people means
  redesigning that tab and the summary domain model — see
  `docs/plans/2026-08-22-genericize-for-sharing.md` for the reasoning and what's currently
  hardcoded around this.
- **Spanish-first UI.** Most on-screen text, category values (`Ingreso`/`Egreso`,
  `Si`/`No`), and the advisor character's dialogue are in Spanish. Currency support is
  ARS/USD/EUR.
- **The `summary` tab does the math, not the app.** Category totals, splits, and savings
  are computed by formulas (on a real Google Sheet) or a static snapshot (in `xlsx` mode);
  the app only reads results, never computes them itself. If you're setting up your own
  Google Sheet from scratch, this is the single most fragile part — get the `expenses` tab
  flowing first, then build the summary formulas incrementally and check the "Resumen" page
  as you go.
