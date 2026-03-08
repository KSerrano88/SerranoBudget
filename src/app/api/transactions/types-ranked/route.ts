import { NextResponse } from "next/server";
import { getTransactionTypesRanked } from "@/lib/queries";

export async function GET() {
  const { top, rest } = await getTransactionTypesRanked();
  return NextResponse.json({ top, rest });
}
