import { NextResponse } from "next/server";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { createSendpulseLine, listSendpulseLines } from "@/lib/sendpulse/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const lines = await listSendpulseLines();
    return NextResponse.json({ lines });
  } catch (error) {
    console.error("GET /api/admin/sendpulse/lines", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const payload = (await parseJsonBody(request)) as {
      label?: string;
      botPhone?: string;
      apiKey?: string;
    };
    const created = await createSendpulseLine(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/sendpulse/lines", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
