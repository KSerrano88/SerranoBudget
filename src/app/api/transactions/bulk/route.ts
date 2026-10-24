import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateSchema, bulkDeleteSchema } from "@/lib/transaction-input";
import { updateTransaction, deleteTransactions } from "@/lib/queries";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";

export async function PUT(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    for (const { id, ...transaction } of parsed.data.transactions) {
      await updateTransaction(id, transaction);
    }

    return NextResponse.json({
      success: true,
      count: parsed.data.transactions.length,
    });
  } catch (error) {
    return errorResponse(error, "Bulk update error");
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await deleteTransactions(parsed.data.ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Bulk delete error");
  }
}
