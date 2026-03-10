import { NextRequest, NextResponse } from "next/server";
import {
  getDateRangeSummary,
  getTotalBalance,
  getPostedBalance,
  getCarryOver,
} from "@/lib/queries";
import { requireAuth, isValidDays } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const days = Number(searchParams.get("days") || "30");

  if (!isValidDays(days)) {
    return NextResponse.json(
      { error: "days must be a number between 0 and 3650" },
      { status: 400 }
    );
  }

  const postStatus = (searchParams.get("postStatus") || "all") as
    | "all"
    | "posted"
    | "unposted";

  const [rangeSummary, totalBalance, postedBalance, carryOver] =
    await Promise.all([
      getDateRangeSummary(days, postStatus),
      getTotalBalance(),
      getPostedBalance(),
      getCarryOver(),
    ]);

  return NextResponse.json({
    rangeSummary,
    totalBalance,
    postedBalance,
    carryOver,
  });
}
