# Implementation To-Do (based on GAMEPLAN.md)

## 1) Data Model & Types
- [x] Migrations: extend accounts with type/institution/last4/limits/APR/statement close/due dates; add balance fields and sync metadata (last_sync_at, sync_status).
- [x] Migrations: transfers table (source_account_id, dest_account_id, transfer_group_id), pending/cleared flags on transactions, recurring detection hints, reward currency fields on cards.
- [x] Types: regenerate Supabase types; update `src/types/database.ts` and Zod schemas.
- [x] Seed data: update seed script to include multiple checking/savings/cards with realistic balances and transfers.

## 2) Posting & Transaction Flows
- [x] API: transaction create/update to require account selection and support pending/cleared/transfer flags (recurring fields stored).
- [x] API: transfers/payment endpoint to create dual-leg entries (e.g., checking → credit card payment).
- [x] UI: transaction composer adds pending toggle and transfer/payment toggle with destination account enforcement.
- [x] API: splits/tags support on create/update; schema and seed updated. UI for splits/tags still pending.

## 3) Views, Filters, and Saved Searches
- [x] Filters: by account, account type (checking/savings/credit), institution, category, date, tags, pending/cleared.
- [x] Uncategorized inbox view to clear unassigned items fast.
- [x] Saved views with persistence (per user) for common slices (e.g., "Gas on Amex", "Travel on Checking").

## 4) Budgets & Alerts
- [x] Budgets: per category and per account/card with monthly/weekly periods; track actual vs target.
- [x] Alerts: low cash, high utilization thresholds, unusual spend, large tx, missed syncs; delivery via email/webhook.
- [x] Credit utilization: compute per-card and aggregate; surface warnings.

## 5) Reconciliation & Controls
- [x] Statement periods per account; reconciliation checklist for pending vs cleared vs statement items.
- [x] Lock reconciled periods; audit log for edits (who/when/what changed).
- [x] Manual balance adjustments with memo + audit trail.

## 6) Balances, Sync, and Health
- [x] Balance service: poll/sync balances (placeholder/manual now; Plaid/Supabase functions later); store staleness timestamps.
- [x] UI: account dashboard with balance, available credit, utilization, rewards, next close/due, last sync status.
- [x] Connector health badges (last success, errors, MFA required).

## 7) Cash Flow & Projections
- [x] Recurring detection (simple heuristic) and recurring model storage.
- [x] Projected cash curve combining recurring inflows/outflows, due dates, card payments.
- [x] What-if simulator for payoff strategies (e.g., avalanche vs snowball) and transfer impacts.

## 8) Automation & Rules
- [x] Rule engine: if/then on merchant/MCC/amount/account to set category/tags/notes/splits.
- [x] Auto-transfer suggestions to rebalance envelopes or pay cards before due dates.
- [x] Webhooks: outbound alerts; inbound hooks for sync events.

## 9) UX Polish
- [x] Global account switcher to pivot dashboards by account/card/type.
- [x] Card dashboard widgets (balance, available credit, utilization, rewards, statement dates, recent activity).
- [x] Transaction table polish: batch actions, quick filters, inline category/account edits.

## 10) QA & Ops
- [x] Add end-to-end tests for transaction creation (account required), transfers, reconciliations, budgets, and alerts.
- [x] Load test critical queries (transactions by account/date) and add indexes if needed.
- [x] Backups/exports: CSV/Parquet per account/category/date; scheduled exports to storage.
