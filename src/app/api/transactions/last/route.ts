import { NextResponse } from "next/server";
import { deleteLastTransaction } from "@/lib/queries";

export async function DELETE() {
  const deletedId = await deleteLastTransaction();
  return NextResponse.json({ deletedId });
}
