import { NextResponse } from "next/server";
import { readQuoteActivities } from "@/lib/api/quote-activity-store";
import { readQuoteById } from "@/lib/api/quote-store";
import { apiErrorResponse } from "@/lib/api/api-error";
import {
  requireAdminSession,
  requireExecutiveSession,
} from "@/lib/auth/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    try {
      await requireAdminSession(request);
    } catch {
      const { user } = await requireExecutiveSession(request);
      const quote = await readQuoteById(id);

      if (!quote || quote.executiveAccountId !== user.id) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
      }
    }

    const activities = await readQuoteActivities(id);
    return NextResponse.json(activities);
  } catch (error) {
    console.error("GET /api/quotes/[id]/activities", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
