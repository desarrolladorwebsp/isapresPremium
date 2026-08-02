import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import {
  parsePlanSearchQuery,
  searchPlanSummaries,
} from "@/lib/api/plan-search";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parsePlanSearchQuery(searchParams);
    const result = await searchPlanSummaries(query);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/plans/search", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
