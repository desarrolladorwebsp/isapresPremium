import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { lookupCompanyAgreements } from "@/lib/api/company-agreements";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyRut = searchParams.get("rut");
    const companyName = searchParams.get("q");
    const result = await lookupCompanyAgreements({ companyRut, companyName });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/company-agreements/lookup", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
