import type { ClientExecutiveProfile, ClientProfileInput } from "@/types/client-profile";
import type {
  ClientChecklist,
  ClientClosedRecord,
  ClientPipelineStatus,
} from "@/types/client-pipeline";
import type { ClientPlanSnapshot } from "@/types/client-plan";
import type { CotizadorSourceInfo } from "@/lib/partner-entity/source-label";

export type UserRole = "CLIENT" | "EXECUTIVE" | "ADMIN";
export type ClientOrigin =
  | "COTIZADOR"
  | "MANUAL"
  | "CAMPANA_LEAD_WHATSAPP"
  | "FORMULARIO_WEB"
  | "CAMPANA_ISAPRES_PREMIUM"
  | "CAMPANA_CONSALUD"
  | "CAMPANA_BANMEDICA"
  | "CAMPANA_COLMENA"
  | "CAMPANA_CRUZ_BLANCA"
  | "CAMPANA_VIDA_TRES"
  | "CAMPANA_NUEVA_MASVIDA"
  | "CAMPANA_ESENCIAL";

export const CLIENT_ORIGIN_OPTIONS: Array<{
  value: ClientOrigin;
  label: string;
}> = [
  { value: "MANUAL", label: "Registro propio" },
  { value: "CAMPANA_LEAD_WHATSAPP", label: "Campaña lead WhatsApp" },
  { value: "CAMPANA_ISAPRES_PREMIUM", label: "Campaña Isapres Premium" },
  { value: "CAMPANA_CONSALUD", label: "Campaña Consalud" },
  { value: "CAMPANA_BANMEDICA", label: "Campaña Banmédica" },
  { value: "CAMPANA_COLMENA", label: "Campaña Colmena" },
  { value: "CAMPANA_CRUZ_BLANCA", label: "Campaña Cruz Blanca" },
  { value: "CAMPANA_VIDA_TRES", label: "Campaña Vida Tres" },
  { value: "CAMPANA_NUEVA_MASVIDA", label: "Campaña Nueva Masvida" },
  { value: "CAMPANA_ESENCIAL", label: "Campaña Esencial" },
  { value: "COTIZADOR", label: "Lead cotizador" },
  { value: "FORMULARIO_WEB", label: "Formulario web" },
];

/** Orígenes seleccionables al registrar un cliente desde el panel. */
export const MANUAL_CLIENT_ORIGIN_OPTIONS: Array<{
  value: Exclude<ClientOrigin, "COTIZADOR" | "FORMULARIO_WEB">;
  label: string;
}> = [
  { value: "MANUAL", label: "Registro propio" },
  { value: "CAMPANA_LEAD_WHATSAPP", label: "Campaña lead WhatsApp" },
  { value: "CAMPANA_ISAPRES_PREMIUM", label: "Campaña Isapres Premium" },
  { value: "CAMPANA_CONSALUD", label: "Campaña Consalud" },
  { value: "CAMPANA_BANMEDICA", label: "Campaña Banmédica" },
  { value: "CAMPANA_COLMENA", label: "Campaña Colmena" },
  { value: "CAMPANA_CRUZ_BLANCA", label: "Campaña Cruz Blanca" },
  { value: "CAMPANA_VIDA_TRES", label: "Campaña Vida Tres" },
  { value: "CAMPANA_NUEVA_MASVIDA", label: "Campaña Nueva Masvida" },
  { value: "CAMPANA_ESENCIAL", label: "Campaña Esencial" },
];

export function isClientOrigin(value: string): value is ClientOrigin {
  return CLIENT_ORIGIN_OPTIONS.some((option) => option.value === value);
}

export function isManualSelectableClientOrigin(
  value: string,
): value is Exclude<ClientOrigin, "COTIZADOR" | "FORMULARIO_WEB"> {
  return MANUAL_CLIENT_ORIGIN_OPTIONS.some((option) => option.value === value);
}

export interface CreateManualClientInput extends ClientProfileInput {
  pipelineNotes?: string | null;
  /**
   * Solo admin: destino de cartera.
   * Si se omite, el cliente se asigna a quien registra.
   * `null` deja el cliente sin asignar (p. ej. para distribución).
   * En ejecutivos se ignora y siempre se asigna al actor.
   */
  assignedExecutiveId?: string | null;
  /** Origen del alta manual. Por defecto MANUAL. */
  clientOrigin?: Exclude<ClientOrigin, "COTIZADOR" | "FORMULARIO_WEB">;
}

export interface UserRecord {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  rut: string | null;
  role: UserRole;
  active: boolean;
  assignedExecutiveId?: string | null;
  assignedExecutiveName?: string | null;
  /** Kind del ejecutivo asignado (Zoom / Isapres / Premium). */
  assignedExecutiveKind?: import("@/types/staff-account").ExecutiveKind | null;
  /** Staff que registró el cliente (alta manual). */
  registeredById?: string | null;
  registeredByName?: string | null;
  /** Ejecutivo que sigue el cliente tras un handoff (hasta RECEPCIONADO/PERDIDO). */
  trackingExecutiveId?: string | null;
  trackingExecutiveName?: string | null;
  pipelineStatus?: ClientPipelineStatus;
  checklist?: ClientChecklist;
  closedRecord?: ClientClosedRecord | null;
  pipelineNotes?: string | null;
  /** Próximo llamado agendado (ISO). */
  nextCallAt?: string | null;
  /** Llamado de confirmación Zoom previo a la reunión Premium (ISO). */
  confirmationCallAt?: string | null;
  /** Recordatorio / gestión libre en calendario (ISO). */
  reminderAt?: string | null;
  /** Nota de la gestión del recordatorio. */
  reminderNote?: string | null;
  lastCallOutcome?: string | null;
  /** Canal preferido de contacto (p. ej. tras redirección Zoom → Premium). */
  preferredContactMethod?: import("@/types/client-pipeline").ClientContactMethod | null;
  /** Equipo Calendly asignado. */
  calendlyTeam?: "EQUIPO_1" | "EQUIPO_2" | "EQUIPO_3" | null;
  /** Link Zoom de la última reunión Calendly. */
  zoomJoinUrl?: string | null;
  clientProfile?: ClientExecutiveProfile;
  requestedPlan?: ClientPlanSnapshot | null;
  /** Plan elegido (propuesta final). Subconjunto de assignedPlans. */
  advisedPlan?: ClientPlanSnapshot | null;
  /** Planes propuestos/asignados al cliente (puede haber varios). */
  assignedPlans?: ClientPlanSnapshot[];
  clientOrigin?: ClientOrigin;
  /** Etiqueta del formulario web (p. ej. "Formulario web - Desde Tu 7%"). */
  webFormSource?: string | null;
  cotizadorSource?: CotizadorSourceInfo | null;
  createdAt: string;
  updatedAt: string;
}
