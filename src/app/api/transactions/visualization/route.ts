import { NextRequest, NextResponse } from "next/server";
import { getVisualizationData } from "@/lib/queries";

export async function GET(req: NextRequest) {
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

  const data = await getVisualizationData({ startDate, endDate, tranTypes });
  return NextResponse.json({ data });
}
