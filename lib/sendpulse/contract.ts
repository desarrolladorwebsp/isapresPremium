import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { isValidPhone, phoneDigits } from "@/lib/leads/validation";
import {
  SENDPULSE_TRIGGERS,
  type SendpulseTriggerKey,
} from "@/lib/sendpulse/triggers";

export { SENDPULSE_TRIGGERS, sendpulseTriggerLabel } from "@/lib/sendpulse/triggers";
export type { SendpulseTriggerKey } from "@/lib/sendpulse/triggers";

/** Destino de esta etapa. Se puede cambiar con SENDPULSE_NOTIFY_EMAIL. */
export const DEFAULT_SENDPULSE_NOTIFY_EMAIL = "ahurtado@smartpro.cl";

export const SENDPULSE_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

const TRIGGER_KEYS = Object.keys(SENDPULSE_TRIGGERS) as [
  SendpulseTriggerKey,
  ...SendpulseTriggerKey[],
];

export const sendpulseWebhookSchema = z.object({
  id: z.string().trim().min(1).max(128),
  nombre: z.union([z.string().trim().max(160), z.null()]).optional(),
  telefono: z.string().trim().min(1).max(40),
  bot: z.string().trim().min(1).max(40),
  disparador: z.enum(TRIGGER_KEYS),
});

export type SendpulseWebhookInput = z.infer<typeof sendpulseWebhookSchema>;

export function getSendpulseNotifyEmail(): string {
  return (
    process.env.SENDPULSE_NOTIFY_EMAIL?.trim() || DEFAULT_SENDPULSE_NOTIFY_EMAIL
  );
}

/** Teléfono del bot: obligatorio con + y código de país. Se guarda como +dígitos. */
export function normalizeSendpulseBotPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return null;
  if (!isValidPhone(trimmed)) return null;
  return `+${phoneDigits(trimmed)}`;
}

/** Teléfono del contacto. Acepta el formato que manda SendPulse, con o sin +. */
export function normalizeSendpulseContactPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidPhone(trimmed)) return null;
  return `+${phoneDigits(trimmed)}`;
}

export function generateSendpulseToken(): string {
  return `sp_${randomBytes(32).toString("base64url")}`;
}

export function hashSendpulseToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sendpulseTokenPrefix(token: string): string {
  return token.slice(0, 12);
}

export function sendpulseTokensMatch(presented: string, storedHash: string): boolean {
  const hash = hashSendpulseToken(presented);
  const left = Buffer.from(hash, "utf8");
  const right = Buffer.from(storedHash, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function readSendpulseBearer(request: Request): string | null {
  const header = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const token = match?.[1]?.trim() ?? "";
  return token || null;
}

export function payloadErrorMessage(error: z.ZodError): string {
  const field = error.issues[0]?.path[0];
  if (field === "id") return "id es obligatorio.";
  if (field === "telefono") return "telefono es obligatorio.";
  if (field === "bot") return "bot es obligatorio.";
  if (field === "nombre") return "nombre es demasiado largo.";
  if (field === "disparador") return "disparador no reconocido.";
  return "Datos inválidos.";
}

export function previewBodyField(
  body: unknown,
  key: string,
  max: number,
): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
