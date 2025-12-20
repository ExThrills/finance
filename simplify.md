# Simplified Onboarding Hub

This document proposes a simplified, centralized entry point for users to set up their financial workspace without juggling multiple screens. The goal is to make first-time setup obvious and fast, while keeping advanced tools available when needed.

## Goals
- Provide one clear place to add accounts and starting balances.
- Minimize decision fatigue for new users.
- Preserve advanced capabilities for power users without blocking the basics.
- Make setup feel like a guided flow, not a maze of options.

## Proposed Structure: "Setup Hub"
A single, focused screen that includes:

1) Accounts & Balances
- Add checking/savings/credit accounts in one list.
- Each account row includes:
  - Account name
  - Type (checking, savings, credit, cash, other)
  - Starting balance (required for checking/savings)
  - Credit limit (required for credit)
  - Optional: institution, last 4
- Support multiple accounts and multiple credit cards.

2) Optional Advanced Details (collapsed by default)
- APR, statement close/due, rewards currency, sync status.
- Advanced users can expand this without cluttering the main flow.

3) Quick Review
- Show a summary of total cash on hand, total credit limits, and total utilization (if applicable).
- Confirm before saving.

4) Next Step Button
- Clear action: "Continue to transactions" or "Finish setup".

## UX Notes
- Use a stepper or checklist at top to show progress.
- Keep only one primary action per screen.
- Defer extra settings to "Advanced" toggles.
- Provide a "Skip for now" option for non-critical details.

## Rollout Plan
- Phase A: Build the Setup Hub UI for accounts + balances only.
- Phase B: Add optional advanced toggles and review summary.
- Phase C: Connect this hub to existing onboarding checklist flow.

## Success Criteria
- New users can complete setup in under 2 minutes.
- Reduced drop-off during onboarding.
- No loss of functionality for advanced users (advanced fields still accessible).
