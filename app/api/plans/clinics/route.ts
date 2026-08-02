import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { readPlanCatalogClinics } from "@/lib/api/plan-clinics";

export async function GET() {
  try {
    const clinics = await readPlanCatalogClinics();
    return NextResponse.json(clinics, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("GET /api/plans/clinics", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
