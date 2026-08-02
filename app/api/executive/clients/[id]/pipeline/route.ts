import { NextResponse } from "next/server";
import { updateClientPipeline } from "@/lib/api/client-pipeline-store";
import { parseClientProfilePayload } from "@/lib/api/parse-client-profile";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { UpdateClientPipelineInput } from "@/types/client-pipeline";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parsePipelinePayload(payload: unknown): UpdateClientPipelineInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Datos inválidos.");
  }

  const data = payload as Record<string, unknown>;
  const input: UpdateClientPipelineInput = {};

  if (data.pipelineStatus !== undefined) {
    if (typeof data.pipelineStatus !== "string") {
      throw new Error("Estado inválido.");
    }
    input.pipelineStatus = data.pipelineStatus as UpdateClientPipelineInput["pipelineStatus"];
  }

  if (data.checklist !== undefined) {
    input.checklist = data.checklist as UpdateClientPipelineInput["checklist"];
  }

  if (data.closedRecord !== undefined) {
    input.closedRecord =
      data.closedRecord === null
        ? null
        : (data.closedRecord as UpdateClientPipelineInput["closedRecord"]);
  }

  if (data.pipelineNotes !== undefined) {
    input.pipelineNotes =
      typeof data.pipelineNotes === "string" ? data.pipelineNotes : null;
  }

  if (data.nextCallAt !== undefined) {
    if (data.nextCallAt === null) {
      input.nextCallAt = null;
    } else if (typeof data.nextCallAt === "string") {
      input.nextCallAt = data.nextCallAt;
    } else {
      throw new Error("Fecha de próximo llamado inválida.");
    }
  }

  if (data.lastCallOutcome !== undefined) {
    input.lastCallOutcome =
      data.lastCallOutcome === null
        ? null
        : typeof data.lastCallOutcome === "string"
          ? data.lastCallOutcome
          : null;
  }

  if (data.preferredContactMethod !== undefined) {
    if (data.preferredContactMethod === null) {
      input.preferredContactMethod = null;
    } else if (
      typeof data.preferredContactMethod === "string" &&
      (data.preferredContactMethod === "ZOOM" ||
        data.preferredContactMethod === "WHATSAPP")
    ) {
      input.preferredContactMethod = data.preferredContactMethod;
    } else {
      throw new Error("Método de contacto inválido.");
    }
  }

  if (data.clientProfile !== undefined) {
    input.clientProfile = parseClientProfilePayload(data.clientProfile);
  }

  return input;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const { id } = await context.params;
    const payload = await parseJsonBody(request);
    const input = parsePipelinePayload(payload);

    const updated = await updateClientPipeline(id, input, {
      executiveAccountId: user.id,
      isAdmin: realm === AUTH_REALM.admin,
      executiveKind:
        realm === AUTH_REALM.executive
          ? (user as import("@/lib/auth/types").ExecutiveSessionUser).executiveKind
          : null,
    });

    if (
      realm === AUTH_REALM.executive &&
      (user as import("@/lib/auth/types").ExecutiveSessionUser).executiveKind ===
        "ISAPRES"
    ) {
      return NextResponse.json({ ...updated, pipelineNotes: null });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/executive/clients/[id]/pipeline", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
