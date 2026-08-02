import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { buildPlanPdfReport } from "@/lib/api/plan-pdf-report";
import { requireAdminSession } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const report = await buildPlanPdfReport();
    return NextResponse.json(report);
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
