import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
  ApiError,
} from "@/lib/api/api-error";
import { redirectClientToIsapresPremium } from "@/lib/api/client-pipeline-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import type { RedirectClientToPremiumInput } from "@/types/client-pipeline";
import { isClientContactMethod } from "@/types/client-pipeline";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseRedirectPayload(payload: unknown): RedirectClientToPremiumInput {
  if (!payload || typeof payload !== "object") {
    throw new ApiError("Datos inválidos.", 400, "INVALID_INPUT");
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.contactMethod !== "string" || !isClientContactMethod(data.contactMethod)) {
    throw new ApiError(
      "Selecciona el método de contacto: Zoom o WhatsApp.",
      400,
      "INVALID_INPUT",
    );
  }

  const input: RedirectClientToPremiumInput = {
    contactMethod: data.contactMethod,
    appointmentAt: "",
  };

  if (typeof data.appointmentAt !== "string" || !data.appointmentAt.trim()) {
    throw new ApiError(
      "Indica la fecha y hora en que el cliente solicitó ser atendido.",
      400,
      "INVALID_INPUT",
    );
  }
  const appointmentDate = new Date(data.appointmentAt);
  if (Number.isNaN(appointmentDate.getTime())) {
    throw new ApiError(
      "La fecha de atención solicitada no es válida.",
      400,
      "INVALID_INPUT",
    );
  }
  input.appointmentAt = appointmentDate.toISOString();

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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const { id } = await context.params;
    const payload = await parseJsonBody(request);
    const input = parseRedirectPayload(payload);

    const isAdmin = realm === AUTH_REALM.admin;
    const isZoom =
      realm === AUTH_REALM.executive &&
      (user as ExecutiveSessionUser).executiveKind === "ZOOM";

    const updated = await redirectClientToIsapresPremium(id, input, {
      executiveAccountId: user.id,
      isAdmin,
      isZoom,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/executive/clients/[id]/redirect-premium", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
