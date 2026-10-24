import { NextRequest, NextResponse } from "next/server";
import { transactionSchema } from "@/lib/transaction-input";
import {
  getTransactionsByIds,
  updateTransaction,
  deleteTransactions,
} from "@/lib/queries";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const numId = Number(id);

  if (!Number.isFinite(numId) || numId < 1) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const rows = await getTransactionsByIds([numId]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ transaction: rows[0] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const numId = Number(id);

    if (!Number.isFinite(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await updateTransaction(numId, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Update transaction error");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const numId = Number(id);

    if (!Number.isFinite(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await deleteTransactions([numId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Delete transaction error");
  }
}
