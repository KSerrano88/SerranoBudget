import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";
import { templateSchema } from "@/lib/recurring-input";
import { createRecurringTemplate, getRecurringTemplates } from "@/lib/queries";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    return NextResponse.json({ templates: await getRecurringTemplates() });
  } catch (error) {
    return errorResponse(error, "Read recurring templates error");
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  try {
    return NextResponse.json(
      { template: await createRecurringTemplate(parsed.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, "Create recurring template error");
  }
}
