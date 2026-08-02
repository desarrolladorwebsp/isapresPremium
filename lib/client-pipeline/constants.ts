import type {
  ClientChecklist,
  ClientChecklistItem,
  ClientClosedRecord,
  ClientPipelineStatus,
} from "@/types/client-pipeline";

export const CLIENT_PIPELINE_STATUS_LABELS: Record<ClientPipelineStatus, string> =
  {
    NUEVO: "Nuevo",
    CONTACTADO: "Contactado",
    NO_CONTESTA: "No contesta",
    EN_SEGUIMIENTO: "En seguimiento",
    PROPUESTA_ENVIADA: "Propuesta enviada",
    DOCUMENTACION: "Documentación",
    ENVIADO_ISAPRE: "Enviado a Isapre",
    CERRADO: "Cerrado",
    PERDIDO: "Perdido",
  };

export const CLIENT_PIPELINE_STATUS_DESCRIPTIONS: Record<
  ClientPipelineStatus,
  string
> = {
  NUEVO: "Cliente asignado, sin primer contacto",
  CONTACTADO: "Primer contacto realizado",
  NO_CONTESTA: "Se intentó contactar y no respondió",
  EN_SEGUIMIENTO: "Conversación activa con el cliente",
  PROPUESTA_ENVIADA: "Plan o propuesta enviada al cliente",
  DOCUMENTACION: "Recolectando documentos para la Isapre",
  ENVIADO_ISAPRE: "Expediente enviado a la Isapre",
  CERRADO: "Contrato cerrado exitosamente",
  PERDIDO: "No prosperó la contratación",
};

export const CLIENT_PIPELINE_STATUS_TONES: Record<
  ClientPipelineStatus,
  "warning" | "info" | "success" | "neutral" | "danger"
> = {
  NUEVO: "warning",
  CONTACTADO: "info",
  NO_CONTESTA: "warning",
  EN_SEGUIMIENTO: "info",
  PROPUESTA_ENVIADA: "info",
  DOCUMENTACION: "warning",
  ENVIADO_ISAPRE: "info",
  CERRADO: "success",
  PERDIDO: "danger",
};

export const CLIENT_PIPELINE_STATUS_OPTIONS: ClientPipelineStatus[] = [
  "NUEVO",
  "CONTACTADO",
  "NO_CONTESTA",
  "EN_SEGUIMIENTO",
  "PROPUESTA_ENVIADA",
  "DOCUMENTACION",
  "ENVIADO_ISAPRE",
  "CERRADO",
  "PERDIDO",
];

/** Estados relevantes en la gestión simplificada de Ejecutivo Zoom. */
export const ZOOM_PIPELINE_STATUS_OPTIONS: ClientPipelineStatus[] = [
  "NUEVO",
  "CONTACTADO",
  "NO_CONTESTA",
  "EN_SEGUIMIENTO",
  "PERDIDO",
];

/** Orden del embudo comercial (ramas laterales con rango bajo para poder reingresar). */
const PIPELINE_FUNNEL_RANK: Record<ClientPipelineStatus, number> = {
  NUEVO: 0,
  NO_CONTESTA: 1,
  CONTACTADO: 2,
  EN_SEGUIMIENTO: 3,
  PROPUESTA_ENVIADA: 4,
  DOCUMENTACION: 5,
  ENVIADO_ISAPRE: 6,
  CERRADO: 7,
  PERDIDO: -1,
};

/**
 * Avanza el estado solo hacia adelante en el embudo.
 * No mueve CERRADO ni PERDIDO; tampoco degrada un estado más avanzado.
 */
export function advancePipelineStatus(
  current: ClientPipelineStatus | null | undefined,
  target: ClientPipelineStatus,
): ClientPipelineStatus {
  const from = current ?? "NUEVO";
  if (from === "CERRADO" || from === "PERDIDO") return from;
  if (target === "PERDIDO" || target === "NO_CONTESTA" || target === "CERRADO") {
    return target;
  }
  const fromRank = PIPELINE_FUNNEL_RANK[from];
  const targetRank = PIPELINE_FUNNEL_RANK[target];
  if (targetRank < 0) return from;
  return targetRank > fromRank ? target : from;
}

const DEFAULT_CHECKLIST_DEFINITIONS: Array<
  Pick<ClientChecklistItem, "id" | "label" | "category">
> = [
  {
    id: "certificado-remuneraciones",
    label: "Certificado de Remuneraciones Imponibles de los últimos 12 meses",
    category: "documentos",
  },
  {
    id: "liquidaciones-ultimas",
    label: "3 últimas liquidaciones",
    category: "documentos",
  },
];

export function buildDefaultClientChecklist(): ClientChecklist {
  return {
    items: DEFAULT_CHECKLIST_DEFINITIONS.map((item) => ({
      ...item,
      checked: false,
      checkedAt: null,
    })),
    updatedAt: new Date().toISOString(),
  };
}

function isChecklistItem(value: unknown): value is ClientChecklistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.checked === "boolean"
  );
}

export function resolveClientChecklist(raw: unknown): ClientChecklist {
  const defaults = buildDefaultClientChecklist();

  if (!raw || typeof raw !== "object" || !("items" in raw)) {
    return defaults;
  }

  const stored = raw as { items?: unknown[]; updatedAt?: string };
  if (!Array.isArray(stored.items)) return defaults;

  const storedById = new Map(
    stored.items.filter(isChecklistItem).map((item) => [item.id, item]),
  );

  const items = defaults.items.map((defaultItem) => {
    const saved = storedById.get(defaultItem.id);
    if (!saved) return defaultItem;
    return {
      ...defaultItem,
      checked: saved.checked,
      checkedAt: saved.checkedAt ?? null,
    };
  });

  return {
    items,
    updatedAt:
      typeof stored.updatedAt === "string"
        ? stored.updatedAt
        : new Date().toISOString(),
  };
}

export function parseClientClosedRecord(raw: unknown): ClientClosedRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.isapre !== "string" || typeof record.closedAt !== "string") {
    return null;
  }

  return {
    isapre: record.isapre,
    planCode: typeof record.planCode === "string" ? record.planCode : null,
    planName: typeof record.planName === "string" ? record.planName : null,
    closedAt: record.closedAt,
    finalPriceUf:
      typeof record.finalPriceUf === "string" ? record.finalPriceUf : null,
    finalPriceClp:
      typeof record.finalPriceClp === "string" ? record.finalPriceClp : null,
    isapreReference:
      typeof record.isapreReference === "string"
        ? record.isapreReference
        : null,
    notes: typeof record.notes === "string" ? record.notes : null,
  };
}

export function buildEmptyClosedRecord(): ClientClosedRecord {
  return {
    isapre: "",
    planCode: "",
    planName: "",
    closedAt: new Date().toISOString().slice(0, 10),
    finalPriceUf: "",
    finalPriceClp: "",
    isapreReference: "",
    notes: "",
  };
}

export function buildClientWhatsAppMessage(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] || "estimado/a";
  return `Hola ${firstName}, te contacto desde Cotizador Premium respecto a tu solicitud de plan de salud. ¿Tienes un momento para conversar?`;
}
