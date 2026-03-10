import { NextResponse } from "next/server";
import { getTransactionTypes } from "@/lib/queries";
import { requireAuth } from "@/lib/api-utils";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const types = await getTransactionTypes();
  return NextResponse.json({ types });
}
