export type ClientQuotationStatus =
  | "DRAFT"
  | "SENT"
  | "RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "VOIDED";

export type ClientQuotationActivityType =
  | "CREATED"
  | "PDF_DOWNLOADED"
  | "EMAIL_SENT"
  | "EMAIL_FAILED"
  | "WHATSAPP_OPENED"
  | "STATUS_CHANGED";

export interface ClientQuotationPlanSnapshot {
  planCode: string;
  planName: string;
  isapre: string;
  planType: string;
  basePriceUf: number;
  finalPriceUf: number;
  finalPriceClp: number | null;
  coverageSummary: string[];
  planPdfUrl: string | null;
}

export interface ClientQuotationActivityRecord {
  id: string;
  activityType: ClientQuotationActivityType;
  actorName: string | null;
  channel: string | null;
  previousValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
}

export interface ClientQuotationRecord {
  id: string;
  number: string;
  clientId: string;
  executiveId: string;
  executiveName: string;
  status: ClientQuotationStatus;
  version: number;
  pdfUrl: string;
  validUntil: string | null;
  issuedAt: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  voidedAt: string | null;
  outcomeReason: string | null;
  plans: ClientQuotationPlanSnapshot[];
  activities: ClientQuotationActivityRecord[];
  createdAt: string;
  updatedAt: string;
}

export const CLIENT_QUOTATION_STATUS_LABELS: Record<ClientQuotationStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  RECEIVED: "Recepcionada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  VOIDED: "Anulada",
};

export const CLIENT_QUOTATION_STATUS_HELP: Record<ClientQuotationStatus, string> = {
  DRAFT: "Documento creado y todavía no enviado al cliente.",
  SENT: "Cotización compartida por correo o WhatsApp.",
  RECEIVED: "El cliente confirmó la recepción de la cotización.",
  ACCEPTED: "El cliente aceptó una de las propuestas.",
  REJECTED: "El cliente rechazó las propuestas incluidas.",
  VOIDED: "Cotización invalidada por error, reemplazo o cambio de condiciones.",
};

export const CLIENT_QUOTATION_STATUS_OPTIONS = Object.keys(
  CLIENT_QUOTATION_STATUS_LABELS,
) as ClientQuotationStatus[];
