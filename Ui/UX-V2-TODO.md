# UX V2 Implementation Plan

This plan turns `Ui/UX-V2-.md` into an executable roadmap. Each phase is scoped to ship independently.

## Phase 0 — Foundations
- [x] Create design token map (colors, spacing, typography, shadows).
- [x] Define layout rhythm: consistent paddings, section spacing, card headers.
- [x] Normalize buttons, badges, and table toolbars.
- [x] Add empty‑state components with short guidance text.

## Phase 1 — Onboarding & First‑Run Clarity
- [x] Add a first‑run checklist widget (Account → Categories → Transaction → Budget).
- [x] Show contextual hints in empty lists (Accounts, Transactions, Budgets).
- [x] Add “Load sample data” action (optional toggle).
- [x] Add a dismissible “What to do next” panel on Dashboard.

## Phase 2 — Navigation & Global Actions
- [x] Add persistent top bar with scope switcher + primary action.
- [x] Group sidebar nav into Core / Plan / Control / Settings.
- [x] Add notifications icon with unread count (alerts).
- [x] Add quick “Add transaction” button in top bar.

## Phase 3 — Dashboard V2 Layout
- [x] Add Financial Health strip (cash, net, utilization, upcoming bills).
- [x] Add Budget burn‑down card (visible if budgets exist).
- [x] Add Alerts timeline preview (last 5).
- [x] Align chart sizing and legends across dashboard cards.

## Phase 4 — Transactions V2
- [x] Add sticky quick filters (Last 7 days, Pending, Uncategorized, Recurring, Large).
- [x] Add summary row above the table (total inflow/outflow/net).
- [x] Add rule attribution chip (“Auto‑categorized by Rule X”).
- [x] Move batch actions into a compact toolbar with clear affordances.

## Phase 5 — Accounts V2
- [ ] Add mini sparklines (30‑day balance trend).
- [ ] Add “Sync all” hero button with status feedback.
- [ ] Show next statement close/due in a consistent slot.
- [ ] Add “Last updated” and sync health tooltip.

## Phase 6 — Budgets V2
- [ ] Add “Budget health” overview (On track / At risk / Over).
- [ ] Add filters (category, period).
- [ ] Improve progress bar color thresholds.

## Phase 7 — Projections V2
- [ ] Add time horizon toggles (30/60/90/180 days).
- [ ] Add “Lowest projected balance” callout.
- [ ] Add toggles for: recurring only, include credit payments.

## Phase 8 — Reconciliation V2
- [ ] Add step‑by‑step checklist UI.
- [ ] Add lock state badges and dim locked periods.
- [ ] Add confirmation modal for lock/unlock.

## Phase 9 — Automation V2
- [ ] Add rule templates (Gas, Rideshare, Groceries).
- [ ] Add drag‑to‑reorder priority.
- [ ] Add preview panel showing what rules will match.

## Phase 10 — Alerts V2
- [ ] Convert alerts list into timeline layout.
- [ ] Add severity chips + color accents.
- [ ] Add “Snooze” and “Acknowledge all”.

## Phase 11 — Data Visualization Polish
- [ ] Standardize chart colors across pages.
- [ ] Add legends with totals.
- [ ] Add hover “What is this?” help on metrics (utilization, cashflow).

## Phase 12 — Accessibility & QA
- [ ] Verify contrast for small text.
- [ ] Ensure keyboard navigation works for all selects.
- [ ] Add focus rings for interactive elements.
- [ ] Validate empty states across all screens.

## Notes
- Each phase can be shipped independently.
- Reorder phases based on user feedback.
- Avoid bundling visual polish with heavy feature changes.
