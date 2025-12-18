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
});

export const transactionUpdateSchema = transactionSchema.partial();

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
