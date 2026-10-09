import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendPipelineNoteLine } from "@/lib/client-pipeline/note-stamp";
import { normalizeSendpulseContactPhone } from "@/lib/sendpulse/contract";
import { buildSendpulseClientPatch } from "@/lib/sendpulse/client-update";
import { sendpulseOriginLabel } from "@/lib/sendpulse/origin-label";
import { fetchSendpulseSnapshot } from "@/lib/sendpulse/remote";
import { sendpulseTriggerLabel } from "@/lib/sendpulse/triggers";

const PLACEHOLDER_NAME = "Contacto SendPulse";

export type SyncSendpulseClientInput = {
  contactId: string;
  botPhone: string;
  webhookName: string | null;
  webhookPhone: string | null;
  triggerKey: string | null;
  /** En un duplicado reciente no se agrega otra línea al historial. */
  writeHistory: boolean;
};

export type SyncSendpulseClientResult = {
  ok: boolean;
  created: boolean;
  clientId: string | null;
  origin: string | null;
  chatStored: boolean;
  chatChars: number;
  hasName: boolean;
  hasPhone: boolean;
};

function syntheticEmail(contactId: string): string {
  const hash = createHash("sha256").update(contactId).digest("hex").slice(0, 24);
  return `sp.${hash}@clientes.isaprespremium.cl`;
}

function resolvePhone(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value?.trim()) continue;
    const normalized = normalizeSendpulseContactPhone(value);
    if (normalized) return normalized;
  }
  return null;
}

function resolveName(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (trimmed) return trimmed.slice(0, 160);
  }
  return PLACEHOLDER_NAME;
}

function historyLine(botPhone: string, triggerKey: string | null): string {
  const trigger = sendpulseTriggerLabel(triggerKey) ?? triggerKey?.trim() ?? "evento";
  return `WhatsApp ${sendpulseOriginLabel(botPhone)}: ${trigger}.`;
}

/**
 * Busca o crea la ficha y, si hay mensajes, guarda el chat.
 * Un fallo de SendPulse o de la base no debe cortar el correo del webhook.
 */
export async function syncSendpulseClient(
  input: SyncSendpulseClientInput,
): Promise<SyncSendpulseClientResult> {
  const empty: SyncSendpulseClientResult = {
    ok: false,
    created: false,
    clientId: null,
    origin: null,
    chatStored: false,
    chatChars: 0,
    hasName: false,
    hasPhone: false,
  };

  try {
    const remote = await fetchSendpulseSnapshot(input.contactId);
    const fullName = resolveName(input.webhookName, remote.contact?.name);
    const phone = resolvePhone(remote.contact?.phone, input.webhookPhone);
    const chat = remote.chat?.trim() || null;

    const byContact = await prisma.user.findUnique({
      where: { sendpulseContactId: input.contactId },
    });
    const existing =
      byContact ??
      (phone
        ? await prisma.user.findFirst({
            where: { role: "CLIENT", phone },
            orderBy: { createdAt: "asc" },
          })
        : null);

    if (!existing) {
      const note = input.writeHistory
        ? appendPipelineNoteLine(null, historyLine(input.botPhone, input.triggerKey), "SendPulse")
        : null;
      const created = await prisma.user.create({
        data: {
          email: syntheticEmail(input.contactId),
          fullName,
          phone,
          role: "CLIENT",
          active: true,
          clientOrigin: "SENDPULSE",
          sendpulseContactId: input.contactId,
          sendpulseBotPhone: input.botPhone,
          sendpulseChat: chat,
          pipelineNotes: note,
        },
        select: {
          id: true,
          clientOrigin: true,
          fullName: true,
          phone: true,
          sendpulseChat: true,
        },
      });
      return {
        ok: true,
        created: true,
        clientId: created.id,
        origin: created.clientOrigin,
        chatStored: Boolean(created.sendpulseChat?.trim()),
        chatChars: created.sendpulseChat?.length ?? 0,
        hasName: created.fullName !== PLACEHOLDER_NAME,
        hasPhone: Boolean(created.phone),
      };
    }

    if (existing.role !== "CLIENT") {
      return empty;
    }

    if (
      existing.sendpulseContactId &&
      existing.sendpulseContactId !== input.contactId
    ) {
      return {
        ok: true,
        created: false,
        clientId: existing.id,
        origin: existing.clientOrigin,
        chatStored: Boolean(existing.sendpulseChat?.trim()),
        chatChars: existing.sendpulseChat?.length ?? 0,
        hasName: existing.fullName !== PLACEHOLDER_NAME,
        hasPhone: Boolean(existing.phone),
      };
    }

    const patch = buildSendpulseClientPatch(
      {
        clientOrigin: existing.clientOrigin,
        fullName: existing.fullName,
        phone: existing.phone,
        sendpulseChat: existing.sendpulseChat,
        sendpulseBotPhone: existing.sendpulseBotPhone,
      },
      {
        contactId: input.contactId,
        botPhone: input.botPhone,
        fullName,
        phone,
        chat,
      },
    );

    const data: Prisma.UserUpdateInput = { ...patch };
    if (input.writeHistory) {
      data.pipelineNotes = appendPipelineNoteLine(
        existing.pipelineNotes,
        historyLine(input.botPhone, input.triggerKey),
        "SendPulse",
      );
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        clientOrigin: true,
        fullName: true,
        phone: true,
        sendpulseChat: true,
      },
    });

    return {
      ok: true,
      created: false,
      clientId: updated.id,
      origin: updated.clientOrigin,
      chatStored: Boolean(updated.sendpulseChat?.trim()),
      chatChars: updated.sendpulseChat?.length ?? 0,
      hasName: updated.fullName !== PLACEHOLDER_NAME,
      hasPhone: Boolean(updated.phone),
    };
  } catch (error) {
    console.error(
      "[sendpulse] sync cliente",
      error instanceof Error ? error.message : "falló",
    );
    return empty;
  }
}
