import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { ClientQuotationStatus } from "@/types/client-quotation";

export const CLIENT_BOARD_WORK_COLUMNS = [
  "POR_CONTACTAR",
  "EN_GESTION",
  "COTIZACION_ENVIADA",
  "ENVIADO_ISAPRE",
] as const;

export const CLIENT_BOARD_QUICK_FILTERS = [
  { value: "EN_CURSO", label: "En curso" },
  { value: "PAUSADO", label: "En pausa" },
  { value: "RECEPCIONADO", label: "Recepcionado" },
  { value: "PERDIDO", label: "Perdido" },
] as const;

type WorkColumn = (typeof CLIENT_BOARD_WORK_COLUMNS)[number];
export type ClientBoardFilter = (typeof CLIENT_BOARD_QUICK_FILTERS)[number]["value"];
export type ClientBoardColumn = WorkColumn | Exclude<ClientBoardFilter, "EN_CURSO">;

export const CLIENT_BOARD_COLUMN_LABELS: Record<ClientBoardColumn, string> = {
  POR_CONTACTAR: "Por contactar o retomar",
  EN_GESTION: "En gestión",
  COTIZACION_ENVIADA: "Cotización enviada",
  ENVIADO_ISAPRE: "Enviado a Isapre",
  PAUSADO: "En pausa",
  RECEPCIONADO: "Recepcionado",
  PERDIDO: "Perdido",
};

export interface ClientBoardQuotation {
  clientId: string;
  awaitingResponse: boolean;
  accepted: boolean;
  receipt?: { received: number; total: number };
}

export function isClientBoardWorkStatus(status: ClientPipelineStatus | null | undefined): boolean {
  return status !== "PAUSADO" && status !== "RECEPCIONADO" && status !== "PERDIDO";
}

/** Presentation only. The stored client and quotation states have separate lifecycles. */
export function clientBoardColumn(
  status: ClientPipelineStatus | null | undefined,
  quotation?: ClientBoardQuotation,
): ClientBoardColumn {
  switch (status) {
    case "PAUSADO":
    case "RECEPCIONADO":
    case "PERDIDO":
    case "ENVIADO_ISAPRE":
      return status;
    case "PENDIENTE":
      return "POR_CONTACTAR";
    default:
      if (quotation?.accepted || quotation?.awaitingResponse) return "COTIZACION_ENVIADA";
      return status === "CONTACTADO" || status === "EN_SEGUIMIENTO" ? "EN_GESTION" : "POR_CONTACTAR";
  }
}

export function clientBoardCardNote(
  status: ClientPipelineStatus | null | undefined,
  column: ClientBoardColumn,
  quotation?: ClientBoardQuotation,
): string {
  if (column === "COTIZACION_ENVIADA") {
    const outcome = quotation?.accepted ? "Aceptada · falta enviar a Isapre" : "Esperando respuesta";
    return status === "NO_CONTESTA" ? `${outcome} · No contesta` : outcome;
  }
  if (column === "ENVIADO_ISAPRE" && quotation?.receipt?.received) {
    const { received, total } = quotation.receipt;
    return `${received} de ${total} ${total === 1 ? "titular recepcionado" : "titulares recepcionados"}`;
  }
  if (column === "POR_CONTACTAR") {
    if (status === "PENDIENTE") return "Pendiente de revisión";
    return status === "NO_CONTESTA" ? "No contesta · reintentar" : "Nuevo";
  }
  return "";
}

export interface ClientBoardQuotationEvidence {
  clientId: string;
  status: ClientQuotationStatus;
  sentAt: Date | null;
  validUntil: Date | null;
  sentConfirmed: boolean;
  holderSelections: unknown;
}

/** Rows are ordered by latest acceptance on the server. Only counts reach the list. */
export function summarizeClientBoardQuotations(
  quotations: readonly ClientBoardQuotationEvidence[],
  now = new Date(),
): ClientBoardQuotation[] {
  const summaries = new Map<string, ClientBoardQuotation>();
  const receiptClients = new Set<string>();
  for (const row of quotations) {
    if (row.status !== "SENT" && row.status !== "ACCEPTED" && row.status !== "RECEIVED") continue;
    const awaitingResponse = row.status === "SENT" && row.sentConfirmed &&
      Boolean(row.sentAt) && (!row.validUntil || row.validUntil >= now);
    if (row.status === "SENT" && !awaitingResponse) continue;

    const summary = summaries.get(row.clientId) ?? { clientId: row.clientId, awaitingResponse: false, accepted: false };
    summary.awaitingResponse ||= awaitingResponse;
    summary.accepted ||= row.status === "ACCEPTED";
    if (row.status !== "SENT" && !receiptClients.has(row.clientId)) {
      receiptClients.add(row.clientId);
      const holders = row.holderSelections;
      if (Array.isArray(holders) && holders.length) {
        const received = holders.filter((holder) =>
          typeof holder?.receivedAt === "string" && Number.isFinite(Date.parse(holder.receivedAt)),
        ).length;
        summary.receipt = { received, total: holders.length };
      }
    }
    summaries.set(row.clientId, summary);
  }
  return [...summaries.values()];
}
