import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";
import { recurringCheckSchema } from "@/lib/recurring-input";
import { getRecurringDuplicates } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const parsed = recurringCheckSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  try {
    return NextResponse.json({
      duplicates: await getRecurringDuplicates(parsed.data.transactions),
    });
  } catch (error) {
    return errorResponse(error, "Check recurring transactions error");
  }
}
