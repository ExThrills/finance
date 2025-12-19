import type { Database } from "@/types/database";
import type {
  AccountRecord,
  CategoryRecord,
  FieldDefinitionRecord,
  TagRecord,
  SavedViewRecord,
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

export function toFieldDefinition(
  row: Tables["field_definitions"]["Row"]
): FieldDefinitionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    fieldType: row.field_type,
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
