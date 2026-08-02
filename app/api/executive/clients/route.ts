import { NextResponse } from "next/server";
import {
  createManualClient,
  readClientRecords,
  readClientsForExecutive,
} from "@/lib/api/user-store";
import { parseClientProfilePayload } from "@/lib/api/parse-client-profile";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import { canAccessInternalPipelineNotes } from "@/lib/client-pipeline/note-stamp";
import type { CreateManualClientInput, UserRecord } from "@/types/user";
import { isManualSelectableClientOrigin } from "@/types/user";

function redactNotesIfNeeded(
  clients: UserRecord[],
  input: { isAdmin: boolean; executiveKind: string | null },
): UserRecord[] {
  if (
    canAccessInternalPipelineNotes({
      isAdmin: input.isAdmin,
      executiveKind: input.executiveKind,
    })
  ) {
    return clients;
  }
  return clients.map((client) => ({ ...client, pipelineNotes: null }));
}

function parseCreateClientPayload(payload: unknown): CreateManualClientInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Datos inválidos.");
  }

  const data = payload as Record<string, unknown>;
  const profile = parseClientProfilePayload(data);

  let clientOrigin: CreateManualClientInput["clientOrigin"];
  if (typeof data.clientOrigin === "string") {
    if (!isManualSelectableClientOrigin(data.clientOrigin)) {
      throw new Error("El origen del cliente no es válido.");
    }
    clientOrigin = data.clientOrigin;
  }

  return {
    ...profile,
    pipelineNotes:
      typeof data.pipelineNotes === "string" ? data.pipelineNotes : null,
    assignedExecutiveId:
      typeof data.assignedExecutiveId === "string"
        ? data.assignedExecutiveId
        : null,
    clientOrigin,
  };
}

export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);

    const clients =
      realm === AUTH_REALM.admin
        ? await readClientRecords()
        : await readClientsForExecutive(user.id);

    const executiveKind =
      realm === AUTH_REALM.executive
        ? (user as ExecutiveSessionUser).executiveKind
        : null;

    return NextResponse.json(
      redactNotesIfNeeded(clients, {
        isAdmin: realm === AUTH_REALM.admin,
        executiveKind,
      }),
    );
  } catch (error) {
    console.error("GET /api/executive/clients", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const payload = await parseJsonBody(request);
    const input = parseCreateClientPayload(payload);

    const created = await createManualClient(input, {
      executiveAccountId: user.id,
      isAdmin: realm === AUTH_REALM.admin,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/executive/clients", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
