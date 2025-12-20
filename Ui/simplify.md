# Simplified Onboarding Hub

This document defines a simplified, centralized setup flow so new users can get started quickly without losing access to advanced tools. The core idea is a single "Setup Hub" screen that handles all account creation and starting balances with progressive disclosure for power features.

## Goals
- Provide one clear place to add accounts and starting balances.
- Minimize decision fatigue for first-time users.
- Preserve advanced capabilities for power users without blocking the basics.
- Keep setup under 2 minutes for typical users.

## Guiding Principles
- Progressive disclosure: show the minimum to complete setup, expand only when needed.
- One primary action per screen.
- Defaults that make sense for typical users.
- Safe fallbacks: allow skipping non-critical fields.

## Setup Hub: Information Architecture
The Setup Hub is a single page, broken into four sections:

1) Accounts & Balances (required)
- Multi-row table-like layout so users can add multiple accounts in one place.
- Each row captures:
  - Account name (required)
  - Account type (required; checking, savings, credit, cash, investment, other)
  - Starting balance (required for non-credit)
  - Credit limit (required for credit)
  - Optional: institution, last 4
- Actions:
  - Add another account
  - Remove a row

2) Advanced details (collapsed by default)
- Expand per account row only if needed.
- Fields:
  - APR
  - Statement close day
  - Statement due day
  - Rewards currency
  - Sync status (read-only for now)

3) Quick review
- Summary totals:
  - Total cash on hand
  - Total credit limits
  - Overall utilization (if credit accounts exist)
- Designed to catch errors before save.

4) Primary action
- "Finish setup" (saves accounts and moves to Transactions)
- Secondary: "Review accounts" or "Skip for now"

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
- Stepper/checklist at top:
  - Add accounts
  - Review summary
  - Finish setup
- Each row has clear visual grouping and an "add another" button.
- Use placeholders that show the expected format (e.g., 5000.00).
- Use a single primary CTA at the bottom.

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
- Phase A: Accounts & balances only (single screen).
- Phase B: Advanced toggles and summary totals.
- Phase C: Integrate with first-run checklist and replace old entry points.

## Success Criteria
- New users complete setup in under 2 minutes.
- Lower onboarding drop-off rates.
- Support tickets decrease around "where do I start?"
- Advanced users can still access full account detail and rules without friction.

## TODO List (Implementation Breakdown)

### Accounts & Balances
- [ ] Finalize the row layout (name, type, starting balance/credit limit).
- [ ] Add inline validation per row (name required, balance required, limit required).
- [ ] Disable "Finish setup" until all rows validate.
- [ ] Add ability to remove a row and reindex labels.
- [ ] Ensure multiple accounts can be added without layout overflow.

### Advanced Details (Per Account)
- [ ] Add per-row "Show advanced" toggle.
- [ ] Wire advanced fields (APR, statement close/due, rewards).
- [ ] Add helper text explaining when advanced fields matter.
- [ ] Persist advanced values to account create/update APIs.

### Quick Review Summary
- [ ] Calculate totals (cash on hand, credit limits, utilization).
- [ ] Display summary cards with clear labels.
- [ ] Handle edge cases (no credit accounts, zero limits).

### Primary Actions
- [ ] Add "Finish setup" button and success flow.
- [ ] Add secondary actions ("Review accounts", "Skip for now").
- [ ] Confirm navigation to Transactions after completion.

### Validation & UX
- [ ] Error messages per row (friendly copy).
- [ ] Highlight missing fields with focus and helper text.
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
