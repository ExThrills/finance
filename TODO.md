# Implementation To-Do (based on GAMEPLAN.md)

## 1) Data Model & Types
- [ ] Migrations: extend accounts with type/institution/last4/limits/APR/statement close/due dates; add balance fields and sync metadata (last_sync_at, sync_status).
- [ ] Migrations: transfers table (source_account_id, dest_account_id, transfer_group_id), pending/cleared flags on transactions, recurring detection hints, reward currency fields on cards.
- [ ] Types: regenerate Supabase types; update `src/types/database.ts` and Zod schemas.
- [ ] Seed data: update seed script to include multiple checking/savings/cards with realistic balances and transfers.

## 2) Posting & Transaction Flows
- [ ] API: transaction create/update to require account selection, allow pending/cleared, support splits (child rows) and transfer/payment links.
- [ ] API: transfers/payment endpoints to create dual-leg entries (e.g., checking → credit card payment).
- [ ] UI: transaction composer with account picker, category picker, tags, splits, and transfer/payment toggle.
- [ ] UI: enforce/pay-from/pay-to selection; handle card payments and account transfers cleanly.

## 3) Views, Filters, and Saved Searches
- [ ] Filters: by account, account type (checking/savings/credit), institution, category, date, tags, pending/cleared.
- [ ] Uncategorized inbox view to clear unassigned items fast.
- [ ] Saved views with persistence (per user) for common slices (e.g., “Gas on Amex”, “Travel on Checking”).

## 4) Budgets & Alerts
- [ ] Budgets: per category and per account/card with monthly/weekly periods; track actual vs target.
- [ ] Alerts: low cash, high utilization thresholds, unusual spend, large tx, missed syncs; delivery via email/webhook.
- [ ] Credit utilization: compute per-card and aggregate; surface warnings.

## 5) Reconciliation & Controls
- [ ] Statement periods per account; reconciliation checklist for pending vs cleared vs statement items.
- [ ] Lock reconciled periods; audit log for edits (who/when/what changed).
- [ ] Manual balance adjustments with memo + audit trail.

## 6) Balances, Sync, and Health
- [ ] Balance service: poll/sync balances (placeholder/manual now; Plaid/Supabase functions later); store staleness timestamps.
- [ ] UI: account dashboard with balance, available credit, utilization, rewards, next close/due, last sync status.
- [ ] Connector health badges (last success, errors, MFA required).

## 7) Cash Flow & Projections
- [ ] Recurring detection (simple heuristic) and recurring model storage.
- [ ] Projected cash curve combining recurring inflows/outflows, due dates, card payments.
- [ ] What-if simulator for payoff strategies (e.g., avalanche vs snowball) and transfer impacts.

## 8) Automation & Rules
- [ ] Rule engine: if/then on merchant/MCC/amount/account to set category/tags/notes/splits.
- [ ] Auto-transfer suggestions to rebalance envelopes or pay cards before due dates.
- [ ] Webhooks: outbound alerts; inbound hooks for sync events.

## 9) UX Polish
- [ ] Global account switcher to pivot dashboards by account/card/type.
- [ ] Card dashboard widgets (balance, available credit, utilization, rewards, statement dates, recent activity).
- [ ] Transaction table polish: batch actions, quick filters, inline category/account edits.

## 10) QA & Ops
- [ ] Add end-to-end tests for transaction creation (account required), transfers, reconciliations, budgets, and alerts.
- [ ] Load test critical queries (transactions by account/date) and add indexes if needed.
- [ ] Backups/exports: CSV/Parquet per account/category/date; scheduled exports to storage.
