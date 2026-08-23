# Sample database

`expensesDb_mock.xlsx` is the bundled seed data for the local `xlsx` datasource
(`DATA_SOURCE=xlsx`, the default — see `.env.example` and `quickstart/README.md`). It's
entirely synthetic: made-up categories, amounts, and comments, no real personal data.

On first run, `server/src/providers/xlsxSheetProvider.ts` copies this file to
`server/data/expensesDb.xlsx` (gitignored) and reads/writes that copy from then on — this
file itself is never modified by the running app.

## What's in it

All 8 tabs the app expects (see the column-by-column layout in `quickstart/README.md`),
including a few months of realistic-looking `expenses` and `habits` data, plus the
formula-driven `summary` / `summary_by_categories` / `expenses_by_installments` tabs
computed the way a real Google Sheet would (see `docs/sheets-apps-script/cuotificar.gs` for
how `expenses_by_installments` is generated from `expenses` + `exchange`).

Those three derived tabs are a **static snapshot** — nothing in `xlsx` mode recomputes them
as you add expenses (there's no live formula engine in a plain file, the same way this app
never recomputes them against a live Google Sheet either — Sheets does that on its own,
invisibly, whenever the underlying cells change). `expenses` and `habits` are the only
tabs the app actually writes to and keeps live; the rest (including `expenses-categories`
and `habits-categories`) reflect whatever the seed data looked like at generation time.

## Regenerating or replacing it

Any valid workbook with the same tab names and column layout works. If you regenerate this
file, keep in mind:
- Date cells should use a 4-digit-year format (e.g. `M/D/YYYY H:MM:SS`, not `M/D/YY`) —
  `xlsxCellUtils.ts` falls back to a UTC-derived value when it can't trust an ambiguous
  2-digit-year format, which is safe but won't preserve a nicely formatted label.
- The `summary` tab's percent columns need actual percent number formatting (not just a
  raw 0–1 fraction) for the app to display them correctly, same as a real Google Sheet.
- The `summary` tab's `monthLabel` column (B) is compared as literal text
  (`"June2024"`, no space) in `SheetSummaryRepository.getByMonth`, with a numeric
  year/month fallback for cells that come through as a raw date instead.
