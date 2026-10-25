import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse, validationError } from "@/lib/api-utils";
import { templateSchema } from "@/lib/recurring-input";
import {
  updateRecurringTemplate,
  deleteRecurringTemplate,
} from "@/lib/queries";

type Context = { params: Promise<{ id: string }> };
function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

export async function PUT(request: NextRequest, { params }: Context) {
  const authError = await requireAuth();
  if (authError) return authError;
  const id = Number((await params).id);
  if (!validId(id))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const parsed = templateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);
  try {
    const template = await updateRecurringTemplate(id, parsed.data);
    return template
      ? NextResponse.json({ template })
      : NextResponse.json({ error: "Template not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "Update recurring template error");
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const authError = await requireAuth();
  if (authError) return authError;
  const id = Number((await params).id);
  if (!validId(id))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  try {
    return (await deleteRecurringTemplate(id))
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "Template not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error, "Delete recurring template error");
  }
}
