import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateSchema, bulkDeleteSchema } from "@/lib/transaction-input";
import { bulkUpdateTransactions, TransactionNotFoundError, deleteTransactions, getTransactionsByIds } from "@/lib/queries";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const parsed = bulkDeleteSchema.safeParse({
    ids: (request.nextUrl.searchParams.get("ids") || "").split(",").map(Number),
  });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const ids = [...new Set(parsed.data.ids)];
    const transactions = await getTransactionsByIds(ids);
    if (transactions.length !== ids.length) {
      return NextResponse.json({ error: "A selected transaction no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ transactions });
  } catch (error) {
    return errorResponse(error, "Read selected transactions error");
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const count = await bulkUpdateTransactions(parsed.data.transactions);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    if (error instanceof TransactionNotFoundError) {
      return NextResponse.json(
        { error: "Transaction not found", id: error.id },
        { status: 404 }
      );
    }
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
