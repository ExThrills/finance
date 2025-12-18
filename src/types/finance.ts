import type {
  Account,
  Category,
  FieldDefinition,
  Transaction,
  TransactionFieldValue,
} from "@prisma/client";

export type AccountRecord = Account;
export type CategoryRecord = Category;
export type FieldDefinitionRecord = FieldDefinition;
export type TransactionRecord = Transaction;
export type TransactionFieldValueRecord = TransactionFieldValue;

export type TransactionWithRelations = Transaction & {
  account: Account;
  category: Category | null;
};
