import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  getTransactionsByIds,
  updateTransaction,
  deleteTransactions,
} from "@/lib/queries";
import { requireAuth, errorResponse, isCalendarDate, validationError } from "@/lib/api-utils";

const updateTransactionSchema = z.object({
  TRANSACTION_DATE: z.iso.date(),
  CHECK_NMBR: z.string().max(50).optional().default(""),
  DESCRIPTION: z.string().min(1).max(500),
  NOTES: z.string().max(1000).optional().default(""),
  MULTI_PART_TRAN_TOTAL: z.number().optional().default(0),
  POSTED_FLAG: z.number().int().min(0).max(1).optional().default(0),
  TRAN_TYPE: z.string().min(1).max(100),
  DEBIT: z.number().min(0).optional().default(0),
  CREDIT: z.number().min(0).optional().default(0),
});

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
    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (!isCalendarDate(parsed.data.TRANSACTION_DATE)) {
      return NextResponse.json(
        { error: "Invalid calendar date" },
        { status: 400 }
      );
    }

    await updateTransaction(numId, {
      ...parsed.data,
      TRANSACTION_DATE: parsed.data.TRANSACTION_DATE.split("T")[0],
    });
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
