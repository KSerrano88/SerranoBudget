import { NextRequest, NextResponse } from "next/server";
import { transactionSchema } from "@/lib/transaction-input";
import {
  getBalanceSheetTransactions,
  createTransaction,
} from "@/lib/queries";
import { requireAuth, errorResponse, isValidDays, validationError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const days = Number(searchParams.get("days") || "30");

  if (!isValidDays(days)) {
    return NextResponse.json(
      { error: "days must be a number between 0 and 3650" },
      { status: 400 }
    );
  }

  const postStatus = (searchParams.get("postStatus") || "all") as
    | "all"
    | "posted"
    | "unposted";

  const transactions = await getBalanceSheetTransactions(days, postStatus);
  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const id = await createTransaction(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Create transaction error");
  }
}
