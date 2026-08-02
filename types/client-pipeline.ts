export type ClientPipelineStatus =
  | "NUEVO"
  | "CONTACTADO"
  | "NO_CONTESTA"
  | "EN_SEGUIMIENTO"
  | "PROPUESTA_ENVIADA"
  | "DOCUMENTACION"
  | "ENVIADO_ISAPRE"
  | "CERRADO"
  | "PERDIDO";

export interface ClientChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  checkedAt: string | null;
  category: "titular" | "cargas" | "isapre" | "general" | "documentos";
}

export interface ClientChecklist {
  items: ClientChecklistItem[];
  updatedAt: string;
}

export interface ClientClosedRecord {
  isapre: string;
  planCode?: string | null;
  planName?: string | null;
  closedAt: string;
  finalPriceUf?: string | null;
  finalPriceClp?: string | null;
  isapreReference?: string | null;
  notes?: string | null;
}

export interface UpdateClientPipelineInput {
  pipelineStatus?: ClientPipelineStatus;
  checklist?: ClientChecklist;
  closedRecord?: ClientClosedRecord | null;
  pipelineNotes?: string | null;
  clientProfile?: import("@/types/client-profile").ClientProfileInput;
  /** ISO datetime o null para limpiar. */
  nextCallAt?: string | null;
  lastCallOutcome?: string | null;
  /** Canal preferido de la reunión/llamado (calendario). */
  preferredContactMethod?: ClientContactMethod | null;
}

export interface RedirectClientToPremiumInput {
  /** Ejecutivo Isapres Premium destino. Si se omite y autoAssign=true, round-robin. */
  executiveAccountId?: string | null;
  /** Round-robin solo entre Premium elegibles. */
  autoAssign?: boolean;
  /** Canal preferido de contacto para el Premium. */
  contactMethod: ClientContactMethod;
  /** Fecha/hora solicitada de atención (ISO). Queda en `nextCallAt` del Premium. */
  appointmentAt: string;
}

/**
 * Premium → Zoom (sin contacto) o Premium → Isapres (cierre/contratación).
 * Destino: `executiveAccountId` o round-robin si `autoAssign`.
 */
export interface RedirectClientFromPremiumInput {
  executiveAccountId?: string | null;
  autoAssign?: boolean;
}

/** Destinos de reasignación desde Isapres Premium. */
export type PremiumRedirectTargetKind = "ZOOM" | "ISAPRES";

export type ClientContactMethod = "ZOOM" | "WHATSAPP";

export const CLIENT_CONTACT_METHOD_OPTIONS: Array<{
  value: ClientContactMethod;
  label: string;
  description: string;
}> = [
  {
    value: "ZOOM",
    label: "Zoom",
    description: "El ejecutivo Premium debe contactar por videollamada Zoom.",
  },
  {
    value: "WHATSAPP",
    label: "WhatsApp",
    description: "El ejecutivo Premium debe contactar por WhatsApp.",
  },
];

export const CLIENT_CONTACT_METHOD_LABELS: Record<ClientContactMethod, string> = {
  ZOOM: "Zoom",
  WHATSAPP: "WhatsApp",
};

export function isClientContactMethod(
  value: string,
): value is ClientContactMethod {
  return value === "ZOOM" || value === "WHATSAPP";
}

/** Motivos al marcar un cliente como perdido (Zoom / Premium). */
export type ClientLostReasonCode =
  | "SIN_CONTACTO"
  | "PRECIO"
  | "QUEDA_ISAPRE_ACTUAL"
  | "COMPETENCIA"
  | "NO_INTERESADO"
  | "NO_CUMPLE_REQUISITOS"
  | "LEAD_INVALIDO"
  | "OTROS";

export const CLIENT_LOST_REASON_OPTIONS: Array<{
  value: ClientLostReasonCode;
  label: string;
}> = [
  { value: "SIN_CONTACTO", label: "Sin contacto / no responde" },
  { value: "PRECIO", label: "Precio o cotización elevada" },
  { value: "QUEDA_ISAPRE_ACTUAL", label: "Prefiere quedarse en su Isapre actual" },
  { value: "COMPETENCIA", label: "Contrató con otra corredora o competencia" },
  { value: "NO_INTERESADO", label: "Cliente no interesado" },
  { value: "NO_CUMPLE_REQUISITOS", label: "No cumple requisitos / preexistencias" },
  { value: "LEAD_INVALIDO", label: "Datos incorrectos o lead inválido" },
  { value: "OTROS", label: "Otros" },
];

export function resolveClientLostReasonLabel(
  code: ClientLostReasonCode | "",
  otherText: string,
): string | null {
  if (!code) return null;
  if (code === "OTROS") {
    const trimmed = otherText.trim();
    return trimmed ? `Otros: ${trimmed}` : null;
  }
  return (
    CLIENT_LOST_REASON_OPTIONS.find((option) => option.value === code)?.label ??
    null
  );
}
