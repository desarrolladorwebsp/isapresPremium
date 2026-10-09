import type { SendpulseBotLine, SendpulseWebhookOutcome } from "@prisma/client";
import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import {
  generateSendpulseToken,
  hashSendpulseToken,
  normalizeSendpulseBotPhone,
  sendpulseTokenPrefix,
} from "@/lib/sendpulse/contract";
import { sendpulseTriggerLabel } from "@/lib/sendpulse/triggers";
import type {
  SendpulseEventRecord,
  SendpulseLineRecord,
} from "@/types/sendpulse";

const OUTCOME_LABELS: Record<SendpulseWebhookOutcome, string> = {
  OK: "OK",
  DUPLICATE: "Duplicado",
  INVALID_TOKEN: "Token inválido",
  INVALID_PAYLOAD: "Datos inválidos",
  EMAIL_FAILED: "Fallo de correo",
  RATE_LIMITED: "Demasiadas solicitudes",
  UNAVAILABLE: "No disponible",
};

function toLineRecord(line: SendpulseBotLine): SendpulseLineRecord {
  return {
    id: line.id,
    label: line.label,
    botPhone: line.botPhone,
    tokenPrefix: line.tokenPrefix,
    active: line.active,
    lastUsedAt: line.lastUsedAt?.toISOString() ?? null,
    createdAt: line.createdAt.toISOString(),
  };
}

function parseLineInput(input: { label?: string; botPhone?: string }): {
  label: string;
  botPhone: string;
} {
  const label = input.label?.trim() ?? "";
  if (label.length < 2 || label.length > 80) {
    throw new ApiError("Indica un nombre de 2 a 80 caracteres.", 400, "INVALID_INPUT");
  }

  const botPhone = normalizeSendpulseBotPhone(input.botPhone ?? "");
  if (!botPhone) {
    throw new ApiError(
      "El teléfono del bot debe incluir + y el código de país. Ejemplo: +56999999999.",
      400,
      "INVALID_INPUT",
    );
  }

  return { label, botPhone };
}

export async function listSendpulseLines(): Promise<SendpulseLineRecord[]> {
  const lines = await prisma.sendpulseBotLine.findMany({
    orderBy: { createdAt: "desc" },
  });
  return lines.map(toLineRecord);
}

export async function createSendpulseLine(input: {
  label?: string;
  botPhone?: string;
}): Promise<{ line: SendpulseLineRecord; token: string }> {
  const { label, botPhone } = parseLineInput(input);
  const token = generateSendpulseToken();

  try {
    const line = await prisma.sendpulseBotLine.create({
      data: {
        label,
        botPhone,
        tokenHash: hashSendpulseToken(token),
        tokenPrefix: sendpulseTokenPrefix(token),
      },
    });
    return { line: toLineRecord(line), token };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        "Ya existe una línea con ese número. Rota el token si necesitas uno nuevo.",
        409,
        "BOT_PHONE_TAKEN",
      );
    }
    throw error;
  }
}

export async function rotateSendpulseLineToken(
  id: string,
): Promise<{ line: SendpulseLineRecord; token: string }> {
  const existing = await prisma.sendpulseBotLine.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Línea no encontrada.", 404, "NOT_FOUND");
  }

  const token = generateSendpulseToken();
  const line = await prisma.sendpulseBotLine.update({
    where: { id },
    data: {
      tokenHash: hashSendpulseToken(token),
      tokenPrefix: sendpulseTokenPrefix(token),
      active: true,
      revokedAt: null,
    },
  });

  return { line: toLineRecord(line), token };
}

export async function revokeSendpulseLine(id: string): Promise<SendpulseLineRecord> {
  const existing = await prisma.sendpulseBotLine.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Línea no encontrada.", 404, "NOT_FOUND");
  }

  const line = await prisma.sendpulseBotLine.update({
    where: { id },
    data: {
      active: false,
      revokedAt: new Date(),
    },
  });

  return toLineRecord(line);
}

export async function listSendpulseEvents(
  limit = 80,
): Promise<SendpulseEventRecord[]> {
  const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 80;
  const events = await prisma.sendpulseWebhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { line: { select: { label: true } } },
  });
  const contactIds = [
    ...new Set(
      events.flatMap((event) => (event.contactId ? [event.contactId] : [])),
    ),
  ];
  const clients =
    contactIds.length > 0
      ? await prisma.user.findMany({
          where: {
            role: "CLIENT",
            sendpulseContactId: { in: contactIds },
          },
          select: { id: true, sendpulseContactId: true },
        })
      : [];
  const clientByContact = new Map(
    clients.flatMap((client) =>
      client.sendpulseContactId ? [[client.sendpulseContactId, client.id] as const] : [],
    ),
  );

  return events.map((event) => ({
    id: event.id,
    lineId: event.lineId,
    lineLabel: event.line?.label ?? null,
    botPhone: event.botPhone,
    contactId: event.contactId,
    contactName: event.contactName,
    contactPhone: event.contactPhone,
    triggerKey: event.triggerKey,
    triggerLabel: sendpulseTriggerLabel(event.triggerKey),
    outcome: event.outcome,
    outcomeLabel: OUTCOME_LABELS[event.outcome],
    httpStatus: event.httpStatus,
    errorMessage: event.errorMessage,
    emailSent: event.emailSent,
    createdAt: event.createdAt.toISOString(),
    clientId: event.contactId ? (clientByContact.get(event.contactId) ?? null) : null,
  }));
}
