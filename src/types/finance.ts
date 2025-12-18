export type AccountRecord = {
  id: string;
  userId: string;
  name: string;
  type: string;
  createdAt: string;
};

export type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  kind: "expense" | "income";
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
  createdAt: string;
  updatedAt: string;
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
};
