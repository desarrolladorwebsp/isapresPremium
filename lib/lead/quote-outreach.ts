import { formatPlanClp, formatQuotedUf } from "@/lib/plan-format";
import type { QuoteRecord } from "@/types/quote";

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("56") ? digits : `56${digits}`;
}

function formatPriceLine(quote: QuoteRecord): string {
  const parts: string[] = [];
  if (quote.finalPriceClp != null) {
    parts.push(formatPlanClp(quote.finalPriceClp));
  }
  if (quote.finalPriceUf != null) {
    parts.push(formatQuotedUf(quote.finalPriceUf));
  }
  return parts.length > 0 ? parts.join(" · ") : "según tu perfil";
}

/** Enlace wa.me al teléfono del cliente con mensaje de propuesta. */
export function buildClientWhatsAppUrl(
  quote: QuoteRecord,
  executiveName?: string | null,
): string | null {
  const phone = normalizeWhatsAppPhone(quote.phone);
  if (!phone) return null;

  const planLine = quote.planName
    ? `${quote.planName}${quote.planIsapre ? ` (${quote.planIsapre})` : ""}`
    : "plan de salud";

  const message = [
    `Hola ${quote.fullName},`,
    `soy ${executiveName ?? "tu ejecutivo"} de Cotizador Premium.`,
    `Te contacto por tu solicitud del ${planLine}.`,
    `Precio estimado: ${formatPriceLine(quote)}.`,
    "¿Te parece si coordinamos una llamada o revisamos juntos la propuesta?",
  ].join(" ");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** mailto: al correo del cliente con asunto y cuerpo de propuesta. */
export function buildProposalEmailUrl(
  quote: QuoteRecord,
  executiveName?: string | null,
): string {
  const planLine = quote.planName
    ? `${quote.planName}${quote.planIsapre ? ` (${quote.planIsapre})` : ""}`
    : "plan de salud";

  const subject = `Propuesta ${planLine} — Cotizador Premium`;

  const body = [
    `Hola ${quote.fullName},`,
    "",
    `Soy ${executiveName ?? "tu ejecutivo asignado"} de Cotizador Premium.`,
    `Gracias por cotizar con nosotros. Según los datos que ingresaste, esta es tu propuesta:`,
    "",
    `Plan: ${planLine}`,
    `Precio estimado: ${formatPriceLine(quote)}`,
    quote.region ? `Región: ${quote.region}` : "",
    "",
    "Quedo atento/a para resolver dudas o avanzar con la contratación.",
    "",
    "Saludos,",
    executiveName ?? "Equipo Cotizador Premium",
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${quote.email}?${params.toString()}`;
}
