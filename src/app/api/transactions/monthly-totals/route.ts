import { NextResponse } from "next/server";
import { getMonthlyTotals } from "@/lib/queries";

export async function GET() {
  const months = await getMonthlyTotals();
  return NextResponse.json({ months });
}
