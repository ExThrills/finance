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

export const tagSchema = z.object({
  name: z.string().min(1),
});

export const tagUpdateSchema = tagSchema.partial();

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

export const savedViewSchema = z.object({
  name: z.string().min(1),
  filters: z.record(z.string(), z.any()),
});

export const savedViewUpdateSchema = savedViewSchema.partial();

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

export const budgetSchema = z.object({
  name: z.string().min(1),
  scopeType: z.enum(["category", "account"]),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  period: z.enum(["monthly", "weekly"]),
  targetAmount: z.number().int().positive(),
  startsOn: z.coerce.date().nullable().optional(),
});

export const budgetUpdateSchema = budgetSchema.partial();

export const alertRuleSchema = z.object({
  name: z.string().min(1),
  ruleType: z.enum([
    "low_cash",
    "high_utilization",
    "unusual_spend",
    "large_tx",
    "missed_sync",
  ]),
  severity: z.enum(["low", "medium", "high"]).optional(),
  channel: z.enum(["in_app", "webhook", "email"]).optional(),
  enabled: z.boolean().optional(),
  thresholdAmount: z.number().int().positive().nullable().optional(),
  thresholdPercent: z.number().positive().nullable().optional(),
  lookbackDays: z.number().int().positive().nullable().optional(),
  accountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
});

export const alertRuleUpdateSchema = alertRuleSchema.partial();

export const statementPeriodSchema = z.object({
  accountId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const statementPeriodUpdateSchema = z.object({
  locked: z.boolean().optional(),
});

export const balanceAdjustmentSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int(),
  memo: z.string().nullable().optional(),
  effectiveDate: z.coerce.date().optional(),
});

export const recurringSeriesSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().nullable().optional(),
  description: z.string().min(1),
  amount: z.number().int(),
  cadence: z.enum(["weekly", "monthly"]),
  nextDate: z.coerce.date(),
  active: z.boolean().optional(),
});

export const recurringSeriesUpdateSchema = recurringSeriesSchema.partial();

export const ruleActionSchema = z.object({
  actionType: z.enum(["set_category", "add_tag", "set_note", "set_splits"]),
  actionPayload: z.record(z.any()),
});

export const automationRuleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  onlyUncategorized: z.boolean().optional(),
  matchDescription: z.string().optional(),
  matchAmountMin: z.number().int().nullable().optional(),
  matchAmountMax: z.number().int().nullable().optional(),
  matchAccountId: z.string().nullable().optional(),
  matchCategoryId: z.string().nullable().optional(),
  actions: z.array(ruleActionSchema).min(1),
});

export const automationRuleUpdateSchema = automationRuleSchema.partial();
