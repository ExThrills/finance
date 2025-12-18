# Ledgerly - Personal Finance Starter (Supabase)

Spreadsheet-style finance app built with Next.js, Tailwind, shadcn/ui, TanStack Table, Recharts, and Supabase (no Prisma now).

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Table (editable cells)
- Recharts
- Supabase (Postgres) via `@supabase/supabase-js`

## Environment
Copy `.env.example` to `.env` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
Use the **pooler** or **direct** DB connection strings to generate these keys in Supabase. The service role key is required on the server for CRUD.

## Supabase schema
Run the SQL in `supabase/schema.sql` in the Supabase SQL editor (or psql) to create tables/indexes.

## Seed data
After the schema exists:
```bash
npm install
npm run db:seed   # uses SUPABASE_SERVICE_ROLE_KEY
```
Seed creates `demo@ledgerly.app` (password `ledgerly-demo`), starter accounts, categories, and sample transactions.

## Dev server
```bash
npm run dev
```
Open `http://localhost:3000`.

## Pages
- `/` Dashboard with charts and month selector
- `/transactions` Spreadsheet-style transactions with inline editing
- `/accounts` Accounts manager
- `/categories` Categories manager
- `/settings` Custom fields

## Notes
- Amounts are stored in cents but displayed as dollars.
- Auth is a local stub: the first user in Supabase is used. Swap to a real auth provider when ready.
- Route Handlers power CRUD APIs using the Supabase service role key.
