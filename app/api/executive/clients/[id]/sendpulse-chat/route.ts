import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/api-error";
import { readClientOrThrow } from "@/lib/api/user-store";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertSessionStaffSection, requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import { canViewClientAsExecutive } from "@/lib/client-pipeline/tracking";
import { prisma } from "@/lib/prisma";
import { openSendpulseApiKey } from "@/lib/sendpulse/api-key";
import { mergeSendpulseChat } from "@/lib/sendpulse/chat-merge";
import { fetchFullSendpulseChat } from "@/lib/sendpulse/remote";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id } = await params;
    const client = await readClientOrThrow(id);
    const kind = realm === AUTH_REALM.executive ? (user as ExecutiveSessionUser).executiveKind : null;
    if (!canViewClientAsExecutive(client, user.id, realm === AUTH_REALM.admin, kind)) {
      throw new ApiError("No tienes permiso para ver este cliente.", 403, "FORBIDDEN");
    }

    const contactId = client.sendpulseContactId;
    if (!contactId) {
      throw new ApiError("Esta ficha aún no está vinculada a un contacto de SendPulse.", 409, "SENDPULSE_NOT_LINKED");
    }

    const lineIds = client.sendpulseBotPhone ? [] : await prisma.sendpulseWebhookEvent.findMany({
      where: { contactId, lineId: { not: null }, outcome: { in: ["OK", "DUPLICATE", "EMAIL_FAILED"] } },
      distinct: ["lineId"],
      select: { lineId: true },
      take: 2,
    });
    const line = client.sendpulseBotPhone
      ? await prisma.sendpulseBotLine.findUnique({ where: { botPhone: client.sendpulseBotPhone } })
      : lineIds.length === 1 && lineIds[0].lineId
        ? await prisma.sendpulseBotLine.findUnique({ where: { id: lineIds[0].lineId } })
        : null;
    const key = line?.active ? openSendpulseApiKey(line.apiKeyEnc) : null;
    if (!key) {
      throw new ApiError("No se encontró una conexión activa de SendPulse para esta ficha.", 409, "SENDPULSE_CONNECTION_REQUIRED");
    }

    let incoming: Awaited<ReturnType<typeof fetchFullSendpulseChat>>;
    try {
      incoming = await fetchFullSendpulseChat(contactId, key);
    } catch {
      throw new ApiError("No se pudo leer todo el historial de SendPulse. Intenta de nuevo.", 502, "SENDPULSE_READ_FAILED");
    }

    const latest = await readClientOrThrow(id);
    if (!canViewClientAsExecutive(latest, user.id, realm === AUTH_REALM.admin, kind)) {
      throw new ApiError("No tienes permiso para ver este cliente.", 403, "FORBIDDEN");
    }
    if (latest.sendpulseContactId !== contactId || latest.sendpulseBotPhone !== client.sendpulseBotPhone) {
      throw new ApiError("Cambió la conexión de la ficha. Intenta de nuevo.", 409, "CLIENT_CHANGED");
    }
    const result = mergeSendpulseChat(latest.sendpulseChat, incoming.chat, incoming.legacyLines);
    if (result.added) {
      // Preserve updated_at and reject concurrent changes instead of overwriting a chat.
      const count = await prisma.$executeRaw`
        UPDATE users SET sendpulse_chat = ${result.chat}
        WHERE id = ${id} AND updated_at = ${latest.updatedAt}
          AND sendpulse_chat IS NOT DISTINCT FROM ${latest.sendpulseChat}::text
      `;
      if (count !== 1) throw new ApiError("La ficha cambió durante la consulta. Intenta de nuevo.", 409, "CLIENT_CHANGED");
    }
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
