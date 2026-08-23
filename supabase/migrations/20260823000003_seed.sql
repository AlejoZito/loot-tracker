-- loot-tracker: seed data for DATA_SOURCE=db
--
-- `budget_users` must not be seeded here: its ids come from BUDGET_USER_A/_B and vary
-- per deployment, so a default row would hold the 'userA' slot and make the real upsert
-- fail its unique constraint. server/scripts/migrate-sheets-to-db.ts syncs it instead.

insert into currencies (code, name, symbol, decimal_places, sort_order) values
  ('ARS', 'Argentine Peso', '$',   2, 1),
  ('USD', 'US Dollar',      'US$', 2, 2),
  ('EUR', 'Euro',           '€',   2, 3),
  ('BRL', 'Brazilian Real', 'R$',  2, 4)
on conflict (code) do nothing;

insert into app_config (key, value, description) values
  ('main_currency',            '"USD"',                 'Currency every summary figure and installment conversion is expressed in.'),
  ('default_expense_currency', '"ARS"',                 'Pre-selected currency in the add-expense form.'),
  ('locale',                   '"es-AR"',               'UI language and number formatting.'),
  ('shared_split_mode',        '"income_proportional"', 'How shared expenses are apportioned in the savings formula: income_proportional | equal.'),
  ('rate_fallback_policy',     '"nearest_preceding"',   'Rate to use when a month has none: nearest_preceding | latest | none. The legacy Apps Script used "latest" (newest rate ever), which mis-converts historical rows.'),
  ('installment_date_mode',    '"clamp"',               'clamp | legacy_overflow. legacy_overflow reproduces cuotificar.gs skipping a month and double-charging the next for day>28 purchases.'),
  ('settlement_enabled',       'false',                 'Inter-user rebalancing (summary columns AA/AB). Deferred.')
on conflict (key) do nothing;
