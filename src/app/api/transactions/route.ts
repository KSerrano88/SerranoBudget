import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  getBalanceSheetTransactions,
  createTransaction,
} from "@/lib/queries";
import { requireAuth, errorResponse, isValidDays, isCalendarDate, validationError } from "@/lib/api-utils";

const createTransactionSchema = z.object({
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
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (!isCalendarDate(parsed.data.TRANSACTION_DATE)) {
      return NextResponse.json(
        { error: "Invalid calendar date" },
        { status: 400 }
      );
    }

    const id = await createTransaction(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Create transaction error");
  }
}
