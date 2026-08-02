import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { readLimitedPlanSummaries } from "@/lib/api/plan-search";
import { EMBED_WIDGET_PLANS_LIMIT } from "@/lib/plan-search-config";

/** Vista previa ligera para el widget embebido (primeros N planes más baratos). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const parsedLimit = limitRaw !== null ? Number(limitRaw) : EMBED_WIDGET_PLANS_LIMIT;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(Math.floor(parsedLimit), EMBED_WIDGET_PLANS_LIMIT)
        : EMBED_WIDGET_PLANS_LIMIT;

    const result = await readLimitedPlanSummaries(limit);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("GET /api/plans/widget-preview", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
