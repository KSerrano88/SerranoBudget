import { NextResponse } from "next/server";
import { getTransactionTypes } from "@/lib/queries";

export async function GET() {
  const types = await getTransactionTypes();
  return NextResponse.json({ types });
}
