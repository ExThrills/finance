# UI/UX V2 Proposal

This document proposes an award‑level UI/UX refresh focused on clarity, calm, and faster onboarding for everyday users.

## Design Goals
- Zero confusion on first use.
- Explain what matters without overwhelming.
- Make high‑impact actions obvious (add account, add transaction, reconcile).
- Present a clear financial story with minimal clutter.

## Visual Direction
- Use a lighter, calmer palette with one strong accent for actions.
- Reduce border noise; use subtle panels and spacing for hierarchy.
- Standardize typography scales (headline, section title, body, caption).
- Align all card headers and action buttons for consistent rhythm.

## Navigation + Information Architecture
- Add a persistent top bar with:
  - App name + current scope.
  - Quick “Add transaction” button.
  - Notifications icon (alerts).
- Left nav grouped into:
  - Core: Dashboard, Transactions, Accounts.
  - Plan: Budgets, Projections.
  - Control: Reconciliation, Automation, Alerts.
  - Settings.

## Onboarding (Guided)
### First‑run checklist
Show a checklist card until complete:
1) Add first account.
2) Add categories.
3) Add first transaction.
4) Create a budget (optional).

### Inline tips
Tiny helper text under empty states:
- Accounts: “Add checking and credit cards to power utilization.”
- Transactions: “You can paste bank CSVs next; we’ll map fields.”

### Sample Data Toggle
Offer a “Load sample data” button for learning the UI.

## Dashboard (V2 Layout)
### Above‑the‑fold
- Financial Health strip:
  - Net cashflow this month.
  - Total cash on hand.
  - Credit utilization.
  - Upcoming bills (next 7 days).

### Middle row
- “Spending by category” donut.
- “Cashflow trend” line chart.
- “Budget burn‑down” chart (if budgets exist).

### Below‑the‑fold
- Card widgets (compact, consistent layout).
- Alerts timeline (last 5).

## Transactions (V2 Enhancements)
- Add a sticky “Quick Filters” bar:
  - Last 7 days, Pending, Uncategorized, Large, Recurring.
- Add “Batch actions” bar that appears only on selection.
- Add a compact “Summary row” pinned above table.
- Replace raw numbers with color hints:
  - Inflow green, outflow red.
- Add a “Why this was categorized” chip when a rule is applied.

## Accounts (V2 Dashboard)
- Each account card shows:
  - Balance + available.
  - Mini sparkline (last 30 days).
  - Next statement close and due.
  - Sync health chip.
- Add a “Sync all” hero button.
- Show “Last updated” label with relative time.

## Budgets (V2)
- Use progress bars with color thresholds.
- “Budget health” overview row:
  - On track, At risk, Over budget.
- Add filters by category and period.

## Projections (V2)
- Add an interactive projection slider (30/60/90/180 days).
- Show “Projected lowest balance” callout.
- Add toggles:
  - Include credit payments.
  - Include recurring series only.

## Reconciliation (V2)
- Step‑by‑step checklist:
  1) Confirm statement dates.
  2) Review pending.
  3) Lock statement.
- Locked periods visually dimmed with a lock icon.

## Automation (V2)
- “Rules that will run” preview.
- Add rule templates for common cases:
  - Gas stations, rideshare, groceries.
- Group rules by priority with drag‑to‑reorder.

## Alerts (V2)
- Convert alerts list into a timeline.
- Add severity color‑chips.
- Add “Snooze” and “Acknowledge all”.

## Data Visualization (V2)
- Standardize chart colors across views.
- Add quick hover explanations (“What is utilization?”).
- Add chart legends with totals.

## Accessibility
- Increase contrast for all text under 12px.
- Ensure focus states on inputs/buttons.
- Support keyboard navigation for all selects.

## Next UX Experiments
- Add “Goal Mode” for debt payoff.
- Add “Cashflow calendar” view.
- Add “Spending heatmap” by day of week.

## Implementation Notes (High Level)
- Introduce a design token file:
  - colors, spacing, shadows, typography sizes.
- Normalize card header layout.
- Move table actions into a shared “toolbar” component.
- Add empty‑state illustrations for first‑run guidance.
