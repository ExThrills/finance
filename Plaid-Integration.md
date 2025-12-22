# Plaid Integration (Sandbox First) for Nestfolio

This guide is tailored to our current Next.js + Supabase setup. The goal is to let users connect bank accounts, credit cards, loans, and investments so we can sync balances and transactions automatically.

## Goals
- Fast onboarding for users who do not want manual entry.
- Automatic sync of balances and transactions.
- Server-only handling of Plaid tokens and secrets.

## Environment (Sandbox First)
- Use **Sandbox** for initial testing.
- Test credentials:
  - Username: `user_good`
  - Password: `pass_good`
  - MFA (if prompted): `1234`
- Sandbox supports test items only. Items cannot move between environments.

## Dependencies
```bash
npm install plaid react-plaid-link
```

## Environment Variables
Add to `.env.local`:
```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Data Model (Aligned to Current Schema)
We already have `accounts`, `transactions`, and `categories`. We will add Plaid mapping tables for Items and account linkage, plus a cursor for sync.

### New Tables (Proposed)
- `plaid_items`
  - `id` (uuid, PK)
  - `user_id` (uuid, references `public.users.id`)
  - `item_id` (text, Plaid Item ID)
  - `access_token` (text, store encrypted if possible)
  - `institution_name` (text)
  - `institution_id` (text)
  - `status` (text)
  - `created_at` (timestamptz)
- `plaid_accounts`
  - `id` (uuid, PK)
  - `user_id` (uuid)
  - `item_id` (text)
  - `plaid_account_id` (text, unique)
  - `account_id` (uuid, references `accounts.id`)
  - `mask` (text)
  - `type` (text)
  - `subtype` (text)
- `plaid_sync_state`
  - `id` (uuid, PK)
  - `item_id` (text)
  - `cursor` (text)
  - `last_synced_at` (timestamptz)

### Transaction Mapping (Choose One)
Option A (preferred): add columns to `transactions`:
- `plaid_transaction_id` (text, unique)
- `plaid_account_id` (text)
- `source` (text, e.g., `plaid`)

Option B: keep `transactions` unchanged and add `plaid_transaction_map`:
- `id` (uuid)
- `transaction_id` (uuid, references `transactions.id`)
- `plaid_transaction_id` (text, unique)
- `plaid_account_id` (text)

We need one of these for deduping and sync.

## Backend Flow (Next.js Route Handlers)
We will use server routes and `getCurrentUserId()` from `src/lib/auth` to avoid trusting client user IDs.

### 1) Plaid Client Setup
Create `src/lib/plaid.ts`:
```ts
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const env = process.env.PLAID_ENV ?? "sandbox";

const config = new Configuration({
  basePath: PlaidEnvironments[env as "sandbox" | "development" | "production"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

export const plaidClient = new PlaidApi(config);
```

### 2) Create Link Token
Route: `POST /api/plaid/link-token`
- Use `getCurrentUserId()`.
- Create Link token with `transactions` and optional `balance`, `liabilities`, `investments`.

### 3) Exchange Public Token
Route: `POST /api/plaid/exchange-token`
- Exchange `public_token` for `access_token`.
- Store in `plaid_items`.
- Fetch accounts via `/accounts/get` and map into our `accounts` table.
- Create mapping entries in `plaid_accounts`.

### 4) Initial Sync (Transactions + Balances)
Route: `POST /api/plaid/sync`
- For each `plaid_item`, call `/transactions/sync` with cursor.
- Upsert new and modified transactions into our `transactions` table.
- Remove deleted transactions if Plaid marks them removed.
- Update account balances with `/accounts/balance/get`.

### 5) Webhook (Optional but Recommended)
Route: `POST /api/plaid/webhook`
- On `SYNC_UPDATES_AVAILABLE`, call `/transactions/sync`.

## Mapping to Our Data Model
- **Amounts**: Plaid returns decimal dollars. Convert to cents for our `transactions.amount`.
- **Account types**: map Plaid types to our account types:
  - `depository` -> `checking` or `savings` (use subtype)
  - `credit` -> `credit`
  - `loan` -> `loan`
  - `investment` -> `investment`
- **Categories**: optional. We can create or map to existing categories; otherwise default to uncategorized.
- **Pending**: set `transactions.isPending` from Plaid `pending`.

## Frontend Flow (Plaid Link)
- Client requests Link token from `/api/plaid/link-token`.
- Use `react-plaid-link` to open Plaid Link.
- On success, post `public_token` to `/api/plaid/exchange-token`.
- Trigger `/api/plaid/sync` after exchange to populate transactions and balances.

## Sandbox Testing Checklist
1) Open Setup Hub → Connect Accounts.
2) Choose a sandbox institution.
3) Use `user_good` / `pass_good`.
4) Confirm accounts created in `accounts` and mappings in `plaid_accounts`.
5) Run `/api/plaid/sync` and verify transactions in `transactions`.

## Security Notes
- Never expose `access_token`, `client_id`, or `secret` to the client.
- Store tokens server-side only.
- Log Plaid `request_id` in error cases.

## Open Questions
- Which products do we want in v1 (Transactions, Balance, Liabilities, Investments)?
- Should we create categories automatically or keep uncategorized by default?
- How should we handle manual vs synced accounts in UI?
