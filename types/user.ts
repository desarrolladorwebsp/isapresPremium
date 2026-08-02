import type { ClientExecutiveProfile, ClientProfileInput } from "@/types/client-profile";
import type {
  ClientChecklist,
  ClientClosedRecord,
  ClientPipelineStatus,
} from "@/types/client-pipeline";
import type { ClientPlanSnapshot } from "@/types/client-plan";
import type { CotizadorSourceInfo } from "@/lib/partner-entity/source-label";

export type UserRole = "CLIENT" | "EXECUTIVE" | "ADMIN";
export type ClientOrigin = "COTIZADOR" | "MANUAL" | "CAMPANA_LEAD_WHATSAPP";

/** Orígenes seleccionables al registrar un cliente desde el panel. */
export const MANUAL_CLIENT_ORIGIN_OPTIONS: Array<{
  value: Exclude<ClientOrigin, "COTIZADOR">;
  label: string;
}> = [
  { value: "MANUAL", label: "Registro propio" },
  { value: "CAMPANA_LEAD_WHATSAPP", label: "Campaña lead WhatsApp" },
];

export function isManualSelectableClientOrigin(
  value: string,
): value is Exclude<ClientOrigin, "COTIZADOR"> {
  return MANUAL_CLIENT_ORIGIN_OPTIONS.some((option) => option.value === value);
}

export interface CreateManualClientInput extends ClientProfileInput {
  pipelineNotes?: string | null;
  assignedExecutiveId?: string | null;
  /** Origen del alta manual. Por defecto MANUAL. */
  clientOrigin?: Exclude<ClientOrigin, "COTIZADOR">;
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
  pipelineStatus?: ClientPipelineStatus;
  checklist?: ClientChecklist;
  closedRecord?: ClientClosedRecord | null;
  pipelineNotes?: string | null;
  /** Próximo llamado agendado (ISO). */
  nextCallAt?: string | null;
  lastCallOutcome?: string | null;
  /** Canal preferido de contacto (p. ej. tras redirección Zoom → Premium). */
  preferredContactMethod?: import("@/types/client-pipeline").ClientContactMethod | null;
  /** Equipo Calendly asignado. */
  calendlyTeam?: "EQUIPO_1" | "EQUIPO_2" | "EQUIPO_3" | null;
  /** Link Zoom de la última reunión Calendly. */
  zoomJoinUrl?: string | null;
  clientProfile?: ClientExecutiveProfile;
  requestedPlan?: ClientPlanSnapshot | null;
  advisedPlan?: ClientPlanSnapshot | null;
  clientOrigin?: ClientOrigin;
  cotizadorSource?: CotizadorSourceInfo | null;
  createdAt: string;
  updatedAt: string;
}
