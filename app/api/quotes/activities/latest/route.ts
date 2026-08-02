import { NextResponse } from "next/server";
import { readLatestActivitiesByQuoteIds } from "@/lib/api/quote-activity-store";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { apiErrorResponse } from "@/lib/api/api-error";

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const payload = (await request.json()) as { quoteIds?: unknown };
    const quoteIds = Array.isArray(payload.quoteIds)
      ? payload.quoteIds.filter((id): id is string => typeof id === "string")
      : [];

    const latestByQuote = await readLatestActivitiesByQuoteIds(quoteIds);
    const result = Object.fromEntries(latestByQuote.entries());

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/quotes/activities/latest", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
