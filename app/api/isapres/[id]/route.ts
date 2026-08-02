import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import { updateIsapreGes } from "@/lib/api/isapre-store";
import { requireAdminSession } from "@/lib/auth/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isValidPayload(payload: unknown): payload is {
  gesPremiumUf?: number;
  gesPremiumUfLegacy?: number | null;
} {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;

  return (
    (data.gesPremiumUf === undefined || typeof data.gesPremiumUf === "number") &&
    (data.gesPremiumUfLegacy === undefined ||
      data.gesPremiumUfLegacy === null ||
      typeof data.gesPremiumUfLegacy === "number")
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const payload = await parseJsonBody(request);

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { error: "Datos de GES inválidos." },
        { status: 400 },
      );
    }

    const isapre = await updateIsapreGes(id, payload);
    return NextResponse.json({ isapre });
  } catch (error) {
    console.error("PATCH /api/isapres/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
