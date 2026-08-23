-- loot-tracker: the derived reporting views.
--
-- SECURITY: every view below declares `security_invoker = on`. Without it a view runs
-- with its *owner's* privileges (postgres), which silently bypasses the row-level
-- security enabled on the base tables — so the anon key could read the household's
-- entire finances through these views even though it cannot read `expenses` directly.
-- Do not remove it. (Requires PG15+; Supabase is well past that.)
--
-- Every money and percentage column is cast to `double precision`. PostgREST serialises
-- `numeric` as a JSON *string*, which concatenates instead of summing once it reaches
-- JavaScript; `double precision` arrives as a JSON number.

-- One row per purchase per installment month. Carries only what is specific to an
-- installment — everything else stays on `expenses` and is joined where it is needed.

create view expenses_by_installments with (security_invoker = on) as
with cfg as (
  select (select value #>> '{}' from app_config where key = 'installment_date_mode') as date_mode
),
expanded as (
  select
    e.id                                                                           as expense_id,
    g.j + 1                                                                        as installment_number,
    e.amount / greatest(e.installments, 1)                                         as installment_amount,
    date_trunc('month', e.occurred_at)::date                                       as origin_month,
    -- Always origin + j months, independent of the day-of-month rule below, so no
    -- date mode can shift money between monthly summaries.
    (date_trunc('month', e.occurred_at)::date + (g.j || ' months')::interval)::date as period_month,
    g.j                                                                            as months_out,
    cfg.date_mode,
    e.occurred_at
  from expenses e
  cross join cfg
  cross join lateral generate_series(0, greatest(e.installments, 1) - 1) as g(j)
)
select
  x.expense_id,
  x.installment_number,
  x.installment_amount::float8       as installment_amount,
  x.origin_month,
  x.period_month,
  to_char(x.period_month, 'YYYY-MM') as period_key,
  case x.date_mode
    when 'legacy_overflow' then
      -- Overflows a short month: 2024-01-31 + 1 month becomes 2024-03-02, so February
      -- receives no installment and March is charged twice.
      (x.period_month + (extract(day from x.occurred_at)::int - 1))
    else
      -- 'clamp' (default): Postgres-native, 2024-01-31 + 1 month becomes 2024-02-29.
      (x.occurred_at + (x.months_out || ' months')::interval)::date
  end                                as period_date
from expanded x;


-- The rate to use for every (month, currency) the reporting views need, resolved once
-- under `app_config.rate_fallback_policy`.

create view resolved_exchange_rates with (security_invoker = on) as
with cfg as (
  select (select value #>> '{}' from app_config where key = 'rate_fallback_policy') as rate_fallback
),
needed as (
  select distinct i.period_month as period, c.code as currency
  from expenses_by_installments i
  cross join currencies c
)
select
  n.period,
  n.currency,
  (select r.units_per_usd
     from exchange_rates r
    where r.currency = n.currency
      and ( r.period = n.period                                                   -- exact match
            or (cfg.rate_fallback = 'nearest_preceding' and r.period <= n.period) -- carry forward
            or  cfg.rate_fallback = 'latest' )                                    -- newest ever (legacy)
    order by (r.period = n.period) desc, r.period desc
    limit 1) as units_per_usd
from needed n
cross join cfg;


create view summary_by_categories with (security_invoker = on) as
with cfg as (
  select (select value #>> '{}' from app_config where key = 'main_currency') as main_currency
),
converted as (
  select
    e.category,
    coalesce(c.type, 'expense') as type,   -- unmatched category name => expense
    e.user_id,
    e.shared,
    i.period_key,
    cfg.main_currency,
    i.installment_amount / nullif(rf.units_per_usd, 0) * rm.units_per_usd as amount
  from expenses_by_installments i
  join expenses e on e.id = i.expense_id
  cross join cfg
  left join categories c on c.name = e.category   -- expenses reference categories by name
  left join resolved_exchange_rates rf on rf.period = i.period_month and rf.currency = e.currency
  left join resolved_exchange_rates rm on rm.period = i.period_month and rm.currency = cfg.main_currency
)
select
  category,
  type,
  user_id,
  shared,
  period_key                       as period,   -- 'YYYY-MM'
  coalesce(sum(amount), 0)::float8 as amount,
  main_currency                    as currency  -- paired with amount, never assumed
from converted
group by category, type, user_id, shared, period_key, main_currency
having coalesce(sum(amount), 0) > 0;


-- The two-slot household summary, one row per month.

create view summary with (security_invoker = on) as
with cfg as (
  select
    (select (value #>> '{}')::boolean from app_config where key = 'settlement_enabled') as settlement_enabled,
    (select value #>> '{}' from app_config where key = 'shared_split_mode')             as split_mode,
    (select value #>> '{}' from app_config where key = 'main_currency')                 as main_currency
),
converted as (
  select
    i.period_month,
    b.slot,
    e.type,
    e.shared,
    i.installment_amount / nullif(rf.units_per_usd, 0) * rm.units_per_usd as amount
  from expenses_by_installments i
  join expenses e     on e.id = i.expense_id
  join budget_users b on b.id = e.user_id and b.slot is not null
  cross join cfg
  left join resolved_exchange_rates rf on rf.period = i.period_month and rf.currency = e.currency
  left join resolved_exchange_rates rm on rm.period = i.period_month and rm.currency = cfg.main_currency
),
per_slot as (
  select
    period_month,
    slot,
    coalesce(sum(amount) filter (where type = 'expense' and not shared), 0) as indiv_exp,
    coalesce(sum(amount) filter (where type = 'expense' and     shared), 0) as shared_exp,
    coalesce(sum(amount) filter (where type = 'income'  and not shared), 0) as indiv_inc,
    coalesce(sum(amount) filter (where type = 'income'  and     shared), 0) as shared_inc
  from converted
  group by period_month, slot
),
pivot as (
  select
    period_month,
    coalesce(sum(indiv_exp)  filter (where slot = 'userA'), 0) as individual_expenses_a,
    coalesce(sum(indiv_exp)  filter (where slot = 'userB'), 0) as individual_expenses_b,
    coalesce(sum(shared_exp) filter (where slot = 'userA'), 0) as shared_expenses_a,
    coalesce(sum(shared_exp) filter (where slot = 'userB'), 0) as shared_expenses_b,
    coalesce(sum(indiv_inc)  filter (where slot = 'userA'), 0) as individual_income_a,
    coalesce(sum(indiv_inc)  filter (where slot = 'userB'), 0) as individual_income_b,
    coalesce(sum(shared_inc) filter (where slot = 'userA'), 0) as shared_income_a,
    coalesce(sum(shared_inc) filter (where slot = 'userB'), 0) as shared_income_b
  from per_slot
  group by period_month
),
totals as (
  select p.*,
    (shared_expenses_a   + shared_expenses_b) as shared_expenses_total,
    (shared_income_a     + shared_income_b)   as shared_income_total,
    (individual_income_a + shared_income_a)   as total_income_a,
    (individual_income_b + shared_income_b)   as total_income_b
  from pivot p
),
weights as (
  select t.*,
    -- Each slot's share of shared income, used below to apportion shared expenses.
    case when cfg.split_mode = 'equal' then 0.5
         else coalesce(shared_income_a / nullif(shared_income_total, 0), 0) end as income_pct_a,
    case when cfg.split_mode = 'equal' then 0.5
         else coalesce(shared_income_b / nullif(shared_income_total, 0), 0) end as income_pct_b
  from totals t cross join cfg
)
select
  extract(year from w.period_month)::int as year,
  -- Explicit month names rather than to_char(..., 'Month'): locale-independent, and
  -- SheetSummaryRepository compares this label literally ('June2024').
  (array['January','February','March','April','May','June',
         'July','August','September','October','November','December'])
    [extract(month from w.period_month)::int]
    || extract(year from w.period_month)::text                                   as month_label,
  w.period_month,
  w.individual_expenses_a::float8                                                as individual_expenses_a,
  w.individual_expenses_b::float8                                                as individual_expenses_b,
  w.shared_expenses_a::float8                                                    as shared_expenses_a,
  w.shared_expenses_b::float8                                                    as shared_expenses_b,
  w.shared_expenses_total::float8                                                as shared_expenses_total,
  coalesce(w.shared_expenses_a / nullif(w.shared_expenses_total, 0), 0)::float8  as shared_expenses_pct_a,
  coalesce(w.shared_expenses_b / nullif(w.shared_expenses_total, 0), 0)::float8  as shared_expenses_pct_b,
  (w.shared_expenses_a + w.individual_expenses_a)::float8                        as total_expenses_a,
  (w.shared_expenses_b + w.individual_expenses_b)::float8                        as total_expenses_b,
  w.individual_income_a::float8                                                  as individual_income_a,
  w.individual_income_b::float8                                                  as individual_income_b,
  w.shared_income_a::float8                                                      as shared_income_a,
  w.shared_income_b::float8                                                      as shared_income_b,
  w.income_pct_a::float8                                                         as income_pct_a,
  w.income_pct_b::float8                                                         as income_pct_b,
  w.shared_income_total::float8                                                  as shared_income_total,
  w.total_income_a::float8                                                       as total_income_a,
  w.total_income_b::float8                                                       as total_income_b,
  -- Income, minus individual expenses, minus a proportional share of shared expenses.
  (w.total_income_a - w.individual_expenses_a - (w.shared_expenses_total * w.income_pct_a))::float8 as savings_a,
  (w.total_income_b - w.individual_expenses_b - (w.shared_expenses_total * w.income_pct_b))::float8 as savings_b,
  (w.shared_income_total - w.shared_expenses_total)::float8                                         as household_savings,
  coalesce((w.total_income_a - w.individual_expenses_a - (w.shared_expenses_total * w.income_pct_a))
             / nullif(w.total_income_a, 0), 0)::float8                                              as savings_pct_a,
  coalesce((w.total_income_b - w.individual_expenses_b - (w.shared_expenses_total * w.income_pct_b))
             / nullif(w.total_income_b, 0), 0)::float8                                              as savings_pct_b,
  coalesce((w.shared_income_total - w.shared_expenses_total)
             / nullif(w.shared_income_total, 0), 0)::float8                                         as household_savings_pct,
  (case when cfg.settlement_enabled
        then greatest(0, (w.income_pct_a * w.shared_expenses_total) - w.shared_expenses_a)
        else 0 end)::float8                                                                         as settlement_a_to_b,
  (case when cfg.settlement_enabled
        then greatest(0, (w.income_pct_b * w.shared_expenses_total) - w.shared_expenses_b)
        else 0 end)::float8                                                                         as settlement_b_to_a,
  (w.shared_income_total
     - (w.shared_expenses_b + w.individual_expenses_b)
     - (w.shared_expenses_a + w.individual_expenses_a))::float8                                     as net_household_savings,
  -- Every figure above is denominated in this currency.
  cfg.main_currency                                                                                 as currency
from weights w cross join cfg;
