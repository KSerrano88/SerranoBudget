import { NextRequest, NextResponse } from "next/server";
import {
  getBalanceSheetTransactions,
  createTransaction,
} from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = Number(searchParams.get("days") || "30");
  const postStatus = (searchParams.get("postStatus") || "all") as
    | "all"
    | "posted"
    | "unposted";

  const transactions = await getBalanceSheetTransactions(days, postStatus);
  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = await createTransaction({
      TRANSACTION_DATE: body.TRANSACTION_DATE,
      CHECK_NMBR: body.CHECK_NMBR || "",
      DESCRIPTION: body.DESCRIPTION,
      NOTES: body.NOTES || "",
      MULTI_PART_TRAN_TOTAL: body.MULTI_PART_TRAN_TOTAL || 0,
      POSTED_FLAG: body.POSTED_FLAG || 0,
      TRAN_TYPE: body.TRAN_TYPE,
      DEBIT: body.DEBIT || 0,
      CREDIT: body.CREDIT || 0,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
