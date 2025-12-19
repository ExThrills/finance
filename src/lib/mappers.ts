import type { Database } from "@/types/database";
import type {
  AccountRecord,
  CategoryRecord,
  FieldDefinitionRecord,
  TagRecord,
  SavedViewRecord,
  BudgetRecord,
  AlertRuleRecord,
  AlertRecord,
  StatementPeriodRecord,
  BalanceAdjustmentRecord,
  AuditEventRecord,
  RecurringSeriesRecord,
  AutomationRuleRecord,
  RuleActionRecord,
  TransactionSplitRecord,
  TransactionFieldValueRecord,
  TransactionWithRelations,
} from "@/types/finance";

type Tables = Database["public"]["Tables"];

export function toAccount(row: Tables["accounts"]["Row"]): AccountRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    institution: row.institution,
    last4: row.last4,
    creditLimit: row.credit_limit,
    apr: row.apr,
    statementCloseDay: row.statement_close_day,
    statementDueDay: row.statement_due_day,
    currentBalance: row.current_balance,
    availableBalance: row.available_balance,
    availableCredit: row.available_credit,
    rewardCurrency: row.reward_currency,
    lastSyncAt: row.last_sync_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    createdAt: row.created_at,
  };
}

export function toCategory(row: Tables["categories"]["Row"]): CategoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind as CategoryRecord["kind"],
    createdAt: row.created_at,
  };
}

export function toTag(row: Tables["tags"]["Row"]): TagRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function toSavedView(row: Tables["saved_views"]["Row"]): SavedViewRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    filters: (row.filters as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

export function toBudget(row: Tables["budgets"]["Row"]): BudgetRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    scopeType: row.scope_type as BudgetRecord["scopeType"],
    categoryId: row.category_id,
    accountId: row.account_id,
    period: row.period as BudgetRecord["period"],
    targetAmount: row.target_amount,
    startsOn: row.starts_on,
    createdAt: row.created_at,
  };
}

export function toAlertRule(row: Tables["alert_rules"]["Row"]): AlertRuleRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    ruleType: row.rule_type as AlertRuleRecord["ruleType"],
    severity: row.severity as AlertRuleRecord["severity"],
    channel: row.channel as AlertRuleRecord["channel"],
    enabled: row.enabled,
    thresholdAmount: row.threshold_amount,
    thresholdPercent: row.threshold_percent,
    lookbackDays: row.lookback_days,
    accountId: row.account_id,
    categoryId: row.category_id,
    webhookUrl: row.webhook_url,
    createdAt: row.created_at,
  };
}

export function toAlert(
  row: Tables["alerts"]["Row"] & {
    rule?: Tables["alert_rules"]["Row"] | null;
  }
): AlertRecord {
  return {
    id: row.id,
    userId: row.user_id,
    ruleId: row.rule_id,
    message: row.message,
    payload: (row.payload as Record<string, unknown>) ?? null,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
    rule: row.rule ? toAlertRule(row.rule) : null,
  };
}

export function toStatementPeriod(
  row: Tables["statement_periods"]["Row"]
): StatementPeriodRecord {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    startDate: row.start_date,
    endDate: row.end_date,
    locked: row.locked,
    reconciledAt: row.reconciled_at,
    createdAt: row.created_at,
  };
}

export function toBalanceAdjustment(
  row: Tables["balance_adjustments"]["Row"]
): BalanceAdjustmentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount: row.amount,
    memo: row.memo,
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  };
}

export function toAuditEvent(
  row: Tables["audit_events"]["Row"]
): AuditEventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: row.created_at,
  };
}

export function toRecurringSeries(
  row: Tables["recurring_series"]["Row"]
): RecurringSeriesRecord {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    description: row.description,
    amount: row.amount,
    cadence: row.cadence as RecurringSeriesRecord["cadence"],
    nextDate: row.next_date,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function toRuleAction(
  row: Tables["rule_actions"]["Row"]
): RuleActionRecord {
  return {
    id: row.id,
    ruleId: row.rule_id,
    actionType: row.action_type as RuleActionRecord["actionType"],
    actionPayload: (row.action_payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

export function toAutomationRule(
  row: Tables["automation_rules"]["Row"] & {
    actions?: Tables["rule_actions"]["Row"][];
  }
): AutomationRuleRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    onlyUncategorized: row.only_uncategorized,
    matchDescription: row.match_description,
    matchAmountMin: row.match_amount_min,
    matchAmountMax: row.match_amount_max,
    matchAccountId: row.match_account_id,
    matchCategoryId: row.match_category_id,
    createdAt: row.created_at,
    actions: row.actions ? row.actions.map(toRuleAction) : [],
  };
}

export function toFieldDefinition(
  row: Tables["field_definitions"]["Row"]
): FieldDefinitionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    fieldType: row.field_type as FieldDefinitionRecord["fieldType"],
    selectOptions: row.select_options,
    createdAt: row.created_at,
  };
}

export function toTransactionFieldValue(
  row: Tables["transaction_field_values"]["Row"]
): TransactionFieldValueRecord {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    fieldDefinitionId: row.field_definition_id,
    valueText: row.value_text,
    valueNumber: row.value_number,
    valueDate: row.value_date,
    valueBool: row.value_bool,
  };
}

export function toTransactionWithRelations(
  row: Tables["transactions"]["Row"] & {
    account?: Tables["accounts"]["Row"] | null;
    category?: Tables["categories"]["Row"] | null;
    splits?: (Tables["transaction_splits"]["Row"] & {
      account?: Tables["accounts"]["Row"] | null;
      category?: Tables["categories"]["Row"] | null;
    })[];
    tags?: {
      tag?: Tables["tags"]["Row"] | null;
    }[];
  }
): TransactionWithRelations {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    categoryId: row.category_id,
    amount: row.amount,
    date: row.date,
    description: row.description,
    notes: row.notes,
    isPending: row.is_pending,
    clearedAt: row.cleared_at,
    transferId: row.transfer_id,
    recurringGroupKey: row.recurring_group_key,
    recurringConfidence: row.recurring_confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    account: row.account ? toAccount(row.account) : null,
    category: row.category ? toCategory(row.category) : null,
    splits: row.splits
      ? row.splits.map<TransactionSplitRecord>((split) => ({
          id: split.id,
          transactionId: split.transaction_id,
          accountId: split.account_id,
          categoryId: split.category_id,
          amount: split.amount,
          description: split.description,
          notes: split.notes,
          account: split.account ? toAccount(split.account) : null,
          category: split.category ? toCategory(split.category) : null,
        }))
      : [],
    tags: row.tags
      ? row.tags
          .map<TagRecord | null>((item) =>
            item.tag ? { id: item.tag.id, userId: item.tag.user_id, name: item.tag.name, createdAt: item.tag.created_at } : null
          )
          .filter((tag): tag is TagRecord => Boolean(tag))
      : [],
  };
}
