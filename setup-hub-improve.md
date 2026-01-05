# Setup Hub Enhancement Plan

## Goal
Make Setup Hub the single "Start here" experience that is visually appealing, clear, and fast for new users to enter their current financial position: assets, debts, credit cards, income, and expenses. The output should be a confident baseline so downstream tracking (transactions, budgets, projections) is accurate.

## Core Principles
- **Single-path onboarding**: one clear flow with optional depth, not scattered entry points.
- **Progressive disclosure**: show only what is needed now; reveal advanced fields when relevant.
- **Fast to complete**: minimize typing with presets, grouping, and sensible defaults.
- **Confidence and clarity**: explain why each step matters, with small summaries that build trust.
- **No dead ends**: every step has a clear next action and a way to skip without losing progress.

## Product Flow Overview
1. **Welcome + What you will add**
   - Short explanation of how Setup Hub works (3 bullets).
   - Clear CTA: "Start setup".
   - If a user already has accounts, show a "Continue setup" state.

2. **Accounts & Assets (grouped by bank)**
   - Quick add for multiple accounts under one institution.
   - Support balances for checking/savings/cash/investment and current balance + credit limit for credit cards.
   - Auto-show credit-specific fields when type is credit.
   - Optional advanced fields (APR, statement close/due, rewards currency).

3. **Debts & Obligations**
   - Separate from credit cards; quick add for loans and obligations.
   - Required fields: name, current balance; optional APR and due date.

4. **Income & Recurring Expenses**
   - Combined in one section: recurring items with a clear positive/negative convention.
   - Provide presets: rent, payroll, utilities, subscriptions.
   - Require amount, cadence, and next date.

5. **Categories & Rules (Optional)**
   - Default categories toggle + quick add for custom categories.
   - Simple rule templates (gas, groceries, rideshare).

6. **Review & Confirm**
   - A summary card with totals: cash on hand, credit limits, utilization, total debt, recurring net.
   - "Finish setup" CTA and optional "Skip for now".

## Experience Improvements
- **Visual hierarchy**: use section cards with distinct titles, short descriptions, and subheaders.
- **Grouped layout**: two-column layout on desktop with summary column when possible.
- **Inline guidance**: 1-line helper text for tricky fields (credit limit, statement days).
- **Smart defaults**: pre-fill dates and use placeholders that match real values.
- **Validation clarity**: inline error messages only after user touches a field.
- **Draft persistence**: local storage so user can return without losing progress.
- **Bank grouping**: show "Add another under this bank" action within a bank group.

## Data + Modeling Considerations
- Starting balance should feed current balance for cash/investment accounts.
- Credit cards should store current balance and credit limit to compute utilization.
- Debts should remain separate from credit cards for payoff and projection features.
- Recurring income/expenses should allow linking to an account and category.

## Success Metrics
- % users completing Setup Hub within first session.
- Time to complete Setup Hub.
- Drop-off by step (accounts, debts, recurring, review).
- % of users with at least one asset + one debt/credit account.

## Phased Rollout Plan
- **Phase 1 (MVP polish)**: visual cleanup, better copy, grouped accounts, improved quick add.
- **Phase 2 (Guided flow)**: progress steps, summary sidebar, stronger validation and hints.
- **Phase 3 (Automation)**: import presets from Plaid, auto-fill institution and account types.

---

# TODOLIST

## Phase 1: MVP Polish
- [x] Update Setup Hub header copy to "Start here" language and explain outcome.
- [x] Add a compact progress indicator (e.g., 1 of 5 sections).
- [x] Create a bank-grouped quick add block for accounts.
- [x] Ensure credit cards show balance, credit limit, APR, statement close/due fields.
- [x] Ensure checking/savings/cash show balance input.
- [x] Add inline helper text for balances and credit limits.
- [x] Improve spacing/typography within section cards for readability.
- [x] Add a "Review summary" sticky card (desktop) with totals.
- [x] Add a clear "Finish setup" primary CTA and "Skip" secondary CTA.

## Phase 2: Guided Flow
- [x] Add step navigation (Accounts, Debts, Income, Categories, Review).
- [x] Allow collapsing completed steps.
- [x] Persist draft state to local storage for all steps.
- [x] Add "Add another under this bank" action per institution group.
- [x] Add inline validation only after field interaction.
- [x] Add empty-state prompts for each section.

## Phase 3: Automation + Smart Defaults
- [ ] Pre-fill institution name/type from Plaid link where available.
- [ ] Auto-detect credit accounts and set credit-specific fields.
- [ ] Suggest recurring income/expense templates based on recent transactions.
- [ ] Offer category suggestions from imported transactions.

## Future Ideas
- [ ] Visual "Net worth" preview chart based on entered balances.
- [ ] One-click import of liabilities from linked accounts.
- [ ] Personalized checklist with estimated time to complete.
