import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { getCachedCatalogItems } from "@/lib/api/plan-catalog-cache";

/** Catálogo ligero para filtrado en cliente (cotizador público). */
export async function GET() {
  try {
    const plans = await getCachedCatalogItems();

    return NextResponse.json(plans, {
      headers: {
        "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("GET /api/plans/catalog", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
