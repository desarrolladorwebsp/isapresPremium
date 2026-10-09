import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { listSendpulseEvents } from "@/lib/sendpulse/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 80);
    const events = await listSendpulseEvents(limit);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /api/admin/sendpulse/events", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
