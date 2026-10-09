import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";
import {
  revokeSendpulseLine,
  rotateSendpulseLineToken,
} from "@/lib/sendpulse/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const action = new URL(request.url).searchParams.get("action");

    if (action === "rotate") {
      const rotated = await rotateSendpulseLineToken(id);
      return NextResponse.json(rotated);
    }

    if (action === "revoke") {
      const line = await revokeSendpulseLine(id);
      return NextResponse.json({ line });
    }

    return NextResponse.json(
      { error: "Acción no reconocida." },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/admin/sendpulse/lines/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
