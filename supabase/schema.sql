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
