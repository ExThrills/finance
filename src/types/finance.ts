export type AccountRecord = {
  id: string;
  userId: string;
  name: string;
  type: string;
  institution: string | null;
  last4: string | null;
  creditLimit: number | null;
  apr: number | null;
  statementCloseDay: number | null;
  statementDueDay: number | null;
  currentBalance: number;
  availableBalance: number | null;
  availableCredit: number | null;
  rewardCurrency: string | null;
  lastSyncAt: string | null;
  syncStatus: string;
  syncError: string | null;
  createdAt: string;
};

export type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  kind: "expense" | "income";
  createdAt: string;
};

export type TagRecord = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type FieldDefinitionRecord = {
  id: string;
  userId: string;
  name: string;
  fieldType: "text" | "number" | "date" | "boolean" | "select";
  selectOptions: any | null;
  createdAt: string;
};

export type TransactionRecord = {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  amount: number;
  date: string;
  description: string;
  notes: string | null;
  isPending: boolean;
  clearedAt: string | null;
  transferId: string | null;
  recurringGroupKey: string | null;
  recurringConfidence: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionSplitRecord = {
  id: string;
  transactionId: string;
  accountId: string | null;
  categoryId: string | null;
  amount: number;
  description: string | null;
  notes: string | null;
  account?: AccountRecord | null;
  category?: CategoryRecord | null;
};

export type TransactionFieldValueRecord = {
  id: string;
  transactionId: string;
  fieldDefinitionId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueDate: string | null;
  valueBool: boolean | null;
};

export type TransactionWithRelations = TransactionRecord & {
  account: AccountRecord | null;
  category: CategoryRecord | null;
  splits?: TransactionSplitRecord[];
  tags?: TagRecord[];
  ruleApplied?: string | null;
};

export type SavedViewRecord = {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
};

export type TransferRecord = {
  id: string;
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  memo: string | null;
  occurredAt: string;
  createdAt: string;
  transferGroupId: string | null;
};

export type BudgetRecord = {
  id: string;
  userId: string;
  name: string;
  scopeType: "category" | "account";
  categoryId: string | null;
  accountId: string | null;
  period: "monthly" | "weekly";
  targetAmount: number;
  startsOn: string | null;
  createdAt: string;
};

export type BudgetWithActuals = BudgetRecord & {
  actualAmount: number;
  periodStart: string;
  periodEnd: string;
  percentUsed: number;
};

export type AlertRuleRecord = {
  id: string;
  userId: string;
  name: string;
  ruleType:
    | "low_cash"
    | "high_utilization"
    | "unusual_spend"
    | "large_tx"
    | "missed_sync";
  severity: "low" | "medium" | "high";
  channel: "in_app" | "webhook" | "email";
  enabled: boolean;
  thresholdAmount: number | null;
  thresholdPercent: number | null;
  lookbackDays: number | null;
  accountId: string | null;
  categoryId: string | null;
  webhookUrl: string | null;
  createdAt: string;
};

export type AlertRecord = {
  id: string;
  userId: string;
  ruleId: string | null;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  acknowledgedAt: string | null;
  rule?: AlertRuleRecord | null;
};

export type StatementPeriodRecord = {
  id: string;
  userId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  locked: boolean;
  reconciledAt: string | null;
  createdAt: string;
};

export type StatementPeriodSummary = StatementPeriodRecord & {
  pendingCount: number;
  clearedCount: number;
  totalCount: number;
};

export type BalanceAdjustmentRecord = {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  memo: string | null;
  effectiveDate: string;
  createdAt: string;
};

export type AuditEventRecord = {
  id: string;
  userId: string;
  actorId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type RecurringSeriesRecord = {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  description: string;
  amount: number;
  cadence: "weekly" | "monthly";
  nextDate: string;
  active: boolean;
  createdAt: string;
};

export type ProjectionPoint = {
  date: string;
  balance: number;
};

export type RecurringSuggestion = {
  accountId: string;
  categoryId: string | null;
  description: string;
  amount: number;
  cadence: "weekly" | "monthly";
  nextDate: string;
  count: number;
};

export type PayoffPlan = {
  strategy: "avalanche" | "snowball";
  months: number;
  totalInterest: number;
  schedule: { month: number; balance: number }[];
};

export type RuleActionRecord = {
  id: string;
  ruleId: string;
  actionType: "set_category" | "add_tag" | "set_note" | "set_splits";
  actionPayload: Record<string, unknown>;
  createdAt: string;
};

export type AutomationRuleRecord = {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  priority: number;
  onlyUncategorized: boolean;
  matchDescription: string | null;
  matchAmountMin: number | null;
  matchAmountMax: number | null;
  matchAccountId: string | null;
  matchCategoryId: string | null;
  createdAt: string;
  actions?: RuleActionRecord[];
};

export type TransferSuggestion = {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  reason: string;
};
