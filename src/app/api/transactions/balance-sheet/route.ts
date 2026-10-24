import { NextRequest, NextResponse } from "next/server";
import { getBalanceSheet } from "@/lib/queries";
import { parseBalanceSheetFilters } from "@/lib/balance-sheet-input";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const filters = parseBalanceSheetFilters(request.nextUrl.searchParams);
  if (!filters.success) return validationError(filters.error);

  try {
    const balanceSheet = await getBalanceSheet(filters.data);
    return NextResponse.json(balanceSheet);
  } catch (error) {
    return errorResponse(error, "Read balance sheet error");
  }
}
