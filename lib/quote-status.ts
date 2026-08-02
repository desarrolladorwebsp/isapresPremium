import type { QuoteStatus } from "@/types/quote";

/** Etiquetas del pipeline comercial de leads. */
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  PENDING: "Prospecto",
  CONTACTED: "Contratante",
  CONVERTED: "Compró",
  CANCELLED: "Rechazó",
};

export const QUOTE_STATUS_DESCRIPTIONS: Record<QuoteStatus, string> = {
  PENDING: "Lead nuevo sin gestionar",
  CONTACTED: "Cliente en proceso de contratación",
  CONVERTED: "Proceso finalizado — plan contratado",
  CANCELLED: "Cliente rechazó la propuesta",
};

export const QUOTE_STATUS_TONES: Record<
  QuoteStatus,
  "warning" | "info" | "success" | "neutral"
> = {
  PENDING: "warning",
  CONTACTED: "info",
  CONVERTED: "success",
  CANCELLED: "neutral",
};

export const QUOTE_STATUS_OPTIONS: QuoteStatus[] = [
  "PENDING",
  "CONTACTED",
  "CONVERTED",
  "CANCELLED",
];
