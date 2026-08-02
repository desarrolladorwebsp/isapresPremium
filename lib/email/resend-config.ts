import { ApiError } from "@/lib/api/api-error";

/** Correo visible al usuario que cotiza en el cotizador / widget. */
export const DEFAULT_COTIZACION_FROM_EMAIL =
  "Isapres Premium <cotizaciones@isaprespremium.cl>";

/** Correo del equipo (invitaciones staff). */
export const DEFAULT_EQUIPO_FROM_EMAIL =
  "Isapres Premium <equipo@isaprespremium.cl>";

/** Buzón que recibe alertas de cotizaciones y solicitudes de plan. */
export const DEFAULT_COTIZACION_NOTIFY_EMAIL = "cotizaciones@isaprespremium.cl";

/** Copia (CC) por defecto del aviso interno de cotización. */
export const DEFAULT_COTIZACION_NOTIFY_CC_EMAILS = [
  "premiumisapres@gmail.com",
] as const;

/** @deprecated Usar COTIZACION_NOTIFY_EMAIL. Mantenido por compatibilidad. */
export const DEFAULT_EQUIPO_NOTIFY_EMAIL = "equipo@isaprespremium.cl";

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match?.[1] ?? fromHeader).trim();
}

export function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new ApiError(
      "Resend no está configurado. Agrega RESEND_API_KEY en las variables de entorno.",
      500,
    );
  }

  return apiKey;
}

export function getCotizacionFromEmail(): string {
  return (
    process.env.RESEND_COTIZACION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    DEFAULT_COTIZACION_FROM_EMAIL
  );
}

export function getEquipoFromEmail(): string {
  return (
    process.env.RESEND_EQUIPO_FROM_EMAIL?.trim() ||
    DEFAULT_EQUIPO_FROM_EMAIL
  );
}

/** Buzón interno: nuevas cotizaciones y solicitudes de plan. */
export function getCotizacionNotifyEmail(): string {
  return (
    process.env.COTIZACION_NOTIFY_EMAIL?.trim() ||
    extractEmailAddress(getCotizacionFromEmail()) ||
    DEFAULT_COTIZACION_NOTIFY_EMAIL
  );
}

function isLikelyEmailAddress(value: string): boolean {
  const at = value.indexOf("@");
  return at > 0 && at < value.length - 1 && !value.includes(" ");
}

/**
 * Destinos CC del aviso interno de cotización.
 * Env `COTIZACION_NOTIFY_CC`: lista separada por coma.
 * Fallback: premiumisapres@gmail.com. Excluye el TO principal si coincide.
 */
export function getCotizacionNotifyCcEmails(): string[] {
  const raw = process.env.COTIZACION_NOTIFY_CC?.trim();
  const candidates = raw
    ? raw.split(",").map((part) => part.trim().toLowerCase())
    : [...DEFAULT_COTIZACION_NOTIFY_CC_EMAILS];

  const primary = getCotizacionNotifyEmail().trim().toLowerCase();
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const email of candidates) {
    if (!email || !isLikelyEmailAddress(email) || email === primary) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}

/** @deprecated Usar getCotizacionNotifyEmail para alertas de cotización. */
export function getEquipoNotifyEmail(): string {
  return (
    process.env.EQUIPO_NOTIFY_EMAIL?.trim() ||
    process.env.COTIZACION_NOTIFY_EMAIL?.trim() ||
    DEFAULT_EQUIPO_NOTIFY_EMAIL
  );
}
