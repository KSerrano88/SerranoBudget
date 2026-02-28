import { NextRequest, NextResponse } from "next/server";
import {
  getDateRangeSummary,
  getTotalBalance,
  getPostedBalance,
  getCarryOver,
} from "@/lib/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = Number(searchParams.get("days") || "30");
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
