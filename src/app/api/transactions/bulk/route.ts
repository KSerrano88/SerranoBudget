import { NextRequest, NextResponse } from "next/server";
import { updateTransaction, deleteTransactions } from "@/lib/queries";

function toDateOnly(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const transactions = body.transactions as Array<{
      id: number;
      TRANSACTION_DATE: string;
      CHECK_NMBR: string;
      DESCRIPTION: string;
      NOTES: string;
      MULTI_PART_TRAN_TOTAL: number;
      POSTED_FLAG: number;
      TRAN_TYPE: string;
      DEBIT: number;
      CREDIT: number;
    }>;

    for (const t of transactions) {
      await updateTransaction(t.id, {
        TRANSACTION_DATE: toDateOnly(t.TRANSACTION_DATE),
        CHECK_NMBR: t.CHECK_NMBR || "",
        DESCRIPTION: t.DESCRIPTION,
        NOTES: t.NOTES || "",
        MULTI_PART_TRAN_TOTAL: t.MULTI_PART_TRAN_TOTAL || 0,
        POSTED_FLAG: t.POSTED_FLAG || 0,
        TRAN_TYPE: t.TRAN_TYPE,
        DEBIT: t.DEBIT || 0,
        CREDIT: t.CREDIT || 0,
      });
    }

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    await deleteTransactions(body.ids as number[]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
