-- loot-tracker: the derived reporting views.
--
-- SECURITY: every view below declares `security_invoker = on`. Without it a view runs
-- with its *owner's* privileges (postgres), which silently bypasses the row-level
-- security enabled on the base tables — so the anon key could read the household's
-- entire finances through these views even though it cannot read `expenses` directly.
-- Do not remove it. (Requires PG15+; Supabase is well past that.)

-- Expands one purchase into N monthly installments, each converted into the configured
-- main currency at two different exchange rates.

create view expenses_by_installments with (security_invoker = on) as
with cfg as (
  select
    (select value #>> '{}' from app_config where key = 'main_currency')         as main_currency,
    (select value #>> '{}' from app_config where key = 'rate_fallback_policy')  as rate_fallback,
    (select value #>> '{}' from app_config where key = 'installment_date_mode') as date_mode
),
expanded as (
  select
    e.id                                       as expense_id,
    e.category, e.installments, e.currency, e.notes, e.type, e.shared, e.user_id,
    e.amount / greatest(e.installments, 1)     as installment_amount,
    g.j + 1                                    as installment_number,
    date_trunc('month', e.occurred_at)::date   as origin_month,
    -- Always origin + j months, independent of the day-of-month rule below, so no
    -- date mode can shift money between monthly summaries.
    (date_trunc('month', e.occurred_at)::date + (g.j || ' months')::interval)::date as period_month,
    case cfg.date_mode
      when 'legacy_overflow' then
        -- Overflows a short month: 2024-01-31 + 1m becomes 2024-03-02, so February
        -- receives no installment and March is charged twice. Matches cuotificar.gs.
        ((date_trunc('month', e.occurred_at)::date + (g.j || ' months')::interval)::date
          + (extract(day from e.occurred_at)::int - 1))
      else
        -- 'clamp' (default): Postgres-native, 2024-01-31 + 1m becomes 2024-02-29.
        (e.occurred_at + (g.j || ' months')::interval)::date
    end                                        as period_date
  from expenses e
  cross join cfg
  cross join lateral generate_series(0, greatest(e.installments, 1) - 1) as g(j)
),
-- Every (month, currency) pair the conversion needs, resolved once under the policy.
needed as (
  select period_month as period, currency from expanded
  union select origin_month, currency from expanded
  union select period_month, (select main_currency from cfg) from expanded
  union select origin_month, (select main_currency from cfg) from expanded
),
resolved as (
  select n.period, n.currency,
    (select r.units_per_usd
       from exchange_rates r
      where r.currency = n.currency
        and ( r.period = n.period                                                   -- exact match
              or (cfg.rate_fallback = 'nearest_preceding' and r.period <= n.period) -- carry forward
              or  cfg.rate_fallback = 'latest' )                                    -- newest ever (legacy)
      order by (r.period = n.period) desc, r.period desc
      limit 1) as units_per_usd
  from needed n cross join cfg
)
select
  x.expense_id, x.category, x.installments, x.installment_number,
  x.notes, x.type, x.shared, x.user_id,
  x.period_date,
  x.period_month,
  to_char(x.period_month, 'YYYY-MM')                as period_key,
  x.origin_month,
  -- Each amount is paired with its currency so a change to app_config.main_currency
  -- cannot reinterpret rows computed under the old one.
  x.installment_amount                              as amount_local,
  x.currency                                        as currency_local,
  coalesce(round(x.installment_amount / nullif(rc.units_per_usd, 0) * rm.units_per_usd, 4), 0)
                                                    as amount_at_period,   -- installment-month rate
  cfg.main_currency                                 as currency_at_period,
  coalesce(round(x.installment_amount / nullif(oc.units_per_usd, 0) * om.units_per_usd, 4), 0)
                                                    as amount_at_origin,   -- purchase-month rate
  cfg.main_currency                                 as currency_at_origin
from expanded x
cross join cfg
left join resolved rc on rc.period = x.period_month and rc.currency = x.currency
left join resolved rm on rm.period = x.period_month and rm.currency = cfg.main_currency
left join resolved oc on oc.period = x.origin_month and oc.currency = x.currency
left join resolved om on om.period = x.origin_month and om.currency = cfg.main_currency;


create view summary_by_categories with (security_invoker = on) as
select
  i.category,
  coalesce(c.type, 'expense')            as type,      -- unmatched category => expense
  i.user_id,
  i.shared,
  i.period_key                           as period,    -- 'YYYY-MM'
  sum(i.amount_at_period)                as amount,
  max(i.currency_at_period)              as currency   -- constant per row set; paired with amount
from expenses_by_installments i
left join categories c on c.name = i.category          -- expenses reference categories by name
group by i.category, coalesce(c.type, 'expense'), i.user_id, i.shared, i.period_key
having sum(i.amount_at_period) > 0;


-- The 28-column, two-slot household summary. Alias prefixes (c_, d_, e_ ...) are the
-- spreadsheet column letters each figure corresponds to.

create view summary with (security_invoker = on) as
with cfg as (
  select
    (select (value #>> '{}')::boolean from app_config where key = 'settlement_enabled') as settlement_enabled,
    (select value #>> '{}' from app_config where key = 'shared_split_mode')             as split_mode,
    (select value #>> '{}' from app_config where key = 'main_currency')                 as main_currency
),
per_slot as (
  select
    i.period_month,
    b.slot,
    coalesce(sum(i.amount_at_period) filter (where i.type = 'expense' and not i.shared), 0) as indiv_exp,
    coalesce(sum(i.amount_at_period) filter (where i.type = 'expense' and     i.shared), 0) as shared_exp,
    coalesce(sum(i.amount_at_period) filter (where i.type = 'income'  and not i.shared), 0) as indiv_inc,
    coalesce(sum(i.amount_at_period) filter (where i.type = 'income'  and     i.shared), 0) as shared_inc
  from expenses_by_installments i
  join budget_users b on b.id = i.user_id and b.slot is not null
  group by i.period_month, b.slot
),
pivot as (
  select
    period_month,
    coalesce(sum(indiv_exp)  filter (where slot = 'userA'), 0) as c_indiv_exp_a,
    coalesce(sum(indiv_exp)  filter (where slot = 'userB'), 0) as d_indiv_exp_b,
    coalesce(sum(shared_exp) filter (where slot = 'userA'), 0) as e_shared_exp_a,
    coalesce(sum(shared_exp) filter (where slot = 'userB'), 0) as f_shared_exp_b,
    coalesce(sum(indiv_inc)  filter (where slot = 'userA'), 0) as l_indiv_inc_a,
    coalesce(sum(indiv_inc)  filter (where slot = 'userB'), 0) as m_indiv_inc_b,
    coalesce(sum(shared_inc) filter (where slot = 'userA'), 0) as n_shared_inc_a,
    coalesce(sum(shared_inc) filter (where slot = 'userB'), 0) as o_shared_inc_b
  from per_slot
  group by period_month
),
totals as (
  select p.*,
    (e_shared_exp_a + f_shared_exp_b) as g_shared_exp_total,
    (n_shared_inc_a + o_shared_inc_b) as r_shared_inc_total,
    (l_indiv_inc_a  + n_shared_inc_a) as s_total_inc_a,
    (m_indiv_inc_b  + o_shared_inc_b) as t_total_inc_b
  from pivot p
),
weights as (
  select t.*,
    -- Each slot's share of shared income, used below to apportion shared expenses.
    case when cfg.split_mode = 'equal' then 0.5
         else coalesce(n_shared_inc_a / nullif(r_shared_inc_total, 0), 0) end as p_income_pct_a,
    case when cfg.split_mode = 'equal' then 0.5
         else coalesce(o_shared_inc_b / nullif(r_shared_inc_total, 0), 0) end as q_income_pct_b
  from totals t cross join cfg
)
select
  extract(year from w.period_month)::int as year,
  -- Explicit month names rather than to_char(..., 'Month'): locale-independent, and
  -- SheetSummaryRepository compares this label literally ('June2024').
  (array['January','February','March','April','May','June',
         'July','August','September','October','November','December'])
    [extract(month from w.period_month)::int]
    || extract(year from w.period_month)::text                    as month_label,
  w.period_month,
  w.c_indiv_exp_a, w.d_indiv_exp_b,
  w.e_shared_exp_a, w.f_shared_exp_b,
  w.g_shared_exp_total,
  coalesce(w.e_shared_exp_a / nullif(w.g_shared_exp_total, 0), 0) as h_shared_pct_a,
  coalesce(w.f_shared_exp_b / nullif(w.g_shared_exp_total, 0), 0) as i_shared_pct_b,
  (w.e_shared_exp_a + w.c_indiv_exp_a)                            as j_total_exp_a,
  (w.f_shared_exp_b + w.d_indiv_exp_b)                            as k_total_exp_b,
  w.l_indiv_inc_a, w.m_indiv_inc_b,
  w.n_shared_inc_a, w.o_shared_inc_b,
  w.p_income_pct_a, w.q_income_pct_b,
  w.r_shared_inc_total,
  w.s_total_inc_a, w.t_total_inc_b,
  -- U / V: income - individual expenses - proportional share of shared expenses
  (w.s_total_inc_a - w.c_indiv_exp_a - (w.g_shared_exp_total * w.p_income_pct_a)) as u_savings_a,
  (w.t_total_inc_b - w.d_indiv_exp_b - (w.g_shared_exp_total * w.q_income_pct_b)) as v_savings_b,
  (w.r_shared_inc_total - w.g_shared_exp_total)                                   as w_household_savings,
  coalesce((w.s_total_inc_a - w.c_indiv_exp_a - (w.g_shared_exp_total * w.p_income_pct_a))
             / nullif(w.s_total_inc_a, 0), 0)                                     as x_savings_pct_a,
  coalesce((w.t_total_inc_b - w.d_indiv_exp_b - (w.g_shared_exp_total * w.q_income_pct_b))
             / nullif(w.t_total_inc_b, 0), 0)                                     as y_savings_pct_b,
  coalesce((w.r_shared_inc_total - w.g_shared_exp_total)
             / nullif(w.r_shared_inc_total, 0), 0)                                as z_household_savings_pct,
  case when cfg.settlement_enabled
       then greatest(0, (w.p_income_pct_a * w.g_shared_exp_total) - w.e_shared_exp_a)
       else 0 end                                                                 as aa_settlement_a_to_b,
  case when cfg.settlement_enabled
       then greatest(0, (w.q_income_pct_b * w.g_shared_exp_total) - w.f_shared_exp_b)
       else 0 end                                                                 as ab_settlement_b_to_a,
  (w.r_shared_inc_total - w.k_total_exp_b - w.j_total_exp_a)                      as ac_net_household_savings,
  -- Every figure above is denominated in this currency.
  cfg.main_currency                                                               as currency
from weights w cross join cfg;
