import { prisma } from "@/lib/prisma";
import { sendSendpulseTriggerNotifyEmail } from "@/lib/email/send-sendpulse-trigger-notify";
import { checkRateLimit, readClientIp } from "@/lib/security/rate-limit";
import {
  SENDPULSE_DEDUPE_WINDOW_MS,
  getSendpulseNotifyEmail,
  normalizeSendpulseBotPhone,
  normalizeSendpulseContactPhone,
  payloadErrorMessage,
  previewBodyField,
  readSendpulseBearer,
  sendpulseTokensMatch,
  sendpulseWebhookSchema,
} from "@/lib/sendpulse/contract";
import type { SendpulseTriggerKey } from "@/lib/sendpulse/triggers";
import { recordSendpulseEvent } from "@/lib/sendpulse/events";

export type SendpulseWebhookResult = {
  ok: boolean;
  status: number;
};

const MAX_BODY_BYTES = 8_192;

export async function isSendpulseWebhookReady(): Promise<boolean> {
  if (!process.env.RESEND_API_KEY?.trim()) return false;
  if (!getSendpulseNotifyEmail()) return false;

  try {
    await prisma.sendpulseBotLine.count();
    return true;
  } catch (error) {
    console.error("[sendpulse] readiness", error);
    return false;
  }
}

export async function handleSendpulseWebhook(
  request: Request,
): Promise<SendpulseWebhookResult> {
  try {
    return await executeSendpulseWebhook(request);
  } catch (error) {
    console.error("[sendpulse] webhook", error);
    await recordSendpulseEvent({
      outcome: "UNAVAILABLE",
      httpStatus: 503,
      errorMessage: "Error interno.",
    });
    return { ok: false, status: 503 };
  }
}

async function executeSendpulseWebhook(
  request: Request,
): Promise<SendpulseWebhookResult> {
  const ip = readClientIp(request);
  const limit = checkRateLimit(`sendpulse-webhook:${ip}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    await recordSendpulseEvent({
      outcome: "RATE_LIMITED",
      httpStatus: 429,
      errorMessage: "Demasiadas solicitudes.",
    });
    return { ok: false, status: 429 };
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    await recordSendpulseEvent({
      outcome: "INVALID_PAYLOAD",
      httpStatus: 400,
      errorMessage: "No se pudo leer el cuerpo.",
    });
    return { ok: false, status: 400 };
  }

  if (raw.length > MAX_BODY_BYTES) {
    await recordSendpulseEvent({
      outcome: "INVALID_PAYLOAD",
      httpStatus: 413,
      errorMessage: "Cuerpo demasiado grande.",
    });
    return { ok: false, status: 413 };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    await recordSendpulseEvent({
      outcome: "INVALID_PAYLOAD",
      httpStatus: 400,
      errorMessage: "JSON inválido.",
    });
    return { ok: false, status: 400 };
  }

  const parsed = sendpulseWebhookSchema.safeParse(json);
  if (!parsed.success) {
    await recordSendpulseEvent({
      outcome: "INVALID_PAYLOAD",
      httpStatus: 400,
      errorMessage: payloadErrorMessage(parsed.error),
      contactId: previewBodyField(json, "id", 128),
      contactName: previewBodyField(json, "nombre", 160),
      contactPhone: previewBodyField(json, "telefono", 40),
      botPhone: previewBodyField(json, "bot", 40),
      triggerKey: previewBodyField(json, "disparador", 64),
    });
    return { ok: false, status: 400 };
  }

  const input = parsed.data;
  const botPhone = normalizeSendpulseBotPhone(input.bot);
  const contactPhone = normalizeSendpulseContactPhone(input.telefono);
  const contactName = input.nombre?.trim() || null;
  const baseLog = {
    contactId: input.id,
    contactName,
    contactPhone: contactPhone ?? input.telefono,
    botPhone: botPhone ?? input.bot,
    triggerKey: input.disparador,
  };

  if (!botPhone) {
    await recordSendpulseEvent({
      ...baseLog,
      outcome: "INVALID_PAYLOAD",
      httpStatus: 400,
      errorMessage: "bot debe ser el teléfono completo del bot, con +. Ejemplo: +56999999999.",
    });
    return { ok: false, status: 400 };
  }

  if (!contactPhone) {
    await recordSendpulseEvent({
      ...baseLog,
      outcome: "INVALID_PAYLOAD",
      httpStatus: 400,
      errorMessage: "telefono no es válido.",
    });
    return { ok: false, status: 400 };
  }

  const token = readSendpulseBearer(request);
  if (!token) {
    await recordSendpulseEvent({
      ...baseLog,
      contactPhone,
      botPhone,
      outcome: "INVALID_TOKEN",
      httpStatus: 401,
      errorMessage: "Falta el token.",
    });
    return { ok: false, status: 401 };
  }

  const line = await prisma.sendpulseBotLine.findUnique({
    where: { botPhone },
  });

  if (!line || !line.active || !sendpulseTokensMatch(token, line.tokenHash)) {
    await recordSendpulseEvent({
      ...baseLog,
      lineId: line?.id ?? null,
      contactPhone,
      botPhone,
      outcome: "INVALID_TOKEN",
      httpStatus: 401,
      errorMessage: !line
        ? "Bot no registrado o token inválido."
        : !line.active
          ? "La línea está revocada."
          : "Token inválido.",
    });
    return { ok: false, status: 401 };
  }

  const since = new Date(Date.now() - SENDPULSE_DEDUPE_WINDOW_MS);
  const recent = await prisma.sendpulseWebhookEvent.findFirst({
    where: {
      lineId: line.id,
      contactId: input.id,
      triggerKey: input.disparador,
      emailSent: true,
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (recent) {
    await recordSendpulseEvent({
      ...baseLog,
      lineId: line.id,
      contactPhone,
      botPhone,
      outcome: "DUPLICATE",
      httpStatus: 200,
      errorMessage: "Mismo disparador reciente. No se reenvió el correo.",
    });
    await touchLine(line.id);
    return { ok: true, status: 200 };
  }

  if (!(await isSendpulseWebhookReady())) {
    await recordSendpulseEvent({
      ...baseLog,
      lineId: line.id,
      contactPhone,
      botPhone,
      outcome: "UNAVAILABLE",
      httpStatus: 503,
      errorMessage: "El webhook no está listo para enviar el correo.",
    });
    return { ok: false, status: 503 };
  }

  const email = await sendSendpulseTriggerNotifyEmail({
    triggerKey: input.disparador as SendpulseTriggerKey,
    botPhone,
    lineLabel: line.label,
    contactId: input.id,
    contactName,
    contactPhone,
  });

  if (!email.ok) {
    await recordSendpulseEvent({
      ...baseLog,
      lineId: line.id,
      contactPhone,
      botPhone,
      outcome: "EMAIL_FAILED",
      httpStatus: 502,
      errorMessage: email.message,
    });
    return { ok: false, status: 502 };
  }

  await recordSendpulseEvent({
    ...baseLog,
    lineId: line.id,
    contactPhone,
    botPhone,
    outcome: "OK",
    httpStatus: 200,
    emailSent: true,
  });
  await touchLine(line.id);
  return { ok: true, status: 200 };
}

async function touchLine(lineId: string): Promise<void> {
  try {
    await prisma.sendpulseBotLine.update({
      where: { id: lineId },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    console.error("[sendpulse] no se pudo actualizar el último uso", error);
  }
}
