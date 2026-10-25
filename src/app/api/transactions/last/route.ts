import { NextRequest, NextResponse } from "next/server";
import { deleteLastTransaction, getLastTransaction } from "@/lib/queries";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    return NextResponse.json({ transaction: await getLastTransaction() });
  } catch (error) {
    return errorResponse(error, "Read last transaction error");
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  try {
    const deletedId = await deleteLastTransaction(id);
    if (deletedId === null) {
      return NextResponse.json({ error: "This transaction was already deleted" }, { status: 404 });
    }
    return NextResponse.json({ deletedId });
  } catch (error) {
    return errorResponse(error, "Delete last transaction error");
  }
}
