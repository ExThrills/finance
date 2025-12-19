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
