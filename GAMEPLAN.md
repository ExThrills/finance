# Finance Control Game Plan

## Core Account & Balance Model
- **Account taxonomy:** Support multiple checking, savings, credit cards, loans, and investment “accounts” with typed metadata (institution, last4, interest rate/APR, statement/closing dates, billing cycles).
- **Balance sources:** Two modes per account: (a) manual with running ledger + reconciliations, (b) synced (Plaid/Supabase functions) with refresh timestamps and sync health flags.
- **Liability tracking:** Credit cards and loans store credit limit, current balance, available credit, due date, minimum due, APR, reward currency, and grace-period end; show payoff projection.
- **Cash flow envelopes:** Optional “buckets” or sinking funds mapped to checking/savings to segment cash for rent, taxes, travel, etc.

## Transactions & Posting
- **Multi-account posting:** Each transaction belongs to one source account; UI enforces selection (e.g., “Amex Gold” vs “Checking – Ally” vs “Savings – Chase”).
- **Dual-side moves:** Support transfers and balance payments as two-legged entries (e.g., Checking → Amex payment) with a linked transfer_id.
- **Clearing vs posted:** Status flags (pending/cleared) for card authorizations vs settled transactions; reconciliation view to match statements.
- **Merchant enrichment:** Map raw merchant strings to normalized merchants, categories, and logos; store MCC codes when available.
- **Split transactions:** Allow splits across categories and accounts (e.g., one Costco trip split groceries/household).

## Categorization & Views
- **Flexible dimensions:** Filter/slice by account, account type (checking/savings/credit), institution, card, category, time, and tags.
- **Budgets per dimension:** Budgets by category and by account/card (e.g., “Dining on Amex Gold ≤ $400/month”).
- **Uncategorized inbox:** Zero-inbox workflow to clear uncategorized and pending items quickly.
- **Saved views:** Persisted filters/sorts (e.g., “Gas on Amex”, “Travel on Checking”, “Joint groceries”).

## Balances, Limits, and Alerts
- **Live balances:** Poll/sync balances; show staleness indicator; last-sync timestamp per account.
- **Credit utilization:** Per-card and overall utilization; warnings when utilization exceeds thresholds.
- **Upcoming obligations:** Calendar and list for statement closes, due dates, minimum due amounts; project cash needed.
- **Low/high triggers:** Alerts for low cash, high utilization, unusual spend, large transactions, or missed syncs.

## Cash Flow & Planning
- **Projected balances:** Forward-looking cash curve using recurring bills/paychecks plus known due dates.
- **What-if scenarios:** Simulate payments to cards/loans and see payoff dates and interest saved.
- **Recurring detection:** Auto-detect recurring merchants/amounts; mark as “expected” so misses and spikes stand out.
- **Income allocation:** Rules to auto-allocate paycheck inflows across envelopes or to pay down highest APR first.

## Data Quality & Reconciliation
- **Statement reconciliation:** Per-account statement periods with “to-be-reconciled” totals; check off cleared vs statement items.
- **Lock periods:** Once reconciled, lock a statement period to prevent drift.
- **Audit log:** Track who/when edited transactions, categories, and account metadata.

## Automation & Rules
- **Rule engine:** If/then rules on merchant, amount range, account, MCC to auto-apply category, tags, notes, and splits.
- **Auto-transfer suggestions:** Suggest/check-off transfers to rebalance envelopes or pay cards before due.
- **Webhooks:** Outbound webhooks for alerts, and inbound for Plaid/Supabase functions to push updates.

## UI/UX Concepts
- **Account switcher:** Global pill/segmented control to pivot the whole UI by account/card/savings type.
- **Transaction composer:** Quick-add with account picker, category, tags, splits, and pay-from/pay-to for transfers and card payments.
- **Card dashboard:** Per-card panel showing current balance, available credit, utilization, rewards, statement close/due, and recent transactions.
- **Bank health:** Status badges for each connector (last sync, errors, MFA required).

## Security & Controls
- **Secrets handling:** Service role keys server-only; anon keys for client; rotation checklist.
- **Access roles:** Add multi-user support later (owner, viewer, accountant) with per-account visibility.
- **Backups/exports:** CSV/Parquet exports per account/category/date; scheduled backups to storage.

## Milestones (sequenced)
1) **Data model:** Add account types/metadata, balance fields, transfer linking, pending/cleared flags. Migrations + types.
2) **Posting UI:** Require account selection on create; support transfers and payments; add splits.
3) **Views & filters:** Filters by account/institution/type; saved views; uncategorized inbox.
4) **Budgets & alerts:** Budgets by category/account; low cash/high utilization alerts.
5) **Reconciliation:** Statement periods, reconcile checklist, lock periods.
6) **Projections & what-if:** Recurring detection, projected cash curve, payoff simulator.
7) **Automation:** Rule engine for categorization and auto-transfers; webhooks.
