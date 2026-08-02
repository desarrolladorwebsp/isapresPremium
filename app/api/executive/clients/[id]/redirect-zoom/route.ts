import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
  ApiError,
} from "@/lib/api/api-error";
import { redirectClientFromIsapresPremium } from "@/lib/api/client-pipeline-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import type { RedirectClientFromPremiumInput } from "@/types/client-pipeline";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseRedirectPayload(payload: unknown): RedirectClientFromPremiumInput {
  if (!payload || typeof payload !== "object") {
    throw new ApiError("Datos inválidos.", 400, "INVALID_INPUT");
  }

  const data = payload as Record<string, unknown>;
  const input: RedirectClientFromPremiumInput = {};

  if (data.executiveAccountId !== undefined) {
    if (data.executiveAccountId === null) {
      input.executiveAccountId = null;
    } else if (typeof data.executiveAccountId === "string") {
      input.executiveAccountId = data.executiveAccountId;
    } else {
      throw new ApiError("Ejecutivo destino inválido.", 400, "INVALID_INPUT");
    }
  }

  if (data.autoAssign !== undefined) {
    if (typeof data.autoAssign !== "boolean") {
      throw new ApiError("autoAssign inválido.", 400, "INVALID_INPUT");
    }
    input.autoAssign = data.autoAssign;
  }

  return input;
}

/**
 * Premium (o Admin) → Ejecutivo Zoom por falta de contacto.
 * Estado destino: NO_CONTESTA.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const { id } = await context.params;
    const payload = await parseJsonBody(request);
    const input = parseRedirectPayload(payload);

    const isAdmin = realm === AUTH_REALM.admin;
    const isPremium =
      realm === AUTH_REALM.executive &&
      (user as ExecutiveSessionUser).executiveKind === "ISAPRES_PREMIUM";

    const updated = await redirectClientFromIsapresPremium(
      id,
      input,
      {
        executiveAccountId: user.id,
        isAdmin,
        isPremium,
      },
      "ZOOM",
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/executive/clients/[id]/redirect-zoom", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
