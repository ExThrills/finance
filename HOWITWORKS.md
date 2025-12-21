# How It Works (User Guide)

Welcome to Ledgerly. This guide is written for end users, not developers. It explains what each area does, how the data flows, and the best order to set things up.

## Quick Start (5–10 minutes)
1) Open the **Setup Hub** and add at least one account.
2) Add your categories.
3) Add your first transactions.
4) Review your dashboard.

That is enough to use the app. Everything else is optional and can be layered in later.

## Core Concepts
Ledgerly is built around these ideas:
- Accounts: Where money lives (checking, savings, credit cards, cash).
- Transactions: Every inflow/outflow tied to an account.
- Categories: Labels for spending or income.
- Tags: Optional labels for extra detail.
- Budgets: Targets by category or account.
- Alerts: Automated warnings for cash, utilization, or unusual spend.
- Recurring series: Predictable transactions like rent or payroll.
- Reconciliation: Lock statements so historical data stays correct.
- Automation rules: If/then logic to auto‑categorize or tag.

## Step 1: Set Up Accounts
Go to **Setup Hub** (or **Accounts**) and add each financial account.

For each account, you can (optionally) add:
- Institution (e.g., Chase)
- Last 4 digits
- Credit limit (cards only)
- APR (cards only)
- Statement close day
- Statement due day
- Rewards currency (Points, Miles, etc.)

Why it matters:
- Credit limit and balances power utilization.
- Statement dates power projections and card widgets.
- Account types control reports (cash vs credit).

## Step 2: Add Categories
Go to **Categories** and create:
- Expense categories (Groceries, Rent, Gas)
- Income categories (Salary, Refunds)

Categories drive:
- Your dashboard charts
- Budgets
- Automation rules

## Step 3: Add Transactions
Go to **Transactions** and add entries:
- Choose account and date
- Add description and amount
- Choose a category (or leave uncategorized)
- Mark as pending if needed

Inline editing:
You can click into fields in the table and edit them without a separate form.

Transfers:
Use the **Transfer/payment** toggle in Quick Add to record money moving between accounts.

## Step 4: Use the Dashboard
The **Dashboard** shows:
- Income, expenses, and net for the month
- Spending by category
- Monthly cashflow trend
- Income vs expenses bar chart
- Credit utilization overview

Use the **Scope** switcher at the top to filter the dashboard by:
- All accounts
- A single account
- Account type (checking, credit, etc.)
- Institution (Chase, etc.)

## Step 5: Budgets (Optional)
Go to **Budgets** and set targets:
- By category (e.g., Groceries $500/mo)
- By account (e.g., Card spending $1000/mo)
- Weekly or monthly periods

Each budget shows:
- Actual vs target
- Percent used
- Visual progress bar

## Step 6: Alerts (Optional)
Go to **Alerts** to create rules like:
- Low cash balance
- High credit utilization
- Unusual spend spikes
- Large transactions
- Missed syncs

You can trigger checks manually with **Run checks**.
Alerts appear in the “Recent alerts” list.

## Step 7: Recurring + Projections (Optional)
Go to **Projections** for:
- Recurring series (rent, payroll, subscriptions)
- A 90‑day projected cash curve
- Payoff simulator (avalanche or snowball)

You can also click **Detect recurring** to get suggestions based on your transaction history.

## Step 8: Reconciliation (Optional)
Go to **Reconciliation** to:
- Create statement periods per account
- Lock them after reconciling
- Add manual balance adjustments with memos
- View an audit log of changes

Locked periods cannot be edited, which prevents accidental history changes.

## Step 9: Automation (Optional)
Go to **Automation** to build rules such as:
- If description contains “Uber”, set category to “Transport”
- If amount is between $5 and $10, add tag “Coffee”
- If uncategorized, set note or apply splits

You can apply rules to your existing uncategorized transactions with one click.

## Exports (Optional)
You can export transactions to CSV from the API:
- Use `/api/exports/transactions` with filters for account/category/date

This is useful for backups, spreadsheets, or analytics.

## Common Workflows

### “I just want to track spending”
1) Accounts → add checking + credit card
2) Categories → add expense types
3) Transactions → enter purchases
4) Dashboard → review monthly totals

### “I want budgets and alerts”
1) Budgets → set targets
2) Alerts → set low cash + high utilization
3) Run checks to test alerts

### “I want projections”
1) Projections → add recurring series
2) Review the 90‑day cash curve
3) Try the payoff simulator

## Tips
- Start with a few accounts and categories. You can add more later.
- Keep transactions consistent: accurate dates improve projections.
- Use tags for flexible filtering (e.g., “Business”, “Travel”).
- Reconcile monthly to keep your ledger clean.

If you ever get stuck, the fastest path is: accounts → categories → transactions.
