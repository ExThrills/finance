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
  created_at timestamptz not null default now()
);
create index if not exists idx_accounts_user_id on public.accounts(user_id);

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
