-- Core schema for Ledgerly (Supabase / Postgres)

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking','savings','credit','cash','investment','other')),
  institution text,
  last4 text,
  credit_limit integer,
  apr numeric,
  statement_close_day smallint,
  statement_due_day smallint,
  current_balance integer not null default 0,
  available_balance integer,
  available_credit integer,
  reward_currency text,
  last_sync_at timestamptz,
  sync_status text not null default 'manual' check (sync_status in ('manual','ok','error','disconnected','pending')),
  sync_error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_accounts_user_id on public.accounts(user_id);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_account_id uuid not null references public.accounts(id) on delete cascade,
  destination_account_id uuid not null references public.accounts(id) on delete cascade,
  amount integer not null,
  memo text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  transfer_group_id uuid
);
create index if not exists idx_transfers_user on public.transfers(user_id);
create index if not exists idx_transfers_occurred on public.transfers(occurred_at);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense','income')),
  created_at timestamptz not null default now(),
  constraint categories_unique_user_name_kind unique (user_id, name, kind)
);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_categories_user_kind on public.categories(user_id, kind);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount integer not null,
  date date not null,
  description text not null,
  notes text,
  is_pending boolean not null default false,
  cleared_at timestamptz,
  transfer_id uuid references public.transfers(id) on delete set null,
  recurring_group_key text,
  recurring_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_transactions_category on public.transactions(category_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_account_date on public.transactions(account_id, date);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date);

create table if not exists public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('text','number','date','boolean','select')),
  select_options jsonb,
  created_at timestamptz not null default now(),
  constraint field_definitions_unique_name unique (user_id, name)
);
create index if not exists idx_field_definitions_user on public.field_definitions(user_id);

create table if not exists public.transaction_field_values (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  field_definition_id uuid not null references public.field_definitions(id) on delete cascade,
  value_text text,
  value_number double precision,
  value_date date,
  value_bool boolean,
  constraint transaction_field_values_unique unique (transaction_id, field_definition_id)
);
create index if not exists idx_tfvs_transaction on public.transaction_field_values(transaction_id);
create index if not exists idx_tfvs_definition on public.transaction_field_values(field_definition_id);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint tags_unique_user_name unique (user_id, name)
);
create index if not exists idx_tags_user on public.tags(user_id);

create table if not exists public.transaction_tags (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  constraint transaction_tags_unique unique (transaction_id, tag_id)
);
create index if not exists idx_transaction_tags_tx on public.transaction_tags(transaction_id);
create index if not exists idx_transaction_tags_tag on public.transaction_tags(tag_id);

create table if not exists public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  amount integer not null,
  description text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_splits_tx on public.transaction_splits(transaction_id);
create index if not exists idx_splits_account on public.transaction_splits(account_id);
create index if not exists idx_splits_category on public.transaction_splits(category_id);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint saved_views_unique_user_name unique (user_id, name)
);
create index if not exists idx_saved_views_user on public.saved_views(user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  scope_type text not null check (scope_type in ('category','account')),
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  period text not null check (period in ('monthly','weekly')),
  target_amount integer not null,
  starts_on date,
  created_at timestamptz not null default now(),
  constraint budgets_unique_user_name unique (user_id, name)
);
create index if not exists idx_budgets_user on public.budgets(user_id);
create index if not exists idx_budgets_category on public.budgets(category_id);
create index if not exists idx_budgets_account on public.budgets(account_id);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  rule_type text not null check (rule_type in ('low_cash','high_utilization','unusual_spend','large_tx','missed_sync')),
  severity text not null default 'medium' check (severity in ('low','medium','high')),
  channel text not null default 'in_app' check (channel in ('in_app','webhook','email')),
  enabled boolean not null default true,
  threshold_amount integer,
  threshold_percent numeric,
  lookback_days integer,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  webhook_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_alert_rules_user on public.alert_rules(user_id);
create index if not exists idx_alert_rules_type on public.alert_rules(rule_type);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  rule_id uuid references public.alert_rules(id) on delete set null,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
create index if not exists idx_alerts_user on public.alerts(user_id);
create index if not exists idx_alerts_rule on public.alerts(rule_id);

create table if not exists public.statement_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  locked boolean not null default false,
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_statement_periods_user on public.statement_periods(user_id);
create index if not exists idx_statement_periods_account on public.statement_periods(account_id);
create index if not exists idx_statement_periods_dates on public.statement_periods(start_date, end_date);

create table if not exists public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount integer not null,
  memo text,
  effective_date date not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_balance_adjustments_user on public.balance_adjustments(user_id);
create index if not exists idx_balance_adjustments_account on public.balance_adjustments(account_id);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_events_user on public.audit_events(user_id);
create index if not exists idx_audit_events_entity on public.audit_events(entity_type, entity_id);

create table if not exists public.recurring_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount integer not null,
  cadence text not null check (cadence in ('weekly','monthly')),
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_recurring_series_user on public.recurring_series(user_id);
create index if not exists idx_recurring_series_account on public.recurring_series(account_id);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  priority integer not null default 0,
  only_uncategorized boolean not null default true,
  match_description text,
  match_amount_min integer,
  match_amount_max integer,
  match_account_id uuid references public.accounts(id) on delete set null,
  match_category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_rules_user on public.automation_rules(user_id);
create index if not exists idx_automation_rules_enabled on public.automation_rules(enabled);

create table if not exists public.rule_actions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  action_type text not null check (action_type in ('set_category','add_tag','set_note','set_splits')),
  action_payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rule_actions_rule on public.rule_actions(rule_id);
