import { NextRequest, NextResponse } from "next/server";
import { parseBalanceSheetFilters } from "@/lib/balance-sheet-input";
import { transactionSchema } from "@/lib/transaction-input";
import {
  getBalanceSheet,
  createTransaction,
} from "@/lib/queries";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const filters = parseBalanceSheetFilters(request.nextUrl.searchParams);
  if (!filters.success) return validationError(filters.error);

  try {
    const { transactions } = await getBalanceSheet(filters.data);
    return NextResponse.json({ transactions });
  } catch (error) {
    return errorResponse(error, "Read transactions error");
  }
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
