import type { Database } from "@/types/database";
import type {
  AccountRecord,
  CategoryRecord,
  FieldDefinitionRecord,
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
    createdAt: row.created_at,
  };
}

export function toCategory(row: Tables["categories"]["Row"]): CategoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    account: row.account ? toAccount(row.account) : null,
    category: row.category ? toCategory(row.category) : null,
  };
}
