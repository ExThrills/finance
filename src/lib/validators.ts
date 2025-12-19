import { z } from "zod";

export const accountTypes = [
  "checking",
  "savings",
  "credit",
  "cash",
  "investment",
  "other",
] as const;

export const categoryKinds = ["expense", "income"] as const;

export const fieldTypes = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
] as const;

export const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(accountTypes),
  institution: z.string().min(1).optional(),
  last4: z.string().length(4).optional(),
  creditLimit: z.number().int().nonnegative().optional(),
  apr: z.number().nonnegative().optional(),
  statementCloseDay: z.number().int().min(1).max(31).optional(),
  statementDueDay: z.number().int().min(1).max(31).optional(),
  rewardCurrency: z.string().min(1).optional(),
  syncStatus: z
    .enum(["manual", "ok", "error", "disconnected", "pending"])
    .optional(),
});

export const accountUpdateSchema = accountSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(categoryKinds),
});

export const categoryUpdateSchema = categorySchema.partial();

export const transactionSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  amount: z.number().int(),
  date: z.coerce.date(),
  description: z.string().min(1),
  notes: z.string().nullable().optional(),
  isPending: z.boolean().optional(),
  clearedAt: z.coerce.date().nullable().optional(),
  transferId: z.string().min(1).nullable().optional(),
  recurringGroupKey: z.string().nullable().optional(),
  recurringConfidence: z.number().optional(),
  splits: z
    .array(
      z.object({
        accountId: z.string().optional(),
        categoryId: z.string().nullable().optional(),
        amount: z.number().int(),
        description: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const transactionUpdateSchema = transactionSchema.partial();

export const transferSchema = z.object({
  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),
  amount: z.number().int(),
  date: z.coerce.date(),
  memo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const fieldDefinitionSchema = z.object({
  name: z.string().min(1),
  fieldType: z.enum(fieldTypes),
  selectOptions: z.array(z.string()).optional().nullable(),
});

export const fieldDefinitionUpdateSchema = fieldDefinitionSchema.partial();

export const fieldValueSchema = z.object({
  transactionId: z.string().min(1),
  fieldDefinitionId: z.string().min(1),
  valueText: z.string().nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  valueDate: z.coerce.date().nullable().optional(),
  valueBool: z.boolean().nullable().optional(),
});

export const fieldValueUpdateSchema = fieldValueSchema.partial();
