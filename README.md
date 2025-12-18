# Ledgerly - Personal Finance Starter

Ledgerly is a spreadsheet-style personal finance app built with Next.js, Tailwind, shadcn/ui, TanStack Table, Recharts, Prisma, and Postgres.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Table (editable cells)
- Recharts
- Prisma + Postgres

## Local setup
1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Update `DATABASE_URL` in `.env` to your Postgres connection string.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed sample data:
   ```bash
   npm run db:seed
   ```
6. Start the dev server:
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
- Auth is a local stub: the app uses the first user in the database. Seed creates `demo@ledgerly.app` with password `ledgerly-demo`.
- Route Handlers power CRUD APIs (no server actions yet). You can swap to Clerk or Supabase Auth later by updating `lib/auth.ts` and securing the API routes.
