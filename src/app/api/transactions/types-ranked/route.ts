import { NextResponse } from "next/server";
import { getTransactionTypesRanked } from "@/lib/queries";
import { requireAuth } from "@/lib/api-utils";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const { top, rest } = await getTransactionTypesRanked();
  return NextResponse.json({ top, rest });
}
