import { NextResponse } from "next/server";
import { readExecutiveAssignmentStats } from "@/lib/api/quote-store";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const stats = await readExecutiveAssignmentStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/quotes/assignment-stats", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
