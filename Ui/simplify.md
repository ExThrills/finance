# Simplified Onboarding Hub

This document defines a simplified, centralized setup flow so new users can get started quickly without losing access to advanced tools. The core idea is a fast multi-step "Setup Hub" that captures all financial sources (bank accounts, debts, credit cards, investments) plus the minimum structure needed to track correctly.

## Goals
- Provide one clear place to add every financial account (cash, bank, credit, loans, investments).
- Minimize decision fatigue for first-time users while still capturing critical data.
- Preserve advanced capabilities for power users without blocking the basics.
- Keep setup under 2 minutes for typical users (with smart defaults and optional steps).

## Guiding Principles
- Progressive disclosure: show the minimum to complete each step, expand only when needed.
- One primary action per screen.
- Defaults that make sense for typical users.
- Safe fallbacks: allow skipping non-critical fields.

## Setup Hub: Multi-Step Flow
The Setup Hub is a fast, multi-step flow. Each step is skippable unless marked required.

### Step 1: Accounts & Balances (required)
- Multi-row table-like layout so users can add multiple accounts quickly.
- Each row captures:
  - Account name (required)
  - Account type (required; checking, savings, credit, loan, cash, investment, other)
  - Starting balance (required for non-credit)
  - Credit limit (required for credit)
  - Optional: institution, last 4
- Actions:
  - Add another account
  - Remove a row
  - "Skip for now" only if at least one account exists

### Step 2: Debts & Obligations (optional, recommended)
- Add debts that are not credit cards (student loans, auto, mortgage).
- Fields:
  - Lender name
  - Original balance (optional)
  - Current balance (required)
  - APR (optional)
  - Due day (optional)
- If users already added a "loan" account in Step 1, surface it here for confirmation.

### Step 3: Categories & Rules (optional, recommended)
- Offer a default category set with common expenses + income.
- Allow quick add custom categories.
- Optional: add one or two rules (example templates).

### Step 4: Recurring & Paydays (optional)
- Add recurring income (paychecks) and bills (rent, subscriptions).
- Quick templates for common recurring items.
- Toggle to skip and add later.

### Step 5: Quick Review (required)
- Summary totals:
  - Total cash on hand
  - Total credit limits
  - Overall utilization (if credit accounts exist)
  - Total debt balance
  - Recurring net (monthly)
- Inline validation highlights missing required fields.

### Step 6: Finish Setup
- Primary action: "Finish setup" (saves everything and moves to Transactions)
- Secondary: "Review accounts"

## Field Requirements and Validation
Per account row:
- Account name: required, 1+ characters.
- Type: required.
- Starting balance:
  - Required for checking, savings, cash, investment, other.
  - Optional for credit (not required, default 0).
- Credit limit:
  - Required for credit.
  - Not shown for non-credit types.
- Last 4:
  - Optional, exactly 4 digits when provided.
- Statement close/due day:
  - Optional, 1 to 31.
- APR:
  - Optional, non-negative.

Debt rows:
- Lender name: required.
- Current balance: required.
- APR, due day: optional (validate ranges when present).

Recurring rows:
- Name: required.
- Amount: required.
- Frequency: required.

Inline validation behavior:
- Show validation per row instead of global errors.
- Use friendly copy: "Credit cards need a limit" not "Missing field."
- Disable "Finish setup" until all required fields are valid.

## Progressive Disclosure for Advanced Users
- Advanced fields hidden by default to avoid clutter.
- "Show advanced" toggle per row.
- When expanded, add a short hint explaining when the fields matter.
- Keep advanced fields editable later in Accounts to avoid blocking setup.

## UX Flow Details
- Stepper at top:
  - Accounts
  - Debts
  - Categories
  - Recurring
  - Review
  - Finish
- Each step has clear visual grouping and an "add another" button.
- Use placeholders that show the expected format (e.g., 5000.00).
- Use a single primary CTA per step, with a "Skip for now" secondary action where allowed.

## Advanced Tools Still Available
- Full Accounts page remains accessible for edits and detailed fields.
- Automation, Budgets, and Reconciliation remain visible in navigation.
- Setup Hub should not replace advanced workflows, only streamline entry.

## Edge Cases
- User adds multiple accounts with mixed types:
  - Validate each row independently.
  - Allow save only when all rows are valid.
- User leaves advanced fields blank:
  - Safe defaults (nulls) should be stored.
- User only adds credit accounts:
  - Summary still shows utilization and limits.
- User wants to skip setup:
  - Allow "Skip for now" and return to Dashboard.

## Rollout Plan
- Phase A: Accounts & balances (single step).
- Phase B: Debts + categories.
- Phase C: Recurring + review totals.
- Phase D: Integrate with first-run checklist and replace old entry points.

## Success Criteria
- New users complete setup in under 2 minutes.
- Lower onboarding drop-off rates.
- Support tickets decrease around "where do I start?"
- Advanced users can still access full account detail and rules without friction.

## TODO List (Implementation Breakdown)

### Step 1: Accounts & Balances
- [x] Finalize the row layout (name, type, starting balance/credit limit).
- [x] Add inline validation per row (name required, balance required, limit required).
- [x] Disable "Finish setup" until all rows validate.
- [x] Add ability to remove a row and reindex labels.
- [x] Ensure multiple accounts can be added without layout overflow.

### Step 1b: Advanced Details (Per Account)
- [x] Add per-row "Show advanced" toggle.
- [x] Wire advanced fields (APR, statement close/due, rewards).
- [x] Add helper text explaining when advanced fields matter.
- [x] Persist advanced values to account create/update APIs.

### Step 2: Debts & Obligations
- [x] Add debt rows (lender, current balance, APR, due day).
- [x] Validate balances and day ranges.
- [x] Link loan-type accounts from Step 1 for confirmation.

### Step 3: Categories & Rules
- [x] Offer a default category set (toggle to accept).
- [x] Allow quick add custom categories.
- [x] Add a "rules template" picker (optional).

### Step 4: Recurring & Paydays
- [ ] Add recurring income and bill rows.
- [ ] Provide quick templates (rent, payroll, subscriptions).
- [ ] Store frequency and next date.

### Step 5: Quick Review Summary
- [ ] Calculate totals (cash on hand, credit limits, utilization, debt, recurring net).
- [ ] Display summary cards with clear labels.
- [ ] Handle edge cases (no credit accounts, zero limits).

### Step 6: Primary Actions
- [ ] Add "Finish setup" button and success flow.
- [ ] Add secondary actions ("Review accounts", "Skip for now").
- [ ] Confirm navigation to Transactions after completion.

### Validation & UX
- [x] Error messages per row (friendly copy).
- [x] Highlight missing fields with focus and helper text.
- [ ] Keyboard navigation across rows and fields.
- [ ] Ensure focus states are visible on all inputs and buttons.

### Integration Points
- [ ] Link Setup Hub from dashboard checklist and sidebar.
- [ ] Deprecate older onboarding entry points if needed.
- [ ] Update docs to reflect Setup Hub as primary entry.

### QA & Analytics
- [ ] Manual QA: 1 account, multiple accounts, credit-only, mixed types.
- [ ] Verify stored balances/limits in Accounts page.
- [ ] Track time-to-complete setup for new users.
