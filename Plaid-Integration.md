# Plaid Integration Plan (Nestfolio)

This document outlines how we will integrate Plaid to let users securely connect accounts and automatically sync balances and transactions.

## Goals
- Offer a fast account connection flow for users who do not want manual entry.
- Sync balances and transactions automatically and reliably.
- Keep Plaid tokens and sensitive data server-only.

## Core Plaid Flow
1) Server creates a Link token (`/link/token/create`).
2) Client opens Plaid Link with the Link token.
3) Link returns a `public_token` to the client.
4) Client sends `public_token` to server.
5) Server exchanges for `access_token` (`/item/public_token/exchange`).
6) Server stores `access_token` securely and syncs data.

## Environments
- **Sandbox**: test items only.
- **Production**: real user items. Must request access via the Plaid Dashboard.
- Items cannot be moved between environments.

## Data We Need
- Accounts and balances
- Transactions (including updates)
- Liabilities (loans, credit)
- Investments (if enabled)

## Proposed API Routes (Next.js Route Handlers)
- `POST /api/plaid/link-token`
  - Create Link token for the current user.
- `POST /api/plaid/exchange-token`
  - Exchange `public_token` for `access_token` and store.
- `POST /api/plaid/sync`
  - Fetch transactions and balances using sync cursor.
- `POST /api/plaid/webhook`
  - Handle Plaid webhooks and trigger sync.

## Supabase Tables (Proposal)
- `plaid_items`
  - `id`, `user_id`, `item_id`, `access_token`, `institution_name`, `status`, `created_at`
- `plaid_accounts`
  - `id`, `item_id`, `plaid_account_id`, `account_id` (internal), `name`, `type`, `subtype`
- `plaid_sync_state`
  - `id`, `item_id`, `cursor`, `last_synced_at`

## Sync Strategy
- Use `/transactions/sync` with stored cursor for incremental updates.
- Run a sync after Link and on webhook events.
- Update balances via `/accounts/balance/get` when needed.

## Security Notes
- Store `access_token` server-side only.
- Never expose `client_id`, `secret`, or `access_token` on the client.
- Log Plaid `request_id` for support/debugging.

## UX Placement
- Add a “Connect accounts” CTA in Setup Hub.
- Display sync status and last updated time on Accounts.

## Open Questions
- Which Plaid products do we want in v1 (Transactions, Investments, Liabilities)?
- Do we want live balance refresh or scheduled sync only?
- How do we handle manual vs synced accounts in UI?
