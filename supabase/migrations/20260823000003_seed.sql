-- loot-tracker: seed data for DATA_SOURCE=db
--
-- `budget_users` is deliberately not seeded: its ids come from BUDGET_USER_A/_B and vary
-- per deployment, so a placeholder row would hold the 'userA' slot and make the real one
-- fail its unique constraint. Insert one row per slot after applying these migrations.

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
  ('timezone',                 '"America/Argentina/Buenos_Aires"',
                                                        'The household calendar. Must match the zone literal in the expenses.occurred_local / expenses.period generated columns.'),
  ('shared_split_mode',        '"income_proportional"', 'How shared expenses are apportioned in the savings formula: income_proportional | equal.'),
  ('rate_fallback_policy',     '"nearest_preceding"',   'Rate to use when a month has none: nearest_preceding (carry the prior month forward) | latest (newest rate in the table) | none.'),
  ('installment_date_mode',    '"clamp"',               'clamp | legacy_overflow. clamp gives a day>28 purchase one installment in every month; legacy_overflow overflows it into the following month, skipping one and double-charging the next.'),
  ('settlement_enabled',       'false',                 'Inter-user rebalancing between the two household slots. Deferred: the summary reports 0.')
on conflict (key) do nothing;
