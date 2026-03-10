import { NextRequest, NextResponse } from "next/server";
import { getTransactionHistory } from "@/lib/queries";
import { requireAuth, isCalendarDate } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

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

  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  if (tranType && tranType.length > 100) {
    return NextResponse.json(
      { error: "tranType exceeds maximum length" },
      { status: 400 }
    );
  }

  if (tranTypeContains && tranTypeContains.length > 100) {
    return NextResponse.json(
      { error: "tranTypeContains exceeds maximum length" },
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
