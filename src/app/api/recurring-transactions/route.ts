import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";
import { recurringBatchSchema } from "@/lib/recurring-input";
import {
  createRecurringTransactions,
  RecurringDuplicateError,
  RecurringTemplateMissingError,
  RecurringRequestConflictError,
} from "@/lib/queries";

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const parsed = recurringBatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  try {
    return NextResponse.json(await createRecurringTransactions(parsed.data), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof RecurringDuplicateError) {
      return NextResponse.json(
        { error: error.message, duplicates: error.duplicates },
        { status: 409 },
      );
    }
    if (
      error instanceof RecurringTemplateMissingError ||
      error instanceof RecurringRequestConflictError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return errorResponse(error, "Add recurring transactions error");
  }
}
