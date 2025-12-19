import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionWithRelations } from "@/lib/mappers";
import { transactionUpdateSchema } from "@/lib/validators";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const nextAccountId =
      parsed.data.accountId !== undefined
        ? parsed.data.accountId
        : existing.account_id;
    const nextDate =
      parsed.data.date !== undefined
        ? parsed.data.date instanceof Date
          ? parsed.data.date.toISOString().slice(0, 10)
          : new Date(parsed.data.date).toISOString().slice(0, 10)
        : existing.date;

    const { data: lockedPeriod, error: lockError } = await supabaseAdmin
      .from("statement_periods")
      .select("id")
      .eq("user_id", userId)
      .eq("account_id", nextAccountId)
      .eq("locked", true)
      .lte("start_date", nextDate)
      .gte("end_date", nextDate)
      .maybeSingle();

    if (lockError) {
      throw lockError;
    }
    if (lockedPeriod) {
      return NextResponse.json(
        { error: "This statement period is locked." },
        { status: 403 }
      );
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.accountId !== undefined) {
      patch.account_id = parsed.data.accountId;
    }
    if (parsed.data.categoryId !== undefined) {
      patch.category_id = parsed.data.categoryId;
    }
    if (parsed.data.amount !== undefined) {
      patch.amount = parsed.data.amount;
    }
    if (parsed.data.date !== undefined) {
      patch.date =
        parsed.data.date instanceof Date
          ? parsed.data.date.toISOString().slice(0, 10)
          : new Date(parsed.data.date).toISOString().slice(0, 10);
    }
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description;
    }
    if (parsed.data.notes !== undefined) {
      patch.notes = parsed.data.notes ?? null;
    }
    if (parsed.data.isPending !== undefined) {
      patch.is_pending = parsed.data.isPending;
    }
    if (parsed.data.clearedAt !== undefined) {
      patch.cleared_at = parsed.data.clearedAt
        ? new Date(parsed.data.clearedAt).toISOString()
        : null;
    }
    if (parsed.data.transferId !== undefined) {
      patch.transfer_id = parsed.data.transferId ?? null;
    }
    if (parsed.data.recurringGroupKey !== undefined) {
      patch.recurring_group_key = parsed.data.recurringGroupKey ?? null;
    }
    if (parsed.data.recurringConfidence !== undefined) {
      patch.recurring_confidence = parsed.data.recurringConfidence ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .update(patch)
      .eq("id", id)
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*),
        splits:transaction_splits(
          *,
          account:accounts!transaction_splits_account_id_fkey(*),
          category:categories!transaction_splits_category_id_fkey(*)
        ),
        tags:transaction_tags(tag:tags(*))
      `
      )
      .single();

    if (error) {
      throw error;
    }

    if (parsed.data.splits !== undefined) {
      const targetAmount = parsed.data.amount ?? existing.amount;
      const sum = parsed.data.splits?.reduce((total, split) => total + split.amount, 0) ?? 0;
      if (sum !== targetAmount) {
        return NextResponse.json(
          { error: "Sum of splits must equal total amount." },
          { status: 400 }
        );
      }
      await supabaseAdmin.from("transaction_splits").delete().eq("transaction_id", id);
      if (parsed.data.splits.length) {
        const splitPayloads = parsed.data.splits.map((split) => ({
          transaction_id: id,
          account_id: split.accountId ?? existing.account_id,
          category_id: split.categoryId ?? null,
          amount: split.amount,
          description: split.description ?? null,
          notes: split.notes ?? null,
        }));
        const { error: splitError } = await supabaseAdmin
          .from("transaction_splits")
          .insert(splitPayloads);
        if (splitError) {
          throw splitError;
        }
      }
    }

    if (parsed.data.tags !== undefined) {
      await supabaseAdmin.from("transaction_tags").delete().eq("transaction_id", id);
      if (parsed.data.tags.length) {
        const tagPayloads = parsed.data.tags.map((tagId) => ({
          transaction_id: id,
          tag_id: tagId,
        }));
        const { error: tagError } = await supabaseAdmin
          .from("transaction_tags")
          .insert(tagPayloads);
        if (tagError) {
          throw tagError;
        }
      }
    }

    // re-fetch to hydrate splits/tags after changes
    const { data: hydrated, error: hydrateError } = await supabaseAdmin
      .from("transactions")
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*),
        splits:transaction_splits(
          *,
          account:accounts!transaction_splits_account_id_fkey(*),
          category:categories!transaction_splits_category_id_fkey(*)
        ),
        tags:transaction_tags(tag:tags(*))
      `
      )
      .eq("id", id)
      .single();

    if (hydrateError || !hydrated) {
      throw hydrateError ?? new Error("Failed to hydrate transaction");
    }

    if (Object.keys(patch).length || parsed.data.splits || parsed.data.tags) {
      await logAuditEvent({
        userId,
        actorId: userId,
        entityType: "transaction",
        entityId: id,
        action: "update",
        metadata: {
          patch,
          splitsUpdated: parsed.data.splits !== undefined,
          tagsUpdated: parsed.data.tags !== undefined,
        },
      });
    }

    return NextResponse.json(toTransactionWithRelations(hydrated as any));
  } catch (error) {
    console.error("PATCH /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update transaction." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { data: existing, error: findError } = await supabaseAdmin
      .from("transactions")
      .select("id, account_id, date")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const { data: lockedPeriod, error: lockError } = await supabaseAdmin
      .from("statement_periods")
      .select("id")
      .eq("user_id", userId)
      .eq("account_id", existing.account_id)
      .eq("locked", true)
      .lte("start_date", existing.date)
      .gte("end_date", existing.date)
      .maybeSingle();

    if (lockError) {
      throw lockError;
    }
    if (lockedPeriod) {
      return NextResponse.json(
        { error: "This statement period is locked." },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "transaction",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete transaction." },
      { status: 500 }
    );
  }
}
