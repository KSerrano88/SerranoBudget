import { NextResponse } from "next/server";
import { getMonthlyTotals } from "@/lib/queries";
import { requireAuth } from "@/lib/api-utils";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const months = await getMonthlyTotals();
  return NextResponse.json({ months });
}
