-- loot-tracker: initial schema for DATA_SOURCE=db
--
-- Single-household by design: no household_id, no tenancy.
--
-- Values are canonical English. The Spanish enums the sheet backends use
-- (Ingreso/Egreso, Si/No) are translated at the sheet mapper, never stored here.

-- ─────────────────────────── configuration ───────────────────────────

create table currencies (
  code           text primary key,                    -- ISO 4217
  name           text     not null,
  symbol         text     not null,
  decimal_places smallint not null default 2,
  enabled        boolean  not null default true,
  sort_order     smallint not null default 0
);

-- Every setting the app understands. A type rather than free text because the reporting
-- views select each of these by name: a misspelled key then fails `create view` instead
-- of returning null and silently taking a default branch.
--
-- Adding a key: `alter type ... add value` must land in its own migration, ahead of the
-- one that inserts it — Postgres will not let a value be used in the transaction that
-- creates it. Values cannot be dropped, only renamed.
create type app_config_key as enum (
  'main_currency',
  'default_expense_currency',
  'locale',
  'timezone',
  'shared_split_mode',
  'rate_fallback_policy',
  'installment_date_mode',
  'settlement_enabled'
);

create table app_config (
  key         app_config_key primary key,
  value       jsonb          not null,
  description text,
  updated_at  timestamptz    not null default now(),

  -- Carries the value of the two currency settings and null for every other key, so that
  -- a currency the household does not have cannot be named as the reporting currency.
  currency_ref text generated always as (
    case when key in ('main_currency', 'default_expense_currency') then value #>> '{}' end
  ) stored references currencies(code),

  -- `else false` is deliberate: a key added to the enum cannot be stored until its
  -- accepted values are declared here.
  constraint app_config_value_valid check (
    case key
      when 'main_currency'            then jsonb_typeof(value) = 'string'
      when 'default_expense_currency' then jsonb_typeof(value) = 'string'
      when 'locale'                   then jsonb_typeof(value) = 'string'
      when 'timezone'                 then jsonb_typeof(value) = 'string'
      when 'shared_split_mode'        then value #>> '{}' in ('income_proportional', 'equal')
      when 'rate_fallback_policy'     then value #>> '{}' in ('nearest_preceding', 'latest', 'none')
      when 'installment_date_mode'    then value #>> '{}' in ('clamp', 'legacy_overflow')
      when 'settlement_enabled'       then jsonb_typeof(value) = 'boolean'
      else false
    end
  )
);

-- Maps a budget-user id to a fixed household slot. Only non-null slots participate in
-- the summary pivot; this is how a view resolves slots without reading env vars.
create table budget_users (
  id         text primary key,                        -- BUDGET_USER_A / _B value, e.g. 'user-a'
  label      text not null,
  slot       text unique check (slot in ('userA','userB')),
  sort_order smallint not null default 0
);

-- ─────────────────────────── core data ───────────────────────────────

-- `user_id` is FK-free everywhere: it is a free-form string that also carries sentinel
-- values such as 'shared', and exports contain ids outside the current config.
create table categories (
  id         text primary key,
  name       text not null,
  emoji      text,
  type       text not null check (type in ('income','expense')),
  user_id    text,                                    -- budget user id, or 'shared'
  sort_order smallint not null default 0
);
create index categories_name_idx on categories (name);

create table expenses (
  id           text          primary key default gen_random_uuid()::text,
  occurred_at  timestamptz   not null,

  -- The household's own calendar, derived once here rather than in each reporting view.
  -- The zone literal is a deployment property and must match app_config.timezone;
  -- changing it moves late-evening expenses between monthly summaries.
  occurred_local timestamp generated always as
    (occurred_at at time zone 'America/Argentina/Buenos_Aires') stored,
  period         date      generated always as
    (date_trunc('month', occurred_at at time zone 'America/Argentina/Buenos_Aires')::date) stored,

  -- Category name, not an FK: names are the join key, and data contains names with
  -- no matching category row.
  category     text          not null,
  amount       numeric(14,2) not null check (amount >= 0),
  installments smallint      not null default 1 check (installments >= 1),
  currency     text          not null references currencies(code),
  notes        text          not null default '',
  type         text          not null check (type in ('income','expense')),
  shared       boolean       not null default false,
  user_id      text          not null,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);
create index expenses_period_idx   on expenses (period);
create index expenses_user_id_idx  on expenses (user_id);
create index expenses_category_idx on expenses (category);

create table habit_categories (
  id            text primary key,
  name          text not null,
  emoji         text,
  default_value boolean  not null default false,
  sort_order    smallint not null default 0
);

create table habits (
  day         date    not null,
  category_id text    not null references habit_categories(id),
  user_id     text    not null,
  value       boolean not null,
  primary key (day, category_id, user_id)
);
create index habits_day_idx on habits (day);

-- ─────────────────────────── FX ──────────────────────────────────────

-- USD-anchored: units of `currency` per 1 USD. A USD row of 1.0 must exist for every
-- period or the conversion joins in the views drop rows.
create table exchange_rates (
  period        date           not null,              -- first day of the month
  currency      text           not null references currencies(code),
  units_per_usd numeric(20,10) not null check (units_per_usd > 0),
  primary key (period, currency)
);

-- ─────────────────────────── RLS ─────────────────────────────────────
-- Enabled with no policies: anon/authenticated get nothing, and the server reaches
-- these tables with the service-role key, which bypasses RLS.

alter table app_config       enable row level security;
alter table currencies       enable row level security;
alter table budget_users     enable row level security;
alter table categories       enable row level security;
alter table expenses         enable row level security;
alter table habit_categories enable row level security;
alter table habits           enable row level security;
alter table exchange_rates   enable row level security;
