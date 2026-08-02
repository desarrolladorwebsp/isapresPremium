import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { readPlanCatalogBounds } from "@/lib/api/plan-search";

export async function GET() {
  try {
    const bounds = await readPlanCatalogBounds();
    return NextResponse.json(bounds, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("GET /api/plans/bounds", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
