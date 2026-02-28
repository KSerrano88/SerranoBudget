import { NextRequest, NextResponse } from "next/server";
import {
  getTransactionsByIds,
  updateTransaction,
  deleteTransactions,
} from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = await getTransactionsByIds([Number(id)]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ transaction: rows[0] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  await updateTransaction(Number(id), {
    TRANSACTION_DATE: (body.TRANSACTION_DATE || "").split("T")[0],
    CHECK_NMBR: body.CHECK_NMBR || "",
    DESCRIPTION: body.DESCRIPTION,
    NOTES: body.NOTES || "",
    MULTI_PART_TRAN_TOTAL: body.MULTI_PART_TRAN_TOTAL || 0,
    POSTED_FLAG: body.POSTED_FLAG || 0,
    TRAN_TYPE: body.TRAN_TYPE,
    DEBIT: body.DEBIT || 0,
    CREDIT: body.CREDIT || 0,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteTransactions([Number(id)]);
  return NextResponse.json({ success: true });
}
