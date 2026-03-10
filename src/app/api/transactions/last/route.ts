import { NextResponse } from "next/server";
import { deleteLastTransaction } from "@/lib/queries";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function DELETE() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const deletedId = await deleteLastTransaction();
    return NextResponse.json({ deletedId });
  } catch (error) {
    return errorResponse(error, "Delete last transaction error");
  }
}
