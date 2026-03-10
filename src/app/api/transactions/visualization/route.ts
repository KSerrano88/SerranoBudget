import { NextRequest, NextResponse } from "next/server";
import { getVisualizationData } from "@/lib/queries";
import { requireAuth, isCalendarDate } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const typesParam = searchParams.get("tranTypes") || "";
  const tranTypes = typesParam ? typesParam.split(",") : [];

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

  if (tranTypes.length > 50) {
    return NextResponse.json(
      { error: "Too many transaction types" },
      { status: 400 }
    );
  }

  const data = await getVisualizationData({ startDate, endDate, tranTypes });
  return NextResponse.json({ data });
}
