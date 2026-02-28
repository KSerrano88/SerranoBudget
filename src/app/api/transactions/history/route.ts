import { NextRequest, NextResponse } from "next/server";
import { getTransactionHistory } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const tranType = searchParams.get("tranType") || undefined;
  const tranTypeContains =
    searchParams.get("tranTypeContains") || undefined;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const result = await getTransactionHistory({
    startDate,
    endDate,
    tranType,
    tranTypeContains,
  });

  return NextResponse.json(result);
}
