"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { ClientAdvisedPlanSection } from "@/components/executive/client-advised-plan-section";
import { ClientDocumentsSection } from "@/components/executive/client-documents-section";
import { ClientPlanSummary } from "@/components/executive/client-plan-summary";
import { CalendlyInlineEmbed } from "@/components/executive/calendly-inline-embed";
import { RescheduleDayAgenda } from "@/components/executive/reschedule-day-agenda";
import {
  ClientPipelineRoleCard,
  type PipelineRoleId,
} from "@/components/executive/client-pipeline-role-card";
import { ClientProtocoloFlowView } from "@/components/executive/client-protocolo-flow-view";
import { ClientSeguimientoFlowView } from "@/components/executive/client-seguimiento-flow-view";
import {
  ClientProfileForm,
  userRecordToProfileFormValue,
  type ClientProfileFormValue,
} from "@/components/executive/client-profile-form";
import { CollapsibleSection } from "@/components/executive/collapsible-section";
import { useStaffSession } from "@/hooks/use-auth-session";
import {
  canUseZoomExecutiveWorkflow,
  formatExecutiveOptionLabel,
} from "@/lib/auth/staff-role";
import {
  fetchCalendlySchedulingLink,
  fetchEligibleExecutives,
  markClientConfirmationCall,
  redirectClientToIsapres,
  redirectClientToPremium,
  redirectClientToZoom,
  updateClientPipeline,
} from "@/lib/api/admin-client";
import { CALENDLY_TEAM_IDS, CALENDLY_TEAM_LABELS, type CalendlyTeamId, isCalendlyTeamId } from "@/lib/calendly/labels";
import {
  advancePipelineStatus,
  buildEmptyClosedRecord,
  buildDefaultClientChecklist,
  CLIENT_PIPELINE_STATUS_DESCRIPTIONS,
  CLIENT_PIPELINE_STATUS_LABELS,
} from "@/lib/client-pipeline/constants";
import {
  appendPipelineNoteLine,
  canAccessInternalPipelineNotes,
  clientNoteDisplayText,
  extractPipelineNoteStamp,
  formatClientNoteLineBody,
  listClientNoteLines,
  listPipelineModificationLines,
} from "@/lib/client-pipeline/note-stamp";
import {
  CONFIRMATION_CALL_LEAD_MINUTES,
  canEditClientDataAsExecutive,
  isTrackingOnlyForExecutive,
} from "@/lib/client-pipeline/tracking";
import {
  agendaUrgencyFromIso,
  type AgendaUrgency,
} from "@/lib/client-pipeline/agenda-urgency";
import { motivoCotizacionIncludesOtros } from "@/lib/client-profile/constants";
import { getClientManagementRutErrors } from "@/lib/client-profile/validate-client-ruts";
import {
  CURRENT_COVERAGE_OPTIONS,
  ISAPRE_FILTER_OPTIONS,
} from "@/lib/filter-options";
import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  ClientChecklist,
  ClientClosedRecord,
  ClientContactMethod,
  ClientLostReasonCode,
  ClientPipelineStatus,
} from "@/types/client-pipeline";
import {
  CLIENT_CONTACT_METHOD_LABELS,
  CLIENT_CONTACT_METHOD_OPTIONS,
  CLIENT_LOST_REASON_OPTIONS,
  resolveClientLostReasonLabel,
} from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";

type PendingConfirm =
  | { kind: "save" }
  | { kind: "no_contesta" }
  | { kind: "contactado" }
  | { kind: "perdido"; reasonLabel: string }
  | { kind: "close" }
  | { kind: "confirm_zoom_meeting" }
  | {
      kind: "redirect";
      targetLabel: string;
      contactMethodLabel: string;
      appointmentLabel: string;
    }
  | { kind: "send_zoom"; targetLabel: string }
  | { kind: "send_isapres"; targetLabel: string };

export type ClientFichaModal =
  | null
  | "employer"
  | "family"
  | "addTitular"
  | "addCarga"
  | "personal"
  | "prevision"
  | "complementaria"
  | "plan"
  | "docs"
  | "historial"
  | "notas";

/** Deep-link desde calendario / URL (`flow` + `gestion`). */
export type ClientPipelineLaunchRequest = {
  flow: PipelineRoleId;
  gestion?: "reschedule" | "reminder" | "confirm_zoom" | "redirect" | null;
};

export interface ClientPipelineDrawerProps {
  client: UserRecord | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (client: UserRecord) => void;
  /** Tras redirigir / reasignar: el ejecutivo pierde el cliente de su cartera. */
  onRedirected?: (client: UserRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
  /**
   * `modal`: diálogo (legacy).
   * `page`: ficha completa embebida en el panel (sin overlay).
   */
  variant?: "modal" | "page";
  /**
   * `full`: perfil + plan + documentos + gestión (legacy / modal).
   * `operations`: franja operativa (notas, acciones de pipeline, guardar).
   */
  layout?: "full" | "operations";
  /**
   * Si es `false`, tras guardar se permanece en la ficha.
   * Por defecto: `true` en modal, `false` en page.
   */
  closeAfterSave?: boolean;
  /** Cápsulas de la ficha: abre modal sobre el estado del drawer. */
  fichaModal?: ClientFichaModal;
  onFichaModalChange?: (modal: ClientFichaModal) => void;
  pendingFamilyAdd?: "titular" | "carga" | null;
  onPendingFamilyAddConsumed?: () => void;
  /** Notifica cuando se abre/cierra la vista de flujo (cards de rol). */
  onActiveFlowChange?: (flow: PipelineRoleId | null) => void;
  /** Notifica si hay cambios de ficha sin guardar. */
  onUnsavedChangesChange?: (dirty: boolean) => void;
  /** Abre flujo/acción una vez (p. ej. desde el calendario). */
  launchRequest?: ClientPipelineLaunchRequest | null;
  onLaunchConsumed?: () => void;
}

function getManagementDescription(input: {
  isZoom: boolean;
  isIsapres: boolean;
  isPremium: boolean;
}): string | undefined {
  if (input.isZoom) {
    return "Gestión ejecutivo Zoom: contacto, reagendar, redirigir a Premium y datos del cliente.";
  }
  if (input.isIsapres) {
    return "Gestión ejecutivo Isapres: revisa los datos del cliente y cierra el contrato cuando corresponda.";
  }
  if (input.isPremium) return undefined;
  return "Datos del titular, cargas, documentos solicitados y seguimiento comercial.";
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatNextCallAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type AgendaOutcomeValue =
  | "completed"
  | "redirect"
  | "reschedule"
  | "lost"
  | "other";

const AGENDA_MEETING_OUTCOME_OPTIONS: Array<{
  value: AgendaOutcomeValue;
  label: string;
}> = [
  { value: "completed", label: "Reunión realizada (contacté al cliente)" },
  { value: "redirect", label: "Se redirige" },
  { value: "reschedule", label: "No terminó · se reagenda" },
  { value: "lost", label: "Marcar perdido" },
  { value: "other", label: "Otros (registrar en notas)" },
];

const AGENDA_CONFIRMATION_OUTCOME_OPTIONS: Array<{
  value: AgendaOutcomeValue;
  label: string;
}> = [
  { value: "completed", label: "Confirmación realizada" },
  { value: "reschedule", label: "Reagendar" },
  { value: "other", label: "Otros (registrar en notas)" },
];

const AGENDA_FOLLOWUP_OUTCOME_OPTIONS: Array<{
  value: AgendaOutcomeValue;
  label: string;
}> = [
  { value: "completed", label: "Contacté al cliente" },
  { value: "reschedule", label: "Agendar / reagendar" },
  { value: "lost", label: "Marcar perdido" },
  { value: "other", label: "Otros (registrar en notas)" },
];

const AGENDA_REMINDER_OUTCOME_OPTIONS: Array<{
  value: AgendaOutcomeValue;
  label: string;
}> = [
  { value: "completed", label: "Gestión realizada" },
  { value: "other", label: "Otros (registrar en notas)" },
];

/** Cómo se llegó a la persona al marcar la gestión como realizada. */
const AGENDA_REACH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "llego", label: "Llegué a la persona" },
  { value: "acepto", label: "Cliente aceptó / quedó interesado" },
  { value: "reagendo", label: "Reagendó (quedó de volver a hablar)" },
  { value: "pidio_info", label: "Pidió o recibió información" },
  { value: "otro", label: "Otro (detalle obligatorio abajo)" },
];

function agendaReachLabel(code: string): string | null {
  return AGENDA_REACH_OPTIONS.find((option) => option.value === code)?.label ?? null;
}

function agendaUrgencyClasses(urgency: AgendaUrgency): string {
  switch (urgency) {
    case "overdue":
      return "border-danger/40 bg-danger-muted/70";
    case "due_today":
      return "border-amber-300 bg-amber-50/80";
    case "done":
      return "border-emerald-300/70 bg-emerald-50/80";
    default:
      return "border-primary-dark/15 bg-primary-dark/[0.03]";
  }
}

function agendaUrgencyBadge(urgency: AgendaUrgency): {
  label: string;
  className: string;
} | null {
  switch (urgency) {
    case "overdue":
      return {
        label: "Vencida",
        className: "bg-danger-muted text-danger ring-1 ring-danger/25",
      };
    case "due_today":
      return {
        label: "Hoy",
        className: "bg-amber-100 text-amber-900 ring-1 ring-amber-300/60",
      };
    case "done":
      return {
        label: "Hecha",
        className: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/60",
      };
    default:
      return {
        label: "Pendiente",
        className:
          "bg-primary-dark/8 text-primary-dark ring-1 ring-primary-dark/20",
      };
  }
}

type ClientAgendaItem = {
  id: string;
  kind: "meeting" | "confirmation" | "followup" | "reminder";
  title: string;
  channelLabel: string | null;
  whenIso: string | null;
  whenLabel: string | null;
  urgency: AgendaUrgency;
  detail: string | null;
  zoomJoinUrl: string | null;
  required: boolean;
  /** Quién debe ejecutar esta gestión. */
  responsibleName: string | null;
  /** Rol del responsable (asignado, seguimiento Zoom, etc.). */
  responsibleRole: string | null;
  outcomeOptions: Array<{ value: AgendaOutcomeValue; label: string }>;
};

function resolveAgendaResponsible(
  client: UserRecord,
  responsibility: "assigned" | "tracking" | "confirmation",
): { name: string; role: string } | null {
  if (responsibility === "confirmation" || responsibility === "tracking") {
    if (client.trackingExecutiveName?.trim()) {
      return {
        name: client.trackingExecutiveName.trim(),
        role:
          responsibility === "confirmation"
            ? "Confirmación Zoom"
            : "Seguimiento Zoom",
      };
    }
  }
  if (client.assignedExecutiveName?.trim()) {
    return {
      name: client.assignedExecutiveName.trim(),
      role: "Ejecutivo asignado",
    };
  }
  if (client.trackingExecutiveName?.trim()) {
    return {
      name: client.trackingExecutiveName.trim(),
      role: "Seguimiento",
    };
  }
  return null;
}

function withResponsible(
  item: Omit<ClientAgendaItem, "responsibleName" | "responsibleRole">,
  responsible: { name: string; role: string } | null,
): ClientAgendaItem {
  return {
    ...item,
    responsibleName: responsible?.name ?? null,
    responsibleRole: responsible?.role ?? null,
  };
}

function buildClientAgendaItems(input: {
  client: UserRecord;
  isTrackingOnly: boolean;
}): ClientAgendaItem[] {
  const { client, isTrackingOnly } = input;
  const items: ClientAgendaItem[] = [];
  const status = client.pipelineStatus ?? "NUEVO";
  const contactMethod = client.preferredContactMethod ?? null;
  const nextCallLabel = formatNextCallAt(client.nextCallAt);
  const confirmationLabel = formatNextCallAt(client.confirmationCallAt);
  const reminderLabel = formatNextCallAt(client.reminderAt);
  const assigned = resolveAgendaResponsible(client, "assigned");
  const tracking = resolveAgendaResponsible(client, "tracking");
  const confirmationOwner = resolveAgendaResponsible(client, "confirmation");

  if (reminderLabel) {
    const reminderDetail = client.reminderNote?.trim() || null;
    items.push(
      withResponsible(
        {
          id: "reminder",
          kind: "reminder",
          title: "Recordatorio",
          channelLabel: "Recordatorio",
          whenIso: client.reminderAt ?? null,
          whenLabel: reminderLabel,
          urgency: agendaUrgencyFromIso(client.reminderAt),
          detail: reminderDetail,
          zoomJoinUrl: null,
          required: false,
          outcomeOptions: AGENDA_REMINDER_OUTCOME_OPTIONS,
        },
        assigned,
      ),
    );
  }

  if (confirmationLabel) {
    items.push(
      withResponsible(
        {
          id: "confirmation-zoom",
          kind: "confirmation",
          title: "Confirmación Zoom",
          channelLabel: "Zoom",
          whenIso: client.confirmationCallAt ?? null,
          whenLabel: confirmationLabel,
          urgency: agendaUrgencyFromIso(client.confirmationCallAt),
          detail: `Acción obligatoria: llamar ~${CONFIRMATION_CALL_LEAD_MINUTES} min antes de la reunión Premium.`,
          zoomJoinUrl: null,
          required: true,
          outcomeOptions: AGENDA_CONFIRMATION_OUTCOME_OPTIONS,
        },
        confirmationOwner,
      ),
    );
  }

  if (nextCallLabel) {
    if (contactMethod === "ZOOM") {
      items.push(
        withResponsible(
          {
            id: "meeting-zoom",
            kind: "meeting",
            title: "Reunión Zoom",
            channelLabel: "Zoom",
            whenIso: client.nextCallAt ?? null,
            whenLabel: nextCallLabel,
            urgency: agendaUrgencyFromIso(client.nextCallAt),
            detail: client.calendlyTeam
              ? `Equipo Calendly: ${CALENDLY_TEAM_LABELS[client.calendlyTeam]}`
              : "Videollamada agendada con el cliente.",
            zoomJoinUrl: client.zoomJoinUrl ?? null,
            required: true,
            outcomeOptions: AGENDA_MEETING_OUTCOME_OPTIONS,
          },
          assigned,
        ),
      );
    } else if (contactMethod === "WHATSAPP") {
      items.push(
        withResponsible(
          {
            id: "meeting-whatsapp",
            kind: "meeting",
            title: "Contacto WhatsApp",
            channelLabel: "WhatsApp",
            whenIso: client.nextCallAt ?? null,
            whenLabel: nextCallLabel,
            urgency: agendaUrgencyFromIso(client.nextCallAt),
            detail: "Llamado o mensaje pendiente por WhatsApp.",
            zoomJoinUrl: null,
            required: true,
            outcomeOptions: AGENDA_MEETING_OUTCOME_OPTIONS,
          },
          assigned,
        ),
      );
    } else {
      items.push(
        withResponsible(
          {
            id: "next-call",
            kind: "meeting",
            title: "Próximo llamado",
            channelLabel: null,
            whenIso: client.nextCallAt ?? null,
            whenLabel: nextCallLabel,
            urgency: agendaUrgencyFromIso(client.nextCallAt),
            detail: "Gestión agendada sin canal definido.",
            zoomJoinUrl: client.zoomJoinUrl ?? null,
            required: true,
            outcomeOptions: AGENDA_MEETING_OUTCOME_OPTIONS,
          },
          assigned,
        ),
      );
    }
  } else if (client.zoomJoinUrl) {
    items.push(
      withResponsible(
        {
          id: "zoom-link",
          kind: "meeting",
          title: "Link Zoom disponible",
          channelLabel: "Zoom",
          whenIso: null,
          whenLabel: null,
          urgency: "due_today",
          detail: "Hay un enlace de reunión Zoom asociado a este cliente.",
          zoomJoinUrl: client.zoomJoinUrl,
          required: true,
          outcomeOptions: AGENDA_MEETING_OUTCOME_OPTIONS,
        },
        assigned,
      ),
    );
  }

  if (isTrackingOnly) {
    items.push(
      withResponsible(
        {
          id: "tracking",
          kind: "followup",
          title: "Seguimiento post-derivación",
          channelLabel: null,
          whenIso: null,
          whenLabel: null,
          urgency: "upcoming",
          detail: client.assignedExecutiveName
            ? `Cliente a cargo de ${client.assignedExecutiveName}. Mantén el seguimiento hasta el cierre.`
            : "Cliente derivado: mantén el seguimiento hasta el cierre.",
          zoomJoinUrl: null,
          required: false,
          outcomeOptions: AGENDA_FOLLOWUP_OUTCOME_OPTIONS,
        },
        tracking,
      ),
    );
  }

  if (status === "NUEVO" && !nextCallLabel && !confirmationLabel) {
    items.push(
      withResponsible(
        {
          id: "first-contact",
          kind: "followup",
          title: "Primer contacto pendiente",
          channelLabel: null,
          whenIso: null,
          whenLabel: null,
          urgency: "due_today",
          detail: CLIENT_PIPELINE_STATUS_DESCRIPTIONS.NUEVO,
          zoomJoinUrl: null,
          required: true,
          outcomeOptions: AGENDA_FOLLOWUP_OUTCOME_OPTIONS,
        },
        assigned,
      ),
    );
  }

  if (status === "NO_CONTESTA" && !nextCallLabel) {
    items.push(
      withResponsible(
        {
          id: "retry-contact",
          kind: "followup",
          title: "Reintentar contacto",
          channelLabel: null,
          whenIso: null,
          whenLabel: null,
          urgency: "overdue",
          detail:
            "Quedó en No contesta. Agenda un nuevo llamado o vuelve a contactar.",
          zoomJoinUrl: null,
          required: true,
          outcomeOptions: AGENDA_FOLLOWUP_OUTCOME_OPTIONS,
        },
        assigned,
      ),
    );
  }

  if (status === "ENVIADO_ISAPRE") {
    const pendingDocs =
      client.checklist?.items.filter((item) => !item.checked).length ?? 0;
    items.push(
      withResponsible(
        {
          id: "docs-pending",
          kind: "followup",
          title: "Documentación pendiente",
          channelLabel: null,
          whenIso: null,
          whenLabel: null,
          urgency: pendingDocs > 0 ? "due_today" : "upcoming",
          detail:
            pendingDocs > 0
              ? `${pendingDocs} documento${pendingDocs === 1 ? "" : "s"} sin marcar como recibido.`
              : CLIENT_PIPELINE_STATUS_DESCRIPTIONS.ENVIADO_ISAPRE,
          zoomJoinUrl: null,
          required: pendingDocs > 0,
          outcomeOptions: AGENDA_FOLLOWUP_OUTCOME_OPTIONS,
        },
        assigned,
      ),
    );
  }

  if (
    status === "EN_SEGUIMIENTO" &&
    !nextCallLabel &&
    !confirmationLabel &&
    items.length === 0
  ) {
    items.push(
      withResponsible(
        {
          id: "status-followup",
          kind: "followup",
          title: CLIENT_PIPELINE_STATUS_LABELS[status],
          channelLabel: null,
          whenIso: null,
          whenLabel: null,
          urgency: "upcoming",
          detail: CLIENT_PIPELINE_STATUS_DESCRIPTIONS[status],
          zoomJoinUrl: null,
          required: false,
          outcomeOptions: AGENDA_FOLLOWUP_OUTCOME_OPTIONS,
        },
        assigned,
      ),
    );
  }

  return items;
}

function formatNextCallFromLocal(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return localValue;
  return formatNextCallAt(date.toISOString());
}

const PROFILE_FIELD_LABELS: Array<{
  key: keyof ClientProfileFormValue;
  label: string;
}> = [
  { key: "email", label: "Correo" },
  { key: "phone", label: "Celular" },
  { key: "rut", label: "RUT" },
  { key: "employerRut", label: "RUT empleador" },
  { key: "contributorType", label: "Calidad de cliente" },
  { key: "firstNames", label: "Nombres" },
  { key: "lastNames", label: "Apellidos" },
  { key: "birthDate", label: "Fecha de nacimiento" },
  { key: "age", label: "Edad" },
  { key: "maritalStatus", label: "Estado civil" },
  { key: "heightCm", label: "Estatura" },
  { key: "weightKg", label: "Peso" },
  { key: "currentIsapre", label: "Isapre / previsión actual" },
  { key: "currentPlanPrice", label: "Precio del plan actual" },
  { key: "currentPlanPriceCurrency", label: "Moneda precio plan" },
  { key: "voluntaryAdditional", label: "Adicional voluntario" },
  { key: "voluntaryAdditionalCurrency", label: "Moneda adicional voluntario" },
  { key: "rentaImponible", label: "Renta imponible" },
  { key: "motivoCotizacion", label: "Motivo de cotización" },
  { key: "motivoCotizacionOther", label: "Detalle del motivo" },
  { key: "address", label: "Dirección" },
  { key: "commune", label: "Comuna" },
  { key: "coverageRegionId", label: "Región" },
  { key: "preferredClinics", label: "Clínicas de preferencia" },
  { key: "anualidadComment", label: "Comentario anualidad" },
  { key: "segurosComplementarios", label: "Seguros complementarios" },
  { key: "preexistenciasMedicas", label: "Preexistencias médicas" },
];

function coverageLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Sin registrar";
  return (
    CURRENT_COVERAGE_OPTIONS.find((option) => option.id === trimmed)?.label ??
    trimmed
  );
}

function moneyLabel(amount: string, currency: string): string {
  const trimmed = amount.trim();
  if (!trimmed) return "Sin monto";
  return `${trimmed} ${currency === "CLP" ? "CLP" : "UF"}`;
}

/** Notas de historial al guardar cápsulas de ficha (previsión, empleador, familia, etc.). */
function buildFichaProfileHistoryNotes(
  client: UserRecord,
  profileForm: ClientProfileFormValue,
): string[] {
  const original = userRecordToProfileFormValue(client);
  const notes: string[] = [];

  if (original.currentIsapre.trim() !== profileForm.currentIsapre.trim()) {
    notes.push(
      `Previsión actual cambiada de "${coverageLabel(original.currentIsapre)}" a "${coverageLabel(profileForm.currentIsapre)}".`,
    );
  }

  const originalPlan = moneyLabel(
    original.currentPlanPrice,
    original.currentPlanPriceCurrency,
  );
  const nextPlan = moneyLabel(
    profileForm.currentPlanPrice,
    profileForm.currentPlanPriceCurrency,
  );
  if (originalPlan !== nextPlan) {
    notes.push(
      `Precio del plan actual cambiado de "${originalPlan}" a "${nextPlan}".`,
    );
  }

  const originalVol = moneyLabel(
    original.voluntaryAdditional,
    original.voluntaryAdditionalCurrency,
  );
  const nextVol = moneyLabel(
    profileForm.voluntaryAdditional,
    profileForm.voluntaryAdditionalCurrency,
  );
  if (originalVol !== nextVol) {
    notes.push(
      `Adicional voluntario cambiado de "${originalVol}" a "${nextVol}".`,
    );
  }

  if (original.anualidad !== profileForm.anualidad) {
    notes.push(
      profileForm.anualidad
        ? "Anualidad marcada como sí."
        : "Anualidad marcada como no.",
    );
  }
  if (
    !profileForm.anualidad &&
    original.anualidadComment.trim() !== profileForm.anualidadComment.trim()
  ) {
    notes.push(
      `Comentario de anualidad actualizado: “${profileForm.anualidadComment.trim() || "—"}”.`,
    );
  }

  if (original.employerRut.trim() !== profileForm.employerRut.trim()) {
    notes.push(
      `RUT empleador cambiado de "${original.employerRut.trim() || "Sin registrar"}" a "${profileForm.employerRut.trim() || "Sin registrar"}".`,
    );
  }
  if (original.rentaImponible.trim() !== profileForm.rentaImponible.trim()) {
    notes.push(
      `Renta imponible cambiada de "${original.rentaImponible.trim() || "Sin registrar"}" a "${profileForm.rentaImponible.trim() || "Sin registrar"}".`,
    );
  }

  const detailedKeys = new Set([
    "currentIsapre",
    "currentPlanPrice",
    "currentPlanPriceCurrency",
    "voluntaryAdditional",
    "voluntaryAdditionalCurrency",
    "anualidadComment",
    "employerRut",
    "rentaImponible",
  ]);

  const otherChanged = PROFILE_FIELD_LABELS.filter(({ key }) => {
    if (detailedKeys.has(key)) return false;
    return (
      String(profileForm[key] ?? "").trim() !==
      String(original[key] ?? "").trim()
    );
  }).map(({ label }) => label);

  if (
    JSON.stringify(original.dependents) !== JSON.stringify(profileForm.dependents)
  ) {
    otherChanged.push("Cargas / beneficiarios");
  }
  if (
    JSON.stringify(original.additionalTitulares) !==
    JSON.stringify(profileForm.additionalTitulares)
  ) {
    otherChanged.push("Titulares adicionales");
  }

  if (otherChanged.length === 1) {
    notes.push(`Actualizó ${otherChanged[0].toLowerCase()}.`);
  } else if (otherChanged.length > 1) {
    notes.push(
      `Actualizó datos del cliente (${otherChanged.slice(0, 4).join(", ")}${
        otherChanged.length > 4 ? ` y ${otherChanged.length - 4} más` : ""
      }).`,
    );
  }

  return notes;
}

function LostReasonFields({
  lostReason,
  lostReasonOther,
  onReasonChange,
  onOtherChange,
  saveButtonLabel,
}: {
  lostReason: ClientLostReasonCode | "";
  lostReasonOther: string;
  onReasonChange: (value: ClientLostReasonCode) => void;
  onOtherChange: (value: string) => void;
  saveButtonLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-3">
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-foreground">
          Motivo de pérdida *
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLIENT_LOST_REASON_OPTIONS.map((option) => {
            const selected = lostReason === option.value;
            return (
              <label
                key={option.value}
                className={joinClasses(
                  "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                  selected
                    ? "border-danger/40 bg-danger-muted/60 ring-1 ring-danger/25"
                    : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                )}
              >
                <input
                  type="radio"
                  name="lost-reason"
                  className="mt-0.5"
                  checked={selected}
                  onChange={() => onReasonChange(option.value)}
                />
                <span className="text-xs font-medium text-foreground">
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {lostReason === "OTROS" ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Describe el motivo *</span>
          <Input
            value={lostReasonOther}
            onChange={(event) => onOtherChange(event.target.value)}
            placeholder="Ej. Se mudó de región / decidió no cotizar por ahora"
          />
        </label>
      ) : null}

      <p className="text-[11px] text-muted">
        Usa &quot;{saveButtonLabel}&quot; al final para confirmar.
      </p>
    </div>
  );
}

/** Zoom (reunión) vs llamado telefónico/WhatsApp — para textos de confirmación. */
function isZoomScheduleAction(input: {
  activeFlow: PipelineRoleId | null;
  rescheduleSource: "zoom" | "premium" | null;
  rescheduleContactMethod: ClientContactMethod | "";
  preferredContactMethod?: ClientContactMethod | null;
}): boolean {
  if (
    input.activeFlow === "premium" ||
    input.activeFlow === "zoom" ||
    input.activeFlow === "isapres"
  ) {
    return true;
  }
  if (input.rescheduleSource === "zoom") return true;
  if (input.rescheduleSource === "premium") {
    const channel =
      input.rescheduleContactMethod || input.preferredContactMethod || "";
    return channel === "ZOOM";
  }
  return false;
}

function buildSaveChangeSummary(input: {
  client: UserRecord;
  profileForm: ClientProfileFormValue;
  nextCallLocal: string;
  rescheduleNote: string;
  meetingNote: string;
  rescheduleContactMethod: ClientContactMethod | "";
  checklist: ClientChecklist;
  closedRecord: ClientClosedRecord;
  showCloseForm: boolean;
  pipelineStatus: ClientPipelineStatus;
  isZoom: boolean;
  scheduleIsZoom: boolean;
}): string[] {
  const {
    client,
    profileForm,
    nextCallLocal,
    rescheduleNote,
    meetingNote,
    rescheduleContactMethod,
    checklist,
    closedRecord,
    showCloseForm,
    pipelineStatus,
    isZoom,
    scheduleIsZoom,
  } = input;
  const items: string[] = [];

  if (meetingNote.trim()) {
    items.push("Agregar nota de reunión");
  }

  const originalNextCall = toDatetimeLocalValue(client.nextCallAt);
  if (nextCallLocal !== originalNextCall) {
    if (!nextCallLocal.trim()) {
      items.push(
        scheduleIsZoom
          ? "Quitar la fecha de la reunión Zoom"
          : "Quitar la fecha del próximo llamado",
      );
    } else {
      const when =
        formatNextCallFromLocal(nextCallLocal) ?? nextCallLocal;
      items.push(
        originalNextCall
          ? scheduleIsZoom
            ? `Editar reunión Zoom para ${when}`
            : `Reagendar llamado para ${when}`
          : scheduleIsZoom
            ? `Agendar reunión Zoom para ${when}`
            : `Agendar llamado para ${when}`,
      );
    }
  } else if (rescheduleNote.trim() && nextCallLocal.trim()) {
    const when =
      formatNextCallFromLocal(nextCallLocal) ?? nextCallLocal;
    items.push(
      scheduleIsZoom
        ? `Confirmar reunión Zoom para ${when}`
        : `Confirmar llamado para ${when}`,
    );
  }
  if (
    rescheduleContactMethod &&
    rescheduleContactMethod !== (client.preferredContactMethod ?? "")
  ) {
    items.push(
      `Canal de reunión → ${CLIENT_CONTACT_METHOD_LABELS[rescheduleContactMethod]}`,
    );
  }
  if (rescheduleNote.trim()) {
    items.push(
      originalNextCall
        ? scheduleIsZoom
          ? `Nota de edición Zoom: “${rescheduleNote.trim()}”`
          : `Nota de reagendamiento: “${rescheduleNote.trim()}”`
        : scheduleIsZoom
          ? `Nota de agendamiento Zoom: “${rescheduleNote.trim()}”`
          : `Nota de agendamiento: “${rescheduleNote.trim()}”`,
    );
  }

  const originalProfile = userRecordToProfileFormValue(client);
  const changedProfileFields = PROFILE_FIELD_LABELS.filter(({ key }) => {
    return String(profileForm[key] ?? "").trim() !==
      String(originalProfile[key] ?? "").trim();
  }).map(({ label }) => label);

  const originalDeps = JSON.stringify(originalProfile.dependents);
  const nextDeps = JSON.stringify(profileForm.dependents);
  if (originalDeps !== nextDeps) {
    changedProfileFields.push("Cargas / beneficiarios");
  }

  if (changedProfileFields.length === 1) {
    items.push(`Actualizar ${changedProfileFields[0].toLowerCase()}`);
  } else if (changedProfileFields.length > 1) {
    items.push(
      `Actualizar datos del cliente (${changedProfileFields.slice(0, 3).join(", ")}${
        changedProfileFields.length > 3
          ? ` y ${changedProfileFields.length - 3} más`
          : ""
      })`,
    );
  }

  if (!isZoom) {
    const originalChecklist = client.checklist ?? buildDefaultClientChecklist();
    const newlyChecked = checklist.items.filter((item) => {
      const previous = originalChecklist.items.find((row) => row.id === item.id);
      return item.checked && !previous?.checked;
    });
    const newlyUnchecked = checklist.items.filter((item) => {
      const previous = originalChecklist.items.find((row) => row.id === item.id);
      return !item.checked && previous?.checked;
    });
    if (newlyChecked.length > 0) {
      items.push(
        newlyChecked.length === 1
          ? `Marcar documento recibido: ${newlyChecked[0].label}`
          : `Marcar ${newlyChecked.length} documentos como recibidos`,
      );
    }
    if (newlyUnchecked.length > 0) {
      items.push(
        newlyUnchecked.length === 1
          ? `Desmarcar documento: ${newlyUnchecked[0].label}`
          : `Desmarcar ${newlyUnchecked.length} documentos`,
      );
    }

    const closing = showCloseForm || pipelineStatus === "RECEPCIONADO";
    if (closing) {
      const originalClosed = client.closedRecord ?? buildEmptyClosedRecord();
      if (
        client.pipelineStatus !== "RECEPCIONADO" ||
        JSON.stringify(closedRecord) !== JSON.stringify(originalClosed)
      ) {
        const closeBits = [
          closedRecord.isapre.trim() || null,
          closedRecord.planName?.trim() || closedRecord.planCode?.trim() || null,
          closedRecord.closedAt.trim()
            ? `fecha ${closedRecord.closedAt}`
            : null,
        ].filter(Boolean);
        items.push(
          client.pipelineStatus === "RECEPCIONADO"
            ? `Actualizar recepcionado${
                closeBits.length ? ` (${closeBits.join(" · ")})` : ""
              }`
            : `Recepcionado${
                closeBits.length ? ` (${closeBits.join(" · ")})` : ""
              }`,
        );
      }
    }
  }

  return items;
}

function profileSnapshot(value: ClientProfileFormValue): string {
  return JSON.stringify({
    email: value.email.trim(),
    phone: value.phone.trim(),
    rut: value.rut.trim(),
    firstNames: value.firstNames.trim(),
    lastNames: value.lastNames.trim(),
    birthDate: value.birthDate || "",
    age: value.age || "",
    currentIsapre: value.currentIsapre || "",
    currentPlanPrice: value.currentPlanPrice || "",
    currentPlanPriceCurrency: value.currentPlanPriceCurrency || "UF",
    voluntaryAdditional: value.voluntaryAdditional || "",
    voluntaryAdditionalCurrency: value.voluntaryAdditionalCurrency || "UF",
    heightCm: value.heightCm || "",
    weightKg: value.weightKg || "",
    maritalStatus: value.maritalStatus || "",
    employerRut: value.employerRut || "",
    contributorType: value.contributorType || "",
    rentaImponible: value.rentaImponible || "",
    motivoCotizacion: value.motivoCotizacion || "",
    motivoCotizacionOther: value.motivoCotizacionOther || "",
    address: value.address || "",
    commune: value.commune || "",
    coverageArea: value.coverageArea || "",
    coverageRegionId: value.coverageRegionId || "",
    preferredClinics: value.preferredClinics || "",
    anualidad: value.anualidad === true,
    anualidadComment: value.anualidadComment || "",
    segurosComplementarios: value.segurosComplementarios || "",
    preexistenciasMedicas: value.preexistenciasMedicas || "",
    dependents: value.dependents,
    additionalTitulares: value.additionalTitulares,
  });
}

export function ClientPipelineDrawer({
  client,
  open,
  onClose,
  onUpdated,
  onRedirected,
  onNotify,
  variant = "modal",
  layout = "full",
  closeAfterSave,
  fichaModal = null,
  onFichaModalChange,
  pendingFamilyAdd = null,
  onPendingFamilyAddConsumed,
  onActiveFlowChange,
  onUnsavedChangesChange,
  launchRequest = null,
  onLaunchConsumed,
}: ClientPipelineDrawerProps) {
  const shouldCloseAfterSave = closeAfterSave ?? variant === "modal";
  const showFullSections = layout === "full";
  const isOperationsLayout = layout === "operations";
  const { isAdmin, executiveKind, user: sessionUser } = useStaffSession();
  const isZoom = executiveKind === "ZOOM";
  const isPremium = executiveKind === "ISAPRES_PREMIUM";
  const isIsapres = executiveKind === "ISAPRES";
  const isTrackingOnly =
    Boolean(sessionUser?.id) &&
    Boolean(client) &&
    !isAdmin &&
    isTrackingOnlyForExecutive(client!, sessionUser!.id);
  const canEditClientData =
    Boolean(sessionUser?.id) &&
    Boolean(client) &&
    canEditClientDataAsExecutive(
      client!,
      sessionUser!.id,
      isAdmin,
      executiveKind,
    );
  const canManageZoom =
    (canUseZoomExecutiveWorkflow(executiveKind) || isAdmin) && !isTrackingOnly;
  const canManagePremium = (isPremium || isAdmin) && !isTrackingOnly;
  const canManageIsapres = (isIsapres || isAdmin) && !isTrackingOnly;
  const canViewInternalNotes = canAccessInternalPipelineNotes({
    isAdmin,
    executiveKind,
  });
  const actorDisplayName =
    sessionUser?.fullName?.trim() || (isAdmin ? "Administrador" : "Ejecutivo");

  const [pipelineStatus, setPipelineStatus] = useState<ClientPipelineStatus>("NUEVO");
  const [checklist, setChecklist] = useState<ClientChecklist>(buildDefaultClientChecklist());
  const [closedRecord, setClosedRecord] = useState<ClientClosedRecord>(
    buildEmptyClosedRecord(),
  );
  const [pipelineNotes, setPipelineNotes] = useState("");
  const [nextCallLocal, setNextCallLocal] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [confirmZoomNote, setConfirmZoomNote] = useState("");
  const [activeFlow, setActiveFlow] = useState<PipelineRoleId | null>(null);
  const [rescheduleContactMethod, setRescheduleContactMethod] = useState<
    ClientContactMethod | ""
  >("");
  const [profileForm, setProfileForm] = useState<ClientProfileFormValue>(
    userRecordToProfileFormValue(null),
  );
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [premiumExecutives, setPremiumExecutives] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      executiveKind: "ISAPRES_PREMIUM" | "ZOOM" | "ISAPRES" | null;
      realm?: "admin" | "executive";
    }>
  >([]);
  const [zoomExecutives, setZoomExecutives] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      executiveKind: "ISAPRES_PREMIUM" | "ZOOM" | "ISAPRES" | null;
      realm?: "admin" | "executive";
    }>
  >([]);
  const [isapresExecutives, setIsapresExecutives] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      executiveKind: "ISAPRES_PREMIUM" | "ZOOM" | "ISAPRES" | null;
      realm?: "admin" | "executive";
    }>
  >([]);
  const [redirectTargetId, setRedirectTargetId] = useState("");
  const [redirectContactMethod, setRedirectContactMethod] =
    useState<ClientContactMethod | "">("");
  const [redirectAppointmentLocal, setRedirectAppointmentLocal] = useState("");
  const [sendZoomTargetId, setSendZoomTargetId] = useState("");
  const [sendIsapresTargetId, setSendIsapresTargetId] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleSource, setRescheduleSource] = useState<
    "zoom" | "premium" | null
  >(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [showNoAnswer, setShowNoAnswer] = useState(false);
  const [showSendToZoom, setShowSendToZoom] = useState(false);
  const [showSendToIsapres, setShowSendToIsapres] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [lostSource, setLostSource] = useState<
    "zoom" | "premium" | "isapres" | null
  >(null);
  const [lostReason, setLostReason] = useState<ClientLostReasonCode | "">("");
  const [lostReasonOther, setLostReasonOther] = useState("");
  const [calendlyBusy, setCalendlyBusy] = useState(false);
  const [calendlyTeamId, setCalendlyTeamId] = useState<CalendlyTeamId | "">("");
  const [calendlyConfiguredTeams, setCalendlyConfiguredTeams] = useState<
    Array<{
      teamId: CalendlyTeamId;
      label: string;
      ready: boolean;
      schedulingUrl?: string;
    }>
  >([]);
  const [calendlyLinkInfo, setCalendlyLinkInfo] = useState<{
    teamId: CalendlyTeamId;
    teamLabel: string;
    schedulingUrl: string;
    prefill: { email: string | null; name: string | null } | null;
  } | null>(null);
  const [calendlyError, setCalendlyError] = useState<string | null>(null);
  const [calendlyBookedHint, setCalendlyBookedHint] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [flowActionModal, setFlowActionModal] = useState<
    | null
    | "reschedule"
    | "redirect"
    | "lost"
    | "send_zoom"
    | "send_isapres"
    | "derive"
    | "reminder"
    | "recepcionado"
  >(null);
  const [reminderAtLocal, setReminderAtLocal] = useState("");
  const [reminderNoteLocal, setReminderNoteLocal] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const [agendaOutcomes, setAgendaOutcomes] = useState<
    Record<string, AgendaOutcomeValue | "">
  >({});
  const [agendaOtherNotes, setAgendaOtherNotes] = useState<
    Record<string, string>
  >({});
  const [agendaDoneIds, setAgendaDoneIds] = useState<Record<string, true>>({});
  const [agendaCompletedSnapshots, setAgendaCompletedSnapshots] = useState<
    ClientAgendaItem[]
  >([]);
  const [agendaActionModal, setAgendaActionModal] = useState<{
    item: ClientAgendaItem;
    outcome: AgendaOutcomeValue;
  } | null>(null);
  const [agendaReachCode, setAgendaReachCode] = useState("");
  const [agendaReachNote, setAgendaReachNote] = useState("");
  const [rutErrors, setRutErrors] = useState<{
    titular?: string;
    dependents?: Record<string, string>;
    additionalTitulares?: Record<string, string>;
  }>({});

  const hasUnsavedChanges = useMemo(() => {
    if (!client) return false;
    if (showNoAnswer || showRedirect || showSendToZoom || showSendToIsapres || showLost) {
      return true;
    }
    if (toDatetimeLocalValue(client.nextCallAt) !== nextCallLocal) return true;
    if (rescheduleNote.trim()) return true;
    if (meetingNote.trim()) return true;
    if (
      showReschedule &&
      rescheduleSource === "premium" &&
      rescheduleContactMethod !== (client.preferredContactMethod ?? "")
    ) {
      return true;
    }
    if (
      profileSnapshot(profileForm) !==
      profileSnapshot(userRecordToProfileFormValue(client))
    ) {
      return true;
    }
    if (!isZoom) {
      const originalChecklist = client.checklist ?? buildDefaultClientChecklist();
      if (JSON.stringify(checklist.items) !== JSON.stringify(originalChecklist.items)) {
        return true;
      }
      if (showCloseForm || pipelineStatus === "RECEPCIONADO") {
        const originalClosed = client.closedRecord ?? buildEmptyClosedRecord();
        if (JSON.stringify(closedRecord) !== JSON.stringify(originalClosed)) {
          return true;
        }
      }
    }
    return false;
  }, [
    client,
    pipelineStatus,
    nextCallLocal,
    rescheduleNote,
    meetingNote,
    rescheduleContactMethod,
    profileForm,
    checklist,
    closedRecord,
    isZoom,
    showCloseForm,
    showNoAnswer,
    showRedirect,
    showSendToZoom,
    showSendToIsapres,
    showLost,
    showReschedule,
    rescheduleSource,
  ]);

  useEffect(() => {
    if (!open || !client) return;
    setPipelineStatus(client.pipelineStatus ?? "NUEVO");
    setChecklist(client.checklist ?? buildDefaultClientChecklist());
    const nextClosedRecord = client.closedRecord ?? buildEmptyClosedRecord();
    const advisedPlan = client.advisedPlan ?? client.requestedPlan;
    if (advisedPlan && !nextClosedRecord.isapre.trim()) {
      nextClosedRecord.isapre = advisedPlan.isapre;
      nextClosedRecord.planCode = advisedPlan.planCode;
      nextClosedRecord.planName = advisedPlan.planName;
    }
    setClosedRecord(nextClosedRecord);
    setPipelineNotes(client.pipelineNotes ?? "");
    setNextCallLocal(toDatetimeLocalValue(client.nextCallAt));
    setReminderAtLocal(toDatetimeLocalValue(client.reminderAt));
    setReminderNoteLocal(client.reminderNote ?? "");
    setRescheduleNote("");
    setMeetingNote("");
    setRescheduleContactMethod(client.preferredContactMethod ?? "");
    setProfileForm(userRecordToProfileFormValue(client));
    setShowReschedule(false);
    setRescheduleSource(null);
    setShowRedirect(false);
    setShowNoAnswer(false);
    setShowSendToZoom(false);
    setShowSendToIsapres(false);
    setShowLost(false);
    setLostSource(null);
    setLostReason("");
    setLostReasonOther("");
    setCalendlyLinkInfo(null);
    setCalendlyError(null);
    setCalendlyBookedHint(false);
    setCalendlyTeamId(
      client.calendlyTeam && isCalendlyTeamId(client.calendlyTeam)
        ? client.calendlyTeam
        : "",
    );
    setAgendaOutcomes({});
    setAgendaOtherNotes({});
    setAgendaDoneIds({});
    setAgendaCompletedSnapshots([]);
    setAgendaActionModal(null);
    setAgendaReachCode("");
    setAgendaReachNote("");
    setCalendlyConfiguredTeams([]);
    setShowCloseForm((client.pipelineStatus ?? "NUEVO") === "RECEPCIONADO");
    setRedirectTargetId("");
    setRedirectContactMethod("");
    setRedirectAppointmentLocal("");
    setSendZoomTargetId("");
    setSendIsapresTargetId("");
    setPendingConfirm(null);
    setRutErrors({});
  }, [open, client]);

  // Solo salir de la pista al abrir/cambiar de cliente — no al guardar (mismo id).
  useEffect(() => {
    setActiveFlow(null);
  }, [open, client?.id]);

  // Deep-link: abrir flujo + modal de gestión (calendario → ficha).
  useEffect(() => {
    if (!open || !client || !launchRequest) return;

    const { flow, gestion } = launchRequest;
    setActiveFlow(flow);

    if (gestion === "reschedule") {
      setShowNoAnswer(false);
      setShowRedirect(false);
      setShowSendToZoom(false);
      setShowSendToIsapres(false);
      setShowLost(false);
      setLostSource(null);
      setPendingConfirm(null);
      setNextCallLocal(toDatetimeLocalValue(client.nextCallAt));
      setRescheduleNote("");
      if (canManagePremium) {
        setShowReschedule(true);
        setRescheduleSource("premium");
        setRescheduleContactMethod(client.preferredContactMethod ?? "");
      } else {
        setShowReschedule(true);
        setRescheduleSource("zoom");
      }
      setFlowActionModal("reschedule");
    } else if (gestion === "reminder") {
      setShowNoAnswer(false);
      setShowReschedule(false);
      setRescheduleSource(null);
      setShowRedirect(false);
      setShowSendToZoom(false);
      setShowSendToIsapres(false);
      setShowLost(false);
      setLostSource(null);
      setPendingConfirm(null);
      setReminderAtLocal(toDatetimeLocalValue(client.reminderAt));
      setReminderNoteLocal(client.reminderNote ?? "");
      setFlowActionModal("reminder");
    } else if (gestion === "confirm_zoom") {
      setShowNoAnswer(false);
      setShowReschedule(false);
      setRescheduleSource(null);
      setShowRedirect(false);
      setShowSendToZoom(false);
      setShowSendToIsapres(false);
      setShowLost(false);
      setLostSource(null);
      setFlowActionModal(null);
      if (client.confirmationCallAt || client.nextCallAt) {
        setConfirmZoomNote("");
        setPendingConfirm({ kind: "confirm_zoom_meeting" });
      } else {
        onNotify("No hay una reunión Zoom pendiente de confirmar.", "error");
      }
    } else if (gestion === "redirect") {
      setShowNoAnswer(false);
      setShowReschedule(false);
      setRescheduleSource(null);
      setShowSendToZoom(false);
      setShowSendToIsapres(false);
      setShowLost(false);
      setLostSource(null);
      setPendingConfirm(null);
      if (canManageZoom) {
        setShowRedirect(true);
        setFlowActionModal("redirect");
      } else if (canManagePremium) {
        setFlowActionModal("derive");
      }
    }

    onLaunchConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot launch
  }, [open, client?.id, launchRequest]);

  useEffect(() => {
    onActiveFlowChange?.(activeFlow);
    // Parent often passes an inline callback; only react to flow changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [activeFlow]);

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [hasUnsavedChanges]);

  useEffect(() => {
    // Zoom e Isapres (y admin) necesitan el listado Premium para asignar/redirigir.
    if (!open || !(canManageZoom || canManageIsapres || isAdmin)) return;
    let cancelled = false;
    void (async () => {
      try {
        const executives = await fetchEligibleExecutives("ISAPRES_PREMIUM");
        if (!cancelled) setPremiumExecutives(executives);
      } catch {
        if (!cancelled) setPremiumExecutives([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canManageZoom, canManageIsapres, isAdmin]);

  useEffect(() => {
    // Premium (y admin) necesitan Zoom / Isapres para derivar.
    if (!open || !(canManagePremium || isAdmin)) return;
    let cancelled = false;
    void (async () => {
      try {
        const [zoomRows, isapresRows] = await Promise.all([
          fetchEligibleExecutives("ZOOM"),
          fetchEligibleExecutives("ISAPRES"),
        ]);
        if (!cancelled) {
          setZoomExecutives(zoomRows);
          setIsapresExecutives(isapresRows);
        }
      } catch {
        if (!cancelled) {
          setZoomExecutives([]);
          setIsapresExecutives([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canManagePremium]);

  useEffect(() => {
    const needsCalendly =
      open &&
      client &&
      ((showRedirect && redirectContactMethod === "ZOOM") ||
        (showReschedule &&
          rescheduleSource === "premium" &&
          rescheduleContactMethod === "ZOOM") ||
        (showReschedule && rescheduleSource === "zoom"));

    if (!needsCalendly || !client) {
      return;
    }

    let cancelled = false;
    setCalendlyBusy(true);
    setCalendlyError(null);
    setCalendlyBookedHint(false);

    void (async () => {
      try {
        const link = await fetchCalendlySchedulingLink({
          clientId: client.id,
          ...(calendlyTeamId
            ? { team: calendlyTeamId, auto: false }
            : { auto: true }),
        });
        if (cancelled) return;
        setCalendlyTeamId(link.teamId);
        setCalendlyConfiguredTeams(
          link.configuredTeams.map((team) => ({
            teamId: team.teamId,
            label: team.label,
            ready: team.ready,
            schedulingUrl: team.schedulingUrl,
          })),
        );
        setCalendlyLinkInfo({
          teamId: link.teamId,
          teamLabel: link.teamLabel,
          schedulingUrl: link.schedulingUrl,
          prefill: link.prefill,
        });
      } catch (error) {
        if (cancelled) return;
        setCalendlyLinkInfo(null);
        setCalendlyError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar Calendly. Revisa CALENDLY_EQUIPO_*_SCHEDULING_URL en el entorno.",
        );
      } finally {
        if (!cancelled) setCalendlyBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    client?.id,
    showRedirect,
    redirectContactMethod,
    showReschedule,
    rescheduleSource,
    rescheduleContactMethod,
    calendlyTeamId,
  ]);

  const nextCallLabel = formatNextCallAt(client?.nextCallAt);
  const confirmationCallLabel = formatNextCallAt(client?.confirmationCallAt);

  const confirmCopy = useMemo(() => {
    if (!pendingConfirm || !client) return null;
    switch (pendingConfirm.kind) {
      case "save": {
        const scheduleIsZoom = isZoomScheduleAction({
          activeFlow,
          rescheduleSource,
          rescheduleContactMethod,
          preferredContactMethod: client.preferredContactMethod,
        });
        const changes = buildSaveChangeSummary({
          client,
          profileForm,
          nextCallLocal,
          rescheduleNote,
          meetingNote,
          rescheduleContactMethod,
          checklist,
          closedRecord,
          showCloseForm,
          pipelineStatus,
          isZoom,
          scheduleIsZoom,
        });
        const onlySchedule =
          changes.length > 0 &&
          changes.every(
            (item) =>
              item.startsWith("Agendar llamado") ||
              item.startsWith("Reagendar llamado") ||
              item.startsWith("Agendar reunión Zoom") ||
              item.startsWith("Editar reunión Zoom") ||
              item.startsWith("Confirmar llamado") ||
              item.startsWith("Confirmar reunión Zoom") ||
              item.startsWith("Quitar la fecha") ||
              item.startsWith("Nota de reagendamiento") ||
              item.startsWith("Nota de agendamiento") ||
              item.startsWith("Nota de edición Zoom") ||
              item.startsWith("Nota de agendamiento Zoom") ||
              item.startsWith("Canal de reunión"),
          );
        const whenLabel =
          formatNextCallFromLocal(nextCallLocal) ?? nextCallLocal;
        const isReschedule = changes.some(
          (item) =>
            item.startsWith("Reagendar") || item.startsWith("Editar reunión"),
        );
        const clientName = (
          <span className="font-extrabold text-[color:var(--dash-cyan,#1ac9ea)]">
            {client.fullName}
          </span>
        );
        return {
          title: onlySchedule
            ? scheduleIsZoom
              ? isReschedule
                ? "Confirmar edición Zoom"
                : "Confirmar agendamiento Zoom"
              : isReschedule
                ? "Confirmar reagendamiento"
                : "Confirmar agendamiento"
            : "Guardar cambios",
          description:
            onlySchedule && whenLabel ? (
              scheduleIsZoom ? (
                <>
                  ¿Confirmas {isReschedule ? "actualizar" : "agendar"} la reunión
                  Zoom de {clientName} para el {whenLabel}?
                </>
              ) : (
                <>
                  ¿Confirmas {isReschedule ? "reagendar" : "agendar"} el llamado
                  de {clientName} para el {whenLabel}?
                </>
              )
            ) : (
              <>Se aplicarán estos cambios en {clientName}:</>
            ),
          changes:
            changes.length > 0
              ? changes
              : ["Guardar los cambios pendientes del cliente"],
        };
      }
      case "no_contesta":
        return {
          title: "Marcar No contesta",
          description: `Se actualizará el estado de ${client.fullName}:`,
          changes: [
            "Estado → No contesta",
            "Se agregará una nota automática en el historial",
          ],
        };
      case "contactado":
        return {
          title: "Marcar Contactado",
          description: `Se registrará el contacto con ${client.fullName}:`,
          changes: [
            "Estado → Contactado",
            "Se agregará una nota automática en el historial",
          ],
        };
      case "perdido":
        return {
          title: "Marcar Perdido",
          description: `Se cerrará el seguimiento de ${client.fullName}:`,
          changes: [
            "Estado → Perdido",
            `Motivo: ${pendingConfirm.reasonLabel}`,
            "Se agregará una nota automática en el historial",
          ],
        };
      case "close": {
        const isapreLabel = closedRecord.isapre.trim() || "la Isapre indicada";
        const closeBits = [
          closedRecord.isapre.trim()
            ? `Isapre: ${closedRecord.isapre.trim()}`
            : null,
          closedRecord.planName?.trim() || closedRecord.planCode?.trim()
            ? `Plan: ${
                closedRecord.planName?.trim() || closedRecord.planCode?.trim()
              }`
            : null,
          closedRecord.closedAt.trim()
            ? `Fecha: ${closedRecord.closedAt}`
            : null,
        ].filter((value): value is string => Boolean(value));
        return {
          title: "Recepcionado",
          description: `¿Confirmas marcar como recepcionado a ${client.fullName} con ${isapreLabel}?`,
          changes: ["Estado → Cerrado (recepcionado)", ...closeBits],
        };
      }
      case "redirect":
        return {
          title:
            activeFlow === "isapres"
              ? "Devolver a Ejecutivo Isapre Premium"
              : "Redirigir a Isapres Premium",
          description: `Se reasignará a ${client.fullName}:`,
          changes: [
            `Ejecutivo destino: ${pendingConfirm.targetLabel}`,
            `Contacto preferido: ${pendingConfirm.contactMethodLabel}`,
            `Atención solicitada: ${pendingConfirm.appointmentLabel}`,
            "Estado → Nuevo en la cartera Premium",
            "Queda en Derivados (seguimiento hasta el cierre)",
            `Confirmación Zoom ~${CONFIRMATION_CALL_LEAD_MINUTES} min antes de la reunión`,
          ],
        };
      case "send_zoom":
        return {
          title: "Confirmar devolución a Zoom",
          description: `¿Confirmas devolver a ${client.fullName} a un Ejecutivo Zoom por falta de contacto?`,
          changes: [
            `Ejecutivo Zoom destino: ${pendingConfirm.targetLabel}`,
            "Estado → No contesta",
            "Saldrá de tu cartera activa",
            "Zoom lo verá en Devueltos",
          ],
        };
      case "send_isapres":
        return {
          title: "Confirmar envío a Isapres",
          description: `¿Confirmas enviar a ${client.fullName} a un Ejecutivo Isapres para cierre/contratación?`,
          changes: [
            `Ejecutivo Isapres destino: ${pendingConfirm.targetLabel}`,
            "Estado → Documentación (listo para cierre)",
            "Queda en Derivados (seguimiento hasta el cierre)",
          ],
        };
      case "confirm_zoom_meeting": {
        const clientName = (
          <span className="font-extrabold text-[color:var(--dash-cyan,#1ac9ea)]">
            {client.fullName}
          </span>
        );
        const isConfirmationCall = Boolean(client.confirmationCallAt);
        const whenLabel = isConfirmationCall
          ? confirmationCallLabel
          : nextCallLabel;
        return {
          title: "Confirmar reunión Zoom",
          description: whenLabel ? (
            <>
              ¿Confirmas la reunión Zoom de {clientName} ({whenLabel})?
            </>
          ) : (
            <>¿Confirmas la reunión Zoom de {clientName}?</>
          ),
          changes: isConfirmationCall
            ? [
                "Se registra la confirmación Zoom como realizada",
                "Se limpia el llamado de confirmación pendiente",
                "Queda registro en el historial",
                "Puedes agregar una anotación opcional",
              ]
            : [
                "Se registra la reunión Zoom como confirmada",
                "Se limpia la fecha de reunión pendiente",
                "Estado → Contactado (si aplica)",
                "Queda registro en el historial",
                "Puedes agregar una anotación opcional",
              ],
        };
      }
    }
  }, [
    pendingConfirm,
    client,
    profileForm,
    nextCallLocal,
    rescheduleNote,
    meetingNote,
    rescheduleContactMethod,
    checklist,
    closedRecord,
    showCloseForm,
    pipelineStatus,
    isZoom,
    activeFlow,
    rescheduleSource,
    nextCallLabel,
    confirmationCallLabel,
  ]);

  if (!client) return null;

  const whatsappUrl = client.phone
    ? buildWhatsAppUrl(
        client.phone,
        `Hola ${client.fullName.split(/\s+/)[0] || ""}, te contacto desde Cotizador Premium respecto a tu solicitud de plan de salud.`,
      )
    : null;

  function toggleChecklistItem(itemId: string) {
    setChecklist((current) => {
      const nextItems = current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              checked: !item.checked,
              checkedAt: !item.checked ? new Date().toISOString() : null,
            }
          : item,
      );
      const checkedSomething = nextItems.some((item) => item.checked);
      if (checkedSomething) {
        setPipelineStatus((status) =>
          advancePipelineStatus(status, "EN_SEGUIMIENTO"),
        );
      }
      return {
        ...current,
        items: nextItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function buildProfilePayload() {
    return {
      email: profileForm.email.trim() || null,
      phone: profileForm.phone.trim() || null,
      rut: profileForm.rut.trim() || null,
      firstNames: profileForm.firstNames.trim(),
      lastNames: profileForm.lastNames.trim(),
      birthDate: profileForm.birthDate || null,
      age: profileForm.age.trim() || null,
      currentIsapre: profileForm.currentIsapre || null,
      currentPlanPrice: profileForm.currentPlanPrice.trim() || null,
      currentPlanPriceCurrency: profileForm.currentPlanPriceCurrency || "UF",
      voluntaryAdditional: profileForm.voluntaryAdditional.trim() || null,
      voluntaryAdditionalCurrency:
        profileForm.voluntaryAdditionalCurrency || "UF",
      heightCm: profileForm.heightCm || null,
      weightKg: profileForm.weightKg || null,
      maritalStatus: profileForm.maritalStatus || null,
      employerRut: profileForm.employerRut.trim() || null,
      contributorType: profileForm.contributorType.trim() || null,
      rentaImponible: profileForm.rentaImponible.trim() || null,
      motivoCotizacion: profileForm.motivoCotizacion || null,
      motivoCotizacionOther: motivoCotizacionIncludesOtros(
        profileForm.motivoCotizacion,
      )
        ? profileForm.motivoCotizacionOther.trim() || null
        : null,
      address: profileForm.address || null,
      commune: profileForm.commune || null,
      coverageArea: profileForm.coverageArea || null,
      coverageRegionId: profileForm.coverageRegionId || null,
      preferredClinics: profileForm.preferredClinics.trim() || null,
      anualidad: profileForm.anualidad,
      anualidadComment: profileForm.anualidad
        ? null
        : profileForm.anualidadComment.trim() || null,
      segurosComplementarios:
        profileForm.segurosComplementarios.trim() || null,
      preexistenciasMedicas:
        profileForm.preexistenciasMedicas.trim() || null,
      dependents: profileForm.dependents,
      additionalTitulares: profileForm.additionalTitulares,
    };
  }

  function renderCalendlyZoomPanel(context: "redirect" | "reschedule") {
    if (!client) return null;

    const hasScheduledCall = Boolean(client.nextCallAt);
    const isEditingExistingZoom =
      context === "reschedule" &&
      hasScheduledCall &&
      (rescheduleSource === "zoom" ||
        rescheduleContactMethod === "ZOOM" ||
        client.preferredContactMethod === "ZOOM" ||
        Boolean(client.zoomJoinUrl) ||
        Boolean(client.calendlyTeam));

    if (isEditingExistingZoom) {
      return (
        <div className="space-y-2 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-3">
          <p className="text-xs font-semibold text-amber-950">
            Editar reunión Zoom
          </p>
          <p className="text-[11px] leading-relaxed text-amber-950/90">
            Para editar la fecha u hora de una reunión Zoom debes hacerlo
            directamente en Calendly (reagendar o cancelar y volver a agendar).
            Aquí solo puedes actualizar la fecha interna de seguimiento o
            agregar una nota.
          </p>
          {client.calendlyTeam && isCalendlyTeamId(client.calendlyTeam) ? (
            <p className="text-[11px] text-amber-950/80">
              Equipo Calendly del cliente:{" "}
              <span className="font-semibold">
                {CALENDLY_TEAM_LABELS[client.calendlyTeam]}
              </span>
            </p>
          ) : null}
        </div>
      );
    }

    const scheduleNoun = hasScheduledCall
      ? "la edición de la reunión Zoom"
      : "el agendamiento Zoom";
    const bookedHint =
      context === "redirect"
        ? "Horario reservado en Calendly. Indica la misma fecha y hora abajo y confirma la redirección a Premium."
        : `Horario reservado en Calendly. Indica la misma fecha y hora arriba/abajo y confirma ${scheduleNoun}.`;
    const notifyHint =
      context === "redirect"
        ? "Reunión Calendly confirmada. Completa la fecha abajo y confirma la redirección."
        : `Reunión Calendly confirmada. Completa la fecha y confirma ${scheduleNoun}.`;

    return (
      <div className="space-y-3 rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-3">
        <div>
          <p className="text-xs font-semibold text-sky-950">
            Agendar Zoom con Calendly
          </p>
          <p className="mt-1 text-[11px] text-sky-900/80">
            Elige el equipo Zoom/Calendly (1, 2 o 3), agenda con el widget y el
            webhook guarda el link Zoom.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-sky-950">
            Equipo Calendly / Zoom
          </span>
          <select
            value={calendlyTeamId}
            disabled={actionBusy || calendlyBusy}
            onChange={(event) => {
              const next = event.target.value;
              setCalendlyBookedHint(false);
              setCalendlyLinkInfo(null);
              setCalendlyError(null);
              setCalendlyTeamId(
                isCalendlyTeamId(next) ? next : "",
              );
            }}
            className={joinClasses(
              "h-10 w-full rounded-md border border-sky-200 bg-white px-3 text-sm text-sky-950",
              ui.input,
            )}
          >
            <option value="">Seleccionar equipo…</option>
            {(calendlyConfiguredTeams.length > 0
              ? calendlyConfiguredTeams
              : CALENDLY_TEAM_IDS.map((id) => ({
                  teamId: id,
                  label: CALENDLY_TEAM_LABELS[id],
                  ready: true,
                }))
            ).map((team) => (
              <option
                key={team.teamId}
                value={team.teamId}
                disabled={team.ready === false}
              >
                {team.label}
                {team.ready === false ? " (sin URL)" : ""}
              </option>
            ))}
          </select>
          {calendlyLinkInfo ? (
            <p className="text-[11px] text-sky-900/80">
              Usando{" "}
              <span className="font-semibold">{calendlyLinkInfo.teamLabel}</span>
              {" · "}
              <span className="break-all">{calendlyLinkInfo.schedulingUrl}</span>
            </p>
          ) : client.calendlyTeam && isCalendlyTeamId(client.calendlyTeam) ? (
            <p className="text-[11px] text-sky-900/80">
              Equipo previo del cliente:{" "}
              <span className="font-semibold">
                {CALENDLY_TEAM_LABELS[client.calendlyTeam]}
              </span>
            </p>
          ) : null}
        </label>

        {calendlyBusy && !calendlyLinkInfo ? (
          <p className="text-xs text-sky-900">Cargando Calendly…</p>
        ) : null}
        {calendlyError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-950">
            {calendlyError}
          </p>
        ) : null}

        {calendlyLinkInfo ? (
          <CalendlyInlineEmbed
            url={calendlyLinkInfo.schedulingUrl}
            prefill={
              calendlyLinkInfo.prefill ?? {
                email: client.email,
                name: client.fullName,
              }
            }
            height={640}
            onEventScheduled={() => {
              setCalendlyBookedHint(true);
              onNotify(notifyHint);
            }}
          />
        ) : null}

        {calendlyBookedHint ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-950">
            {bookedHint}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={actionBusy || calendlyBusy}
            onClick={() => void handleCopyCalendlyLink()}
            className="border border-sky-200 bg-white text-sky-900 hover:bg-sky-100"
          >
            Copiar link
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={actionBusy || calendlyBusy}
            onClick={() => void handleOpenCalendly()}
            className="border border-sky-200 bg-white text-sky-900 hover:bg-sky-100"
          >
            Abrir en pestaña
          </Button>
        </div>

        {client.zoomJoinUrl ? (
          <p className="text-[11px]">
            <a
              href={client.zoomJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-900 underline underline-offset-2"
            >
              Unirse a Zoom
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  async function handleSave(options?: { forceClose?: boolean }) {
    if (!client) return;
    const closing =
      Boolean(options?.forceClose) ||
      showCloseForm ||
      pipelineStatus === "RECEPCIONADO";
    if (closing) {
      if (!closedRecord.isapre.trim()) {
        onNotify("Indica la Isapre del registro de recepcionado.", "error");
        return;
      }
      if (!closedRecord.closedAt.trim()) {
        onNotify("Indica la fecha de recepcionado.", "error");
        return;
      }
    }

    const originalNextCall = toDatetimeLocalValue(client.nextCallAt);
    const nextCallChanged = nextCallLocal !== originalNextCall;
    let nextCallIso: string | null = null;
    if (nextCallLocal.trim()) {
      const nextCallDate = new Date(nextCallLocal);
      if (Number.isNaN(nextCallDate.getTime())) {
        onNotify("La fecha del próximo llamado no es válida.", "error");
        return;
      }
      nextCallIso = nextCallDate.toISOString();
    }

    const contactMethodChanged =
      Boolean(rescheduleContactMethod) &&
      rescheduleContactMethod !== (client.preferredContactMethod ?? "");

    const applyReschedule =
      (isZoom || isPremium || showReschedule) &&
      Boolean(nextCallIso) &&
      (nextCallChanged ||
        Boolean(rescheduleNote.trim()) ||
        (showReschedule &&
          rescheduleSource === "premium" &&
          contactMethodChanged));

    const scheduleIsZoom = isZoomScheduleAction({
      activeFlow,
      rescheduleSource,
      rescheduleContactMethod,
      preferredContactMethod: client.preferredContactMethod,
    });

    let notesToSave: string | null | undefined;
    let lastCallOutcome: string | null | undefined;
    if (applyReschedule && nextCallIso) {
      const whenLabel = formatNextCallAt(nextCallIso) ?? nextCallLocal;
      const channelLabel =
        rescheduleSource === "premium" && rescheduleContactMethod
          ? ` Canal: ${CLIENT_CONTACT_METHOD_LABELS[rescheduleContactMethod]}.`
          : "";
      const isReschedule = Boolean(originalNextCall);
      const noteVerb = scheduleIsZoom
        ? isReschedule
          ? "Reunión Zoom actualizada"
          : "Reunión Zoom agendada"
        : isReschedule
          ? "Reagendado"
          : "Agendado";
      const noteBody = `${noteVerb} para ${whenLabel}.${channelLabel}${
        rescheduleNote.trim() ? ` ${rescheduleNote.trim()}` : ""
      }`;
      notesToSave = appendPipelineNoteLine(
        client.pipelineNotes,
        noteBody,
        actorDisplayName,
      );
      lastCallOutcome =
        rescheduleNote.trim() ||
        (scheduleIsZoom
          ? isReschedule
            ? "Reunión Zoom actualizada"
            : "Reunión Zoom agendada"
          : rescheduleContactMethod
            ? `Llamado ${isReschedule ? "reagendado" : "agendado"} · ${CLIENT_CONTACT_METHOD_LABELS[rescheduleContactMethod]}`
            : `Llamado ${isReschedule ? "reagendado" : "agendado"}`);
    }

    if (closing) {
      const closeBody = `Recepcionado. Isapre: ${closedRecord.isapre.trim()}.${
        closedRecord.planName?.trim() || closedRecord.planCode?.trim()
          ? ` Plan: ${closedRecord.planName?.trim() || closedRecord.planCode?.trim()}.`
          : ""
      }`;
      notesToSave = appendPipelineNoteLine(
        notesToSave ?? client.pipelineNotes,
        closeBody,
        actorDisplayName,
      );
      lastCallOutcome = `Recepcionado · ${closedRecord.isapre.trim()}`;
    }

    if (meetingNote.trim()) {
      notesToSave = appendPipelineNoteLine(
        notesToSave ?? client.pipelineNotes,
        formatClientNoteLineBody(meetingNote.trim()),
        actorDisplayName,
      );
      if (!lastCallOutcome) {
        lastCallOutcome = "Nota registrada";
      }
    }

    setSaving(true);
    try {
      const nextStatus = closing
        ? "RECEPCIONADO"
        : applyReschedule
          ? "EN_SEGUIMIENTO"
          : checklist.items.some((item) => item.checked)
            ? advancePipelineStatus(pipelineStatus, "EN_SEGUIMIENTO")
            : pipelineStatus;

      const updated = await updateClientPipeline(client.id, {
        ...(closing || nextStatus !== (client.pipelineStatus ?? "NUEVO")
          ? { pipelineStatus: nextStatus }
          : {}),
        checklist,
        clientProfile: buildProfilePayload(),
        ...(closing ? { closedRecord } : {}),
        ...(notesToSave !== undefined ? { pipelineNotes: notesToSave } : {}),
        ...(lastCallOutcome !== undefined ? { lastCallOutcome } : {}),
        nextCallAt: nextCallIso,
        ...(applyReschedule &&
        rescheduleSource === "premium" &&
        rescheduleContactMethod
          ? { preferredContactMethod: rescheduleContactMethod }
          : {}),
      });
      setPipelineStatus(updated.pipelineStatus ?? nextStatus);
      if (canViewInternalNotes) {
        setPipelineNotes(updated.pipelineNotes ?? notesToSave ?? "");
      }
      setRescheduleNote("");
      setMeetingNote("");
      setShowReschedule(false);
      setRescheduleSource(null);
      setShowCloseForm(closing);
      if (closing) {
        setFlowActionModal(null);
      }
      onUpdated(updated);
      onNotify(
        closing
          ? "Cliente marcado como recepcionado."
          : applyReschedule
            ? scheduleIsZoom
              ? originalNextCall
                ? "Reunión Zoom actualizada y cambios guardados."
                : "Reunión Zoom agendada y cambios guardados."
              : originalNextCall
                ? "Llamado reagendado y cambios guardados."
                : "Llamado agendado y cambios guardados."
            : "Cliente actualizado.",
      );
      if (shouldCloseAfterSave) {
        onClose();
      }
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo guardar.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFichaModal(options?: { closeModal?: boolean }) {
    if (!client || !canEditClientData) return;
    setSaving(true);
    try {
      const historyBodies = buildFichaProfileHistoryNotes(client, profileForm);
      const originalChecklist = client.checklist ?? buildDefaultClientChecklist();
      const newlyChecked = checklist.items.filter((item) => {
        const previous = originalChecklist.items.find((row) => row.id === item.id);
        return item.checked && !previous?.checked;
      });
      const newlyUnchecked = checklist.items.filter((item) => {
        const previous = originalChecklist.items.find((row) => row.id === item.id);
        return !item.checked && previous?.checked;
      });
      if (newlyChecked.length > 0) {
        historyBodies.push(
          newlyChecked.length === 1
            ? `Marcó documento recibido: ${newlyChecked[0].label}.`
            : `Marcó ${newlyChecked.length} documentos como recibidos.`,
        );
      }
      if (newlyUnchecked.length > 0) {
        historyBodies.push(
          newlyUnchecked.length === 1
            ? `Desmarcó documento: ${newlyUnchecked[0].label}.`
            : `Desmarcó ${newlyUnchecked.length} documentos.`,
        );
      }

      let notesToSave = client.pipelineNotes ?? null;
      for (const body of historyBodies) {
        notesToSave = appendPipelineNoteLine(
          notesToSave,
          body,
          actorDisplayName,
        );
      }

      const updated = await updateClientPipeline(client.id, {
        checklist,
        clientProfile: buildProfilePayload(),
        ...(historyBodies.length > 0
          ? {
              pipelineNotes: notesToSave,
              lastCallOutcome: historyBodies[0].replace(/\.$/, ""),
            }
          : {}),
      });
      setPipelineStatus(updated.pipelineStatus ?? pipelineStatus);
      if (canViewInternalNotes && historyBodies.length > 0) {
        setPipelineNotes(updated.pipelineNotes ?? notesToSave ?? "");
      }
      onUpdated(updated);
      onNotify(
        historyBodies.length > 0
          ? "Cambios guardados en el historial."
          : "Cambios guardados.",
      );
      if (options?.closeModal !== false) {
        onFichaModalChange?.(null);
      }
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo guardar.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMeetingNoteModal() {
    if (!client || !canEditClientData) return;
    const noteBody = meetingNote.trim();
    if (!noteBody) {
      onNotify("Escribe una nota antes de guardar.", "error");
      return;
    }
    setSaving(true);
    try {
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        formatClientNoteLineBody(noteBody),
        actorDisplayName,
      );
      const updated = await updateClientPipeline(client.id, {
        pipelineNotes: nextNotes,
        lastCallOutcome: "Nota registrada",
        clientProfile: buildProfilePayload(),
      });
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      setMeetingNote("");
      onUpdated(updated);
      onNotify("Nota guardada.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo guardar la nota.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkNoAnswer() {
    if (!client) return;
    setActionBusy(true);
    try {
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        "No contesta.",
        actorDisplayName,
      );

      const updated = await updateClientPipeline(client.id, {
        pipelineStatus: "NO_CONTESTA",
        pipelineNotes: nextNotes,
        lastCallOutcome: "No contesta",
        clientProfile: buildProfilePayload(),
      });
      setPipelineStatus("NO_CONTESTA");
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      setShowNoAnswer(false);
      onUpdated(updated);
      onNotify("Estado actualizado: No contesta.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el estado.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMarkConfirmationCall(
    annotationNote?: string,
  ): Promise<boolean> {
    if (!client) return false;
    setActionBusy(true);
    try {
      let updated = await markClientConfirmationCall(client.id, {
        outcome:
          "Confirmación Zoom realizada: cliente recordado de la reunión Premium.",
      });
      const annotation = annotationNote?.trim();
      if (annotation) {
        const nextNotes = appendPipelineNoteLine(
          updated.pipelineNotes ?? client.pipelineNotes,
          formatClientNoteLineBody(annotation),
          actorDisplayName,
        );
        updated = await updateClientPipeline(client.id, {
          pipelineNotes: nextNotes,
        });
        if (canViewInternalNotes) setPipelineNotes(nextNotes);
      }
      onUpdated(updated);
      onNotify("Confirmación Zoom registrada.");
      return true;
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la confirmación.",
        "error",
      );
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmZoomMeeting() {
    if (!client) return;
    const annotation = confirmZoomNote.trim();

    // Prioriza el llamado de confirmación Zoom si está pendiente.
    if (client.confirmationCallAt) {
      const ok = await handleMarkConfirmationCall(annotation);
      if (ok) setConfirmZoomNote("");
      return;
    }

    if (!client.nextCallAt) {
      onNotify("No hay una reunión Zoom agendada para confirmar.", "error");
      return;
    }

    setActionBusy(true);
    try {
      const whenLabel = formatNextCallAt(client.nextCallAt) ?? "fecha indicada";
      const historyBody = `Reunión Zoom confirmada para ${whenLabel}.`;
      let nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        historyBody,
        actorDisplayName,
      );
      if (annotation) {
        nextNotes = appendPipelineNoteLine(
          nextNotes,
          formatClientNoteLineBody(annotation),
          actorDisplayName,
        );
      }
      const nextStatus = advancePipelineStatus(pipelineStatus, "CONTACTADO");
      const updated = await updateClientPipeline(client.id, {
        pipelineStatus: nextStatus,
        pipelineNotes: nextNotes,
        lastCallOutcome: "Reunión Zoom confirmada",
        nextCallAt: null,
        clientProfile: buildProfilePayload(),
      });
      setPipelineStatus(nextStatus);
      setNextCallLocal("");
      setConfirmZoomNote("");
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      onUpdated(updated);
      onNotify("Reunión Zoom confirmada.");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar la reunión Zoom.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveReminder() {
    if (!client) return;
    const note = reminderNoteLocal.trim();
    if (!note) {
      onNotify("Escribe la gestión del recordatorio (ej. llamar al cliente).", "error");
      return;
    }
    if (!reminderAtLocal.trim()) {
      onNotify("Indica fecha y hora del recordatorio.", "error");
      return;
    }
    const reminderDate = new Date(reminderAtLocal);
    if (Number.isNaN(reminderDate.getTime())) {
      onNotify("La fecha del recordatorio no es válida.", "error");
      return;
    }
    const reminderIso = reminderDate.toISOString();
    const whenLabel = formatNextCallAt(reminderIso) ?? reminderAtLocal;

    setActionBusy(true);
    try {
      const noteBody = `Recordatorio agendado para ${whenLabel}: ${note}`;
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        noteBody,
        actorDisplayName,
      );
      const updated = await updateClientPipeline(client.id, {
        reminderAt: reminderIso,
        reminderNote: note,
        pipelineNotes: nextNotes,
        lastCallOutcome: `Recordatorio · ${note}`,
        clientProfile: buildProfilePayload(),
      });
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      setReminderAtLocal(toDatetimeLocalValue(updated.reminderAt));
      setReminderNoteLocal(updated.reminderNote ?? note);
      onUpdated(updated);
      onNotify("Recordatorio guardado en el calendario.");
      setFlowActionModal(null);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el recordatorio.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMarkContacted() {
    if (!client) return;
    setActionBusy(true);
    try {
      const nextStatus = advancePipelineStatus(pipelineStatus, "CONTACTADO");
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        "Contactado.",
        actorDisplayName,
      );

      const updated = await updateClientPipeline(client.id, {
        pipelineStatus: nextStatus,
        pipelineNotes: nextNotes,
        lastCallOutcome: "Contactado",
        clientProfile: buildProfilePayload(),
      });
      setPipelineStatus(nextStatus);
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      onUpdated(updated);
      onNotify("Estado actualizado: Contactado.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el estado.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMarkLost() {
    if (!client) return;
    const reasonLabel = resolveClientLostReasonLabel(lostReason, lostReasonOther);
    if (!reasonLabel) {
      onNotify(
        lostReason === "OTROS"
          ? "Indica el motivo en Otros."
          : "Selecciona el motivo por el cual se marca como perdido.",
        "error",
      );
      return;
    }

    setActionBusy(true);
    try {
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        `Marcado como perdido. Motivo: ${reasonLabel}.`,
        actorDisplayName,
      );

      const updated = await updateClientPipeline(client.id, {
        pipelineStatus: "PERDIDO",
        pipelineNotes: nextNotes,
        lastCallOutcome: `Perdido · ${reasonLabel}`,
        clientProfile: buildProfilePayload(),
      });
      setPipelineStatus("PERDIDO");
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      setShowLost(false);
      setLostSource(null);
      setLostReason("");
      setLostReasonOther("");
      setShowCloseForm(false);
      onUpdated(updated);
      onNotify("Estado actualizado: Perdido.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el estado.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function markContactedFromWhatsApp() {
    if (!client) return;
    if (pipelineStatus !== "NUEVO" && pipelineStatus !== "NO_CONTESTA") return;
    try {
      const nextStatus = advancePipelineStatus(pipelineStatus, "CONTACTADO");
      if (nextStatus === pipelineStatus) return;
      const updated = await updateClientPipeline(client.id, {
        pipelineStatus: nextStatus,
        lastCallOutcome: "Contacto por WhatsApp",
      });
      setPipelineStatus(nextStatus);
      onUpdated(updated);
    } catch {
      // No bloquear WhatsApp si falla el avance de estado.
    }
  }

  async function handleRedirect() {
    if (!client) return;
    if (!redirectTargetId) {
      onNotify("Selecciona un Ejecutivo Isapres Premium.", "error");
      return;
    }
    if (!redirectContactMethod) {
      onNotify("Selecciona el método de contacto: Zoom o WhatsApp.", "error");
      return;
    }
    if (!redirectAppointmentLocal.trim()) {
      onNotify(
        "Indica la fecha y hora en que el cliente solicitó ser atendido.",
        "error",
      );
      return;
    }
    const appointmentDate = new Date(redirectAppointmentLocal);
    if (Number.isNaN(appointmentDate.getTime())) {
      onNotify("La fecha de atención solicitada no es válida.", "error");
      return;
    }

    setActionBusy(true);
    try {
      const updated = await redirectClientToPremium(client.id, {
        executiveAccountId: redirectTargetId,
        contactMethod: redirectContactMethod,
        appointmentAt: appointmentDate.toISOString(),
      });
      onNotify("Cliente redirigido a Isapres Premium.");
      if (onRedirected) {
        onRedirected(updated);
      } else {
        onUpdated(updated);
        onClose();
      }
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo redirigir el cliente.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSendToZoom() {
    if (!client) return;
    if (!sendZoomTargetId) {
      onNotify("Selecciona un Ejecutivo Zoom.", "error");
      return;
    }

    setActionBusy(true);
    try {
      const updated = await redirectClientToZoom(client.id, {
        executiveAccountId: sendZoomTargetId,
      });
      onNotify("Cliente enviado a Ejecutivo Zoom.");
      if (onRedirected) {
        onRedirected(updated);
      } else {
        onUpdated(updated);
        onClose();
      }
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el cliente a Zoom.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSendToIsapres() {
    if (!client) return;
    if (!sendIsapresTargetId) {
      onNotify("Selecciona un Ejecutivo Isapres.", "error");
      return;
    }

    setActionBusy(true);
    try {
      const updated = await redirectClientToIsapres(client.id, {
        executiveAccountId: sendIsapresTargetId,
      });
      onNotify("Cliente enviado a Ejecutivo Isapres.");
      if (onRedirected) {
        onRedirected(updated);
      } else {
        onUpdated(updated);
        onClose();
      }
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el cliente a Isapres.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  function validateProfileRutsBeforeCommit(): boolean {
    const errors = getClientManagementRutErrors(
      {
        rut: profileForm.rut,
        dependents: profileForm.dependents,
        additionalTitulares: profileForm.additionalTitulares,
      },
      { requireTitularRut: false },
    );
    if (errors.firstMessage) {
      setRutErrors({
        titular: errors.titular,
        dependents: errors.dependents,
        additionalTitulares: errors.additionalTitulares,
      });
      onNotify(errors.firstMessage, "error");
      return false;
    }
    setRutErrors({});
    return true;
  }

  function requestSaveConfirm() {
    if (!validateProfileRutsBeforeCommit()) return;

    if (showRedirect) {
      if (!redirectTargetId) {
        onNotify("Selecciona un Ejecutivo Isapres Premium.", "error");
        return;
      }
      if (!redirectContactMethod) {
        onNotify("Selecciona el método de contacto: Zoom o WhatsApp.", "error");
        return;
      }
      if (!redirectAppointmentLocal.trim()) {
        onNotify(
          "Indica la fecha y hora en que el cliente solicitó ser atendido.",
          "error",
        );
        return;
      }
      if (Number.isNaN(new Date(redirectAppointmentLocal).getTime())) {
        onNotify("La fecha de atención solicitada no es válida.", "error");
        return;
      }
      const target =
        premiumExecutives.find((row) => row.id === redirectTargetId) ?? null;
      const targetLabel = target
        ? formatExecutiveOptionLabel({
            fullName: target.fullName,
            executiveKind: target.executiveKind,
            realm: target.realm,
          })
        : "el ejecutivo seleccionado";
      setPendingConfirm({
        kind: "redirect",
        targetLabel,
        contactMethodLabel: CLIENT_CONTACT_METHOD_LABELS[redirectContactMethod],
        appointmentLabel:
          formatNextCallFromLocal(redirectAppointmentLocal) ??
          redirectAppointmentLocal,
      });
      return;
    }

    if (showSendToZoom) {
      if (!sendZoomTargetId) {
        onNotify("Selecciona un Ejecutivo Zoom.", "error");
        return;
      }
      const target =
        zoomExecutives.find((row) => row.id === sendZoomTargetId) ?? null;
      const targetLabel = target
        ? formatExecutiveOptionLabel({
            fullName: target.fullName,
            executiveKind: target.executiveKind,
            realm: target.realm,
          })
        : "el ejecutivo seleccionado";
      setPendingConfirm({ kind: "send_zoom", targetLabel });
      return;
    }

    if (showSendToIsapres) {
      if (!sendIsapresTargetId) {
        onNotify("Selecciona un Ejecutivo Isapres.", "error");
        return;
      }
      const target =
        isapresExecutives.find((row) => row.id === sendIsapresTargetId) ??
        null;
      const targetLabel = target
        ? formatExecutiveOptionLabel({
            fullName: target.fullName,
            executiveKind: target.executiveKind,
            realm: target.realm,
          })
        : "el ejecutivo seleccionado";
      setPendingConfirm({ kind: "send_isapres", targetLabel });
      return;
    }

    if (showNoAnswer) {
      setPendingConfirm({ kind: "no_contesta" });
      return;
    }

    if (showLost) {
      const reasonLabel = resolveClientLostReasonLabel(
        lostReason,
        lostReasonOther,
      );
      if (!reasonLabel) {
        onNotify(
          lostReason === "OTROS"
            ? "Indica el motivo en Otros."
            : "Selecciona el motivo por el cual se marca como perdido.",
          "error",
        );
        return;
      }
      setPendingConfirm({ kind: "perdido", reasonLabel });
      return;
    }

    if (showReschedule && !nextCallLocal.trim()) {
      const scheduleIsZoom = isZoomScheduleAction({
        activeFlow,
        rescheduleSource,
        rescheduleContactMethod,
        preferredContactMethod: client?.preferredContactMethod,
      });
      onNotify(
        scheduleIsZoom
          ? client?.nextCallAt
            ? "Indica la fecha y hora de la reunión Zoom."
            : "Indica la fecha y hora para agendar Zoom."
          : client?.nextCallAt
            ? "Indica la fecha y hora del llamado reagendado."
            : "Indica la fecha y hora del llamado.",
        "error",
      );
      return;
    }

    if (
      showReschedule &&
      rescheduleSource === "premium" &&
      !rescheduleContactMethod
    ) {
      onNotify("Selecciona si la reunión será por Zoom o WhatsApp.", "error");
      return;
    }

    if (!hasUnsavedChanges) {
      onNotify("No hay cambios para guardar.", "error");
      return;
    }
    setPendingConfirm({ kind: "save" });
  }

  function requestContactedConfirm() {
    if (!validateProfileRutsBeforeCommit()) return;
    setPendingConfirm({ kind: "contactado" });
  }

  async function handleOpenCalendly() {
    if (!client) return;
    setCalendlyBusy(true);
    setCalendlyError(null);
    try {
      const link = await fetchCalendlySchedulingLink({
        clientId: client.id,
        ...(calendlyTeamId
          ? { team: calendlyTeamId, auto: false }
          : { auto: true }),
      });
      setCalendlyTeamId(link.teamId);
      setCalendlyConfiguredTeams(
        link.configuredTeams.map((team) => ({
          teamId: team.teamId,
          label: team.label,
          ready: team.ready,
          schedulingUrl: team.schedulingUrl,
        })),
      );
      setCalendlyLinkInfo({
        teamId: link.teamId,
        teamLabel: link.teamLabel,
        schedulingUrl: link.schedulingUrl,
        prefill: link.prefill,
      });
      window.open(link.schedulingUrl, "_blank", "noopener,noreferrer");
      onNotify(`Calendly abierto (${link.teamLabel}).`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo obtener el link de Calendly.";
      setCalendlyError(message);
      onNotify(message, "error");
    } finally {
      setCalendlyBusy(false);
    }
  }

  async function handleCopyCalendlyLink() {
    if (!client) return;
    setCalendlyBusy(true);
    setCalendlyError(null);
    try {
      let link = calendlyLinkInfo;
      if (!link || (calendlyTeamId && link.teamId !== calendlyTeamId)) {
        const row = await fetchCalendlySchedulingLink({
          clientId: client.id,
          ...(calendlyTeamId
            ? { team: calendlyTeamId, auto: false }
            : { auto: true }),
        });
        setCalendlyTeamId(row.teamId);
        setCalendlyConfiguredTeams(
          row.configuredTeams.map((team) => ({
            teamId: team.teamId,
            label: team.label,
            ready: team.ready,
            schedulingUrl: team.schedulingUrl,
          })),
        );
        link = {
          teamId: row.teamId,
          teamLabel: row.teamLabel,
          schedulingUrl: row.schedulingUrl,
          prefill: row.prefill,
        };
        setCalendlyLinkInfo(link);
      }
      await navigator.clipboard.writeText(link.schedulingUrl);
      onNotify(`Link Calendly copiado (${link.teamLabel}).`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo copiar el link de Calendly.";
      setCalendlyError(message);
      onNotify(message, "error");
    } finally {
      setCalendlyBusy(false);
    }
  }

  function requestCloseConfirm() {
    if (!closedRecord.isapre.trim()) {
      onNotify("Indica la Isapre del registro de recepcionado.", "error");
      return;
    }
    if (!closedRecord.closedAt.trim()) {
      onNotify("Indica la fecha de recepcionado.", "error");
      return;
    }
    if (!validateProfileRutsBeforeCommit()) return;
    setPendingConfirm({ kind: "close" });
  }

  function clearManagementPanels() {
    setShowNoAnswer(false);
    setShowReschedule(false);
    setRescheduleSource(null);
    setShowRedirect(false);
    setShowSendToZoom(false);
    setShowSendToIsapres(false);
    setShowLost(false);
    setLostSource(null);
    setPendingConfirm(null);
  }

  function openRecepcionadoAction() {
    clearManagementPanels();
    setShowCloseForm(true);
    setClosedRecord((current) =>
      current.closedAt.trim()
        ? current
        : {
            ...current,
            closedAt: new Date().toISOString().slice(0, 10),
          },
    );
    openFlowActionModal("recepcionado");
  }

  function openFlowActionModal(
    kind:
      | "reschedule"
      | "redirect"
      | "lost"
      | "send_zoom"
      | "send_isapres"
      | "derive"
      | "reminder"
      | "recepcionado",
  ) {
    if (kind === "reminder" && client) {
      setReminderAtLocal(toDatetimeLocalValue(client.reminderAt));
      setReminderNoteLocal(client.reminderNote ?? "");
    }
    setFlowActionModal(kind);
  }

  function closeFlowActionModal() {
    clearManagementPanels();
    setShowCloseForm(false);
    setFlowActionModal(null);
  }

  function openZoomAction(
    action: "no_contesta" | "reschedule" | "redirect" | "perdido",
  ) {
    const isAlreadyOpen =
      (action === "no_contesta" && showNoAnswer) ||
      (action === "reschedule" &&
        showReschedule &&
        rescheduleSource === "zoom") ||
      (action === "redirect" && showRedirect) ||
      (action === "perdido" && showLost && lostSource === "zoom");

    clearManagementPanels();
    if (isAlreadyOpen) return;
    setShowNoAnswer(action === "no_contesta");
    if (action === "reschedule") {
      setShowReschedule(true);
      setRescheduleSource("zoom");
    }
    setShowRedirect(action === "redirect");
    if (action === "perdido") {
      setShowLost(true);
      setLostSource("zoom");
      setLostReason("");
      setLostReasonOther("");
    }
  }

  function openPremiumAction(
    action: "reschedule" | "send_zoom" | "send_isapres" | "perdido",
  ) {
    const isAlreadyOpen =
      (action === "reschedule" &&
        showReschedule &&
        rescheduleSource === "premium") ||
      (action === "send_zoom" && showSendToZoom) ||
      (action === "send_isapres" && showSendToIsapres) ||
      (action === "perdido" && showLost && lostSource === "premium");

    clearManagementPanels();
    if (isAlreadyOpen) return;
    if (action === "reschedule") {
      setShowReschedule(true);
      setRescheduleSource("premium");
    }
    setShowSendToZoom(action === "send_zoom");
    setShowSendToIsapres(action === "send_isapres");
    if (action === "perdido") {
      setShowLost(true);
      setLostSource("premium");
      setLostReason("");
      setLostReasonOther("");
    }
  }

  function openRescheduleAction() {
    if (canManagePremium) {
      openPremiumAction("reschedule");
      return;
    }
    openZoomAction("reschedule");
  }

  function openLostAction() {
    const nextSource: "zoom" | "premium" | "isapres" = isIsapres
      ? "isapres"
      : canManagePremium
        ? "premium"
        : "zoom";
    const isAlreadyOpen = showLost && lostSource === nextSource;
    clearManagementPanels();
    if (isAlreadyOpen) return;
    setShowLost(true);
    setLostSource(nextSource);
    setLostReason("");
    setLostReasonOther("");
  }

  function scrollToGestionOperativa() {
    if (typeof document === "undefined") return;
    document
      .getElementById("client-gestion-operativa")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function prepareAgendaReschedulePanels() {
    setNextCallLocal(toDatetimeLocalValue(client?.nextCallAt));
    setRescheduleNote("");
    if (canManagePremium) {
      setShowReschedule(true);
      setRescheduleSource("premium");
      setRescheduleContactMethod(client?.preferredContactMethod ?? "");
      return;
    }
    setShowReschedule(true);
    setRescheduleSource("zoom");
  }

  function prepareAgendaRedirectPanels() {
    if (canManageZoom) {
      setShowRedirect(true);
      return;
    }
    if (canManagePremium) {
      setShowSendToIsapres(true);
      return;
    }
  }

  function prepareAgendaLostPanels() {
    const nextSource: "zoom" | "premium" | "isapres" = isIsapres
      ? "isapres"
      : canManagePremium
        ? "premium"
        : "zoom";
    setShowLost(true);
    setLostSource(nextSource);
    setLostReason("");
    setLostReasonOther("");
  }

  function closeAgendaActionModal(options?: { keepOutcome?: boolean }) {
    const itemId = agendaActionModal?.item.id;
    setAgendaActionModal(null);
    setAgendaReachCode("");
    setAgendaReachNote("");
    if (itemId && !options?.keepOutcome) {
      setAgendaOutcomes((prev) => ({ ...prev, [itemId]: "" }));
      setAgendaOtherNotes((prev) => ({ ...prev, [itemId]: "" }));
    }
    clearManagementPanels();
  }

  function openAgendaActionModal(
    item: ClientAgendaItem,
    outcome: AgendaOutcomeValue,
  ) {
    clearManagementPanels();
    setAgendaReachCode("");
    setAgendaReachNote("");
    setAgendaOutcomes((prev) => ({ ...prev, [item.id]: outcome }));
    setAgendaActionModal({ item, outcome });

    if (outcome === "reschedule") {
      prepareAgendaReschedulePanels();
      return;
    }
    if (outcome === "redirect") {
      if (!canManageZoom && !canManagePremium) {
        onNotify("No tienes permiso para redirigir este cliente.", "error");
        setAgendaOutcomes((prev) => ({ ...prev, [item.id]: "" }));
        setAgendaActionModal(null);
        return;
      }
      prepareAgendaRedirectPanels();
      return;
    }
    if (outcome === "lost") {
      prepareAgendaLostPanels();
    }
  }

  function markAgendaItemDone(item: ClientAgendaItem, detail?: string) {
    setAgendaDoneIds((prev) => ({ ...prev, [item.id]: true }));
    setAgendaOutcomes((prev) => ({ ...prev, [item.id]: "completed" }));
    setAgendaCompletedSnapshots((prev) => {
      const without = prev.filter((row) => row.id !== item.id);
      return [
        ...without,
        {
          ...item,
          urgency: "done",
          required: false,
          detail: detail ?? "Gestión registrada como realizada.",
        },
      ];
    });
  }

  function buildAgendaCompletedNoteBody(item: ClientAgendaItem): string | null {
    const reach = agendaReachLabel(agendaReachCode);
    if (!reach) return null;
    const extra = agendaReachNote.trim();
    if (agendaReachCode === "otro" && !extra) return null;
    const channel =
      item.channelLabel ??
      (client?.preferredContactMethod
        ? CLIENT_CONTACT_METHOD_LABELS[client.preferredContactMethod]
        : null);
    const channelPart = channel ? ` (${channel})` : "";
    if (item.kind === "confirmation") {
      return `Confirmación Zoom realizada · ${reach}${
        extra ? `: ${extra}` : ""
      }.`;
    }
    if (item.kind === "meeting") {
      return `Reunión realizada${channelPart} · ${reach}${
        extra ? `: ${extra}` : ""
      }.`;
    }
    return `Contacté al cliente · ${item.title} · ${reach}${
      extra ? `: ${extra}` : ""
    }.`;
  }

  async function handleAgendaCompletedConfirm(item: ClientAgendaItem) {
    if (!client) return;
    const noteBody = buildAgendaCompletedNoteBody(item);
    if (!noteBody) {
      onNotify(
        agendaReachCode === "otro"
          ? "Escribe el detalle de cómo contactaste al cliente."
          : "Indica cómo llegaste a la persona (aceptó, reagendó, etc.).",
        "error",
      );
      return;
    }

    setActionBusy(true);
    try {
      if (item.kind === "confirmation") {
        const updated = await markClientConfirmationCall(client.id, {
          outcome: noteBody.replace(/\.$/, ""),
        });
        const nextNotes = appendPipelineNoteLine(
          updated.pipelineNotes ?? client.pipelineNotes,
          noteBody,
          actorDisplayName,
        );
        const withNotes = await updateClientPipeline(client.id, {
          pipelineNotes: nextNotes,
          lastCallOutcome: noteBody.replace(/\.$/, ""),
        });
        if (canViewInternalNotes) setPipelineNotes(nextNotes);
        markAgendaItemDone(item, noteBody);
        onUpdated(withNotes);
        onNotify("Confirmación registrada.");
        closeAgendaActionModal({ keepOutcome: true });
        return;
      }

      const nextStatus = advancePipelineStatus(pipelineStatus, "CONTACTADO");
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        noteBody,
        actorDisplayName,
      );
      const updated = await updateClientPipeline(client.id, {
        pipelineStatus: nextStatus,
        pipelineNotes: nextNotes,
        lastCallOutcome: noteBody.replace(/\.$/, ""),
        ...(item.kind === "meeting" ? { nextCallAt: null } : {}),
        ...(item.kind === "reminder"
          ? { reminderAt: null, reminderNote: null }
          : {}),
        clientProfile: buildProfilePayload(),
      });
      setPipelineStatus(nextStatus);
      if (item.kind === "meeting") setNextCallLocal("");
      if (item.kind === "reminder") {
        setReminderAtLocal("");
        setReminderNoteLocal("");
      }
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      markAgendaItemDone(item, noteBody);
      onUpdated(updated);
      onNotify(
        item.kind === "reminder"
          ? "Recordatorio marcado como realizado."
          : "Gestión registrada: contactaste al cliente.",
      );
      closeAgendaActionModal({ keepOutcome: true });
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la gestión.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAgendaOtherConfirm(item: ClientAgendaItem) {
    if (!client) return;
    const note = (agendaOtherNotes[item.id] ?? "").trim();
    if (!note) {
      onNotify("Escribe el detalle para registrarlo en notas.", "error");
      return;
    }
    setActionBusy(true);
    try {
      const noteBody = `Agenda · ${item.title}: ${note}`;
      const nextNotes = appendPipelineNoteLine(
        client.pipelineNotes,
        noteBody,
        actorDisplayName,
      );
      const updated = await updateClientPipeline(client.id, {
        pipelineNotes: nextNotes,
        lastCallOutcome: noteBody.slice(0, 120),
        clientProfile: buildProfilePayload(),
      });
      if (canViewInternalNotes) setPipelineNotes(nextNotes);
      setAgendaOtherNotes((prev) => ({ ...prev, [item.id]: "" }));
      onUpdated(updated);
      onNotify("Nota registrada en el historial.");
      closeAgendaActionModal();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo guardar la nota.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAgendaRescheduleConfirm(item: ClientAgendaItem) {
    if (!nextCallLocal.trim()) {
      onNotify("Indica la fecha y hora del llamado reagendado.", "error");
      return;
    }
    if (rescheduleSource === "premium" && !rescheduleContactMethod) {
      onNotify("Selecciona si la reunión será por Zoom o WhatsApp.", "error");
      return;
    }
    const noteExtra = rescheduleNote.trim();
    await handleSave();
    const detail = noteExtra
      ? `Reagendado. ${noteExtra}`
      : "Reagendado desde agenda.";
    markAgendaItemDone(item, detail);
    closeAgendaActionModal({ keepOutcome: true });
  }

  async function handleAgendaRedirectConfirm(item: ClientAgendaItem) {
    if (showRedirect) {
      if (!redirectTargetId) {
        onNotify("Selecciona un Ejecutivo Isapres Premium.", "error");
        return;
      }
      if (!redirectContactMethod) {
        onNotify("Selecciona el método de contacto: Zoom o WhatsApp.", "error");
        return;
      }
      if (!redirectAppointmentLocal.trim()) {
        onNotify(
          "Indica la fecha y hora en que el cliente solicitó ser atendido.",
          "error",
        );
        return;
      }
      await handleRedirect();
      markAgendaItemDone(item, "Redirigido a Isapres Premium.");
      closeAgendaActionModal({ keepOutcome: true });
      return;
    }
    if (showSendToIsapres) {
      if (!sendIsapresTargetId) {
        onNotify("Selecciona un Ejecutivo Isapres.", "error");
        return;
      }
      await handleSendToIsapres();
      markAgendaItemDone(item, "Enviado a ejecutivo Isapres.");
      closeAgendaActionModal({ keepOutcome: true });
      return;
    }
    onNotify("No tienes permiso para redirigir este cliente.", "error");
  }

  async function handleAgendaLostConfirm(item: ClientAgendaItem) {
    const reasonLabel = resolveClientLostReasonLabel(
      lostReason,
      lostReasonOther,
    );
    if (!reasonLabel) {
      onNotify(
        lostReason === "OTROS"
          ? "Indica el motivo en Otros."
          : "Selecciona el motivo por el cual se marca como perdido.",
        "error",
      );
      return;
    }
    await handleMarkLost();
    markAgendaItemDone(item, `Marcado perdido · ${reasonLabel}`);
    closeAgendaActionModal({ keepOutcome: true });
  }

  async function confirmAgendaActionModal() {
    if (!agendaActionModal) return;
    const { item, outcome } = agendaActionModal;

    if (outcome === "completed") {
      await handleAgendaCompletedConfirm(item);
      return;
    }
    if (outcome === "other") {
      await handleAgendaOtherConfirm(item);
      return;
    }
    if (outcome === "reschedule") {
      await handleAgendaRescheduleConfirm(item);
      return;
    }
    if (outcome === "redirect") {
      await handleAgendaRedirectConfirm(item);
      return;
    }
    if (outcome === "lost") {
      await handleAgendaLostConfirm(item);
    }
  }

  function handleAgendaOutcomeChange(
    item: ClientAgendaItem,
    value: AgendaOutcomeValue | "",
  ) {
    if (!value) {
      setAgendaOutcomes((prev) => ({ ...prev, [item.id]: "" }));
      return;
    }
    openAgendaActionModal(item, value);
  }

  function agendaActionModalCopy(): {
    title: string;
    description: string;
    confirmLabel: string;
  } {
    const outcome = agendaActionModal?.outcome;
    switch (outcome) {
      case "completed":
        return {
          title: "Confirmar contacto con el cliente",
          description:
            "Indica cómo llegaste a la persona (aceptó, reagendó, pidió info, etc.). Quedará en el historial.",
          confirmLabel: "Confirmar gestión realizada",
        };
      case "reschedule":
        return {
          title: "Reagendar llamado",
          description:
            "Elige fecha/hora y confirma. Se registrará la nota de reagendamiento.",
          confirmLabel: "Confirmar reagendamiento",
        };
      case "redirect":
        return {
          title: canManageZoom
            ? "Redirigir a Isapres Premium"
            : "Enviar a ejecutivo Isapres",
          description:
            "Completa el destino y confirma. Se dejará la nota en el historial.",
          confirmLabel: "Confirmar redirección",
        };
      case "lost":
        return {
          title: "Marcar perdido",
          description:
            "Selecciona el motivo y confirma. Quedará en el historial.",
          confirmLabel: "Confirmar perdido",
        };
      case "other":
        return {
          title: "Registrar nota de agenda",
          description:
            "Escribe el detalle. Se guardará en el historial del cliente.",
          confirmLabel: "Confirmar y guardar nota",
        };
      default:
        return {
          title: "Confirmar gestión",
          description: "Revisa y confirma la acción.",
          confirmLabel: "Confirmar",
        };
    }
  }

  function openCloseAction() {
    const isAlreadyOpen = showCloseForm;
    clearManagementPanels();
    if (isAlreadyOpen) return;
    setShowCloseForm(true);
  }

  async function executePendingConfirm() {
    if (!pendingConfirm || saving || actionBusy) return;
    const action = pendingConfirm;

    try {
      if (action.kind === "save") {
        await handleSave();
        return;
      }
      if (action.kind === "no_contesta") {
        await handleMarkNoAnswer();
        return;
      }
      if (action.kind === "contactado") {
        await handleMarkContacted();
        return;
      }
      if (action.kind === "perdido") {
        await handleMarkLost();
        return;
      }
      if (action.kind === "close") {
        await handleSave({ forceClose: true });
        return;
      }
      if (action.kind === "send_zoom") {
        await handleSendToZoom();
        return;
      }
      if (action.kind === "send_isapres") {
        await handleSendToIsapres();
        return;
      }
      if (action.kind === "confirm_zoom_meeting") {
        await handleConfirmZoomMeeting();
        return;
      }
      await handleRedirect();
    } finally {
      setPendingConfirm(null);
      setFlowActionModal(null);
    }
  }

  function flowActionModalCopy(): {
    title: string;
    description: string;
  } {
    if (flowActionModal === "reschedule") {
      const isPremiumFlow = activeFlow === "premium";
      const hasScheduledCall = Boolean(client?.nextCallAt);
      if (isPremiumFlow) {
        return {
          title: hasScheduledCall ? "Editar reunión Zoom" : "Agendar Zoom",
          description: hasScheduledCall
            ? "Actualiza fecha u hora de la reunión Zoom."
            : "Elige fecha y confirma el agendamiento Zoom.",
        };
      }
      if (rescheduleSource === "premium") {
        return {
          title: hasScheduledCall ? "Editar llamado" : "Agendar llamado",
          description: hasScheduledCall
            ? "Actualiza fecha, canal u hora del llamado."
            : "Elige fecha, canal y confirma el agendamiento.",
        };
      }
      return {
        title: hasScheduledCall ? "Editar reunión Zoom" : "Agendar Zoom",
        description: hasScheduledCall
          ? "Actualiza fecha u hora de la reunión Zoom sin salir de esta vista."
          : "Agenda la reunión Zoom sin salir de esta vista.",
      };
    }
    if (flowActionModal === "redirect") {
      return {
        title:
          activeFlow === "isapres"
            ? "Devolver a Ejecutivo Isapre Premium"
            : "Asignar Ejecutivo Premium",
        description: "Selecciona ejecutivo, canal y fecha de atención solicitada.",
      };
    }
    if (flowActionModal === "recepcionado") {
      return {
        title:
          pipelineStatus === "RECEPCIONADO"
            ? "Registro de recepcionado"
            : "Recepcionado",
        description:
          pipelineStatus === "RECEPCIONADO"
            ? "Consulta o actualiza los datos de recepcionado."
            : "Completa los datos para marcar al cliente como recepcionado.",
      };
    }
    if (flowActionModal === "send_zoom") {
      return {
        title: "Enviar a Ejecutivo Zoom",
        description: "El cliente saldrá de tu cartera Premium.",
      };
    }
    if (flowActionModal === "send_isapres") {
      return {
        title:
          activeFlow === "premium"
            ? "Asignar Ejecutivo Isapre"
            : "Enviar a Ejecutivo Isapres",
        description: "Deriva el cliente para cierre / contratación.",
      };
    }
    if (flowActionModal === "derive") {
      return {
        title: "Derivar cliente",
        description: "Elige si lo envías a Zoom o a Ejecutivo Isapres.",
      };
    }
    if (flowActionModal === "reminder") {
      const hasReminder = Boolean(client?.reminderAt);
      return {
        title: hasReminder ? "Editar recordatorio" : "Agendar recordatorio",
        description:
          "Deja una nota de la gestión y la fecha/hora. Aparecerá en tu calendario.",
      };
    }
    return {
      title: "Cliente perdido",
      description: "Indica el motivo del cierre como perdido.",
    };
  }

  function renderRecepcionadoFormFields() {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium">Isapre *</span>
          <select
            value={closedRecord.isapre}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                isapre: event.target.value,
              }))
            }
            className={joinClasses(
              "h-10 w-full rounded-md px-3 text-sm",
              ui.input,
            )}
          >
            <option value="">Seleccionar…</option>
            {ISAPRE_FILTER_OPTIONS.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
            {closedRecord.isapre &&
            !ISAPRE_FILTER_OPTIONS.some(
              (option) => option.label === closedRecord.isapre,
            ) ? (
              <option value={closedRecord.isapre}>
                {closedRecord.isapre}
              </option>
            ) : null}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Código plan</span>
          <Input
            value={closedRecord.planCode ?? ""}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                planCode: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Nombre plan</span>
          <Input
            value={closedRecord.planName ?? ""}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                planName: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Fecha *</span>
          <Input
            type="date"
            value={closedRecord.closedAt}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                closedAt: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Nº solicitud Isapre</span>
          <Input
            value={closedRecord.isapreReference ?? ""}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                isapreReference: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Precio final UF</span>
          <Input
            value={closedRecord.finalPriceUf ?? ""}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                finalPriceUf: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Precio final CLP</span>
          <Input
            value={closedRecord.finalPriceClp ?? ""}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                finalPriceClp: event.target.value,
              }))
            }
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs font-medium">Notas</span>
          <textarea
            value={closedRecord.notes ?? ""}
            onChange={(event) =>
              setClosedRecord((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            rows={3}
            className={joinClasses(
              "w-full rounded-xl px-3 py-2 text-sm",
              ui.input,
            )}
          />
        </label>
      </div>
    );
  }

  function renderFlowActionModalBody() {
    if (!client) return null;

    if (flowActionModal === "recepcionado") {
      return <div className="space-y-3">{renderRecepcionadoFormFields()}</div>;
    }

    if (flowActionModal === "reminder") {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Gestión / nota *</span>
            <textarea
              value={reminderNoteLocal}
              onChange={(event) => setReminderNoteLocal(event.target.value)}
              rows={3}
              placeholder="Ej. Llamar al cliente a las 20:00 para revisar cotización"
              className={joinClasses(
                "min-h-[5rem] w-full resize-y rounded-xl px-3 py-2.5 text-sm",
                ui.input,
              )}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Fecha y hora *</span>
            <Input
              type="datetime-local"
              required
              value={reminderAtLocal}
              onChange={(event) => setReminderAtLocal(event.target.value)}
            />
          </label>
          <RescheduleDayAgenda
            enabled
            nextCallLocal={reminderAtLocal}
            excludeClientId={client.id}
          />
          <p className="text-[11px] text-muted">
            El recordatorio no reemplaza la reunión Zoom ni el próximo llamado;
            es una gestión aparte en el calendario.
          </p>
        </div>
      );
    }

    if (flowActionModal === "derive") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="info"
            className="h-auto justify-start px-4 py-3 text-left"
            onClick={() => {
              openPremiumAction("send_zoom");
              openFlowActionModal("send_zoom");
            }}
          >
            Enviar a Ejecutivo Zoom
          </Button>
          <Button
            type="button"
            variant="success"
            className="h-auto justify-start px-4 py-3 text-left"
            onClick={() => {
              openPremiumAction("send_isapres");
              openFlowActionModal("send_isapres");
            }}
          >
            Enviar a Ejecutivo Isapres
          </Button>
        </div>
      );
    }

    if (flowActionModal === "reschedule" && showReschedule) {
      if (rescheduleSource === "zoom") {
        return (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Fecha y hora *</span>
              <Input
                type="datetime-local"
                required
                value={nextCallLocal}
                onChange={(event) => setNextCallLocal(event.target.value)}
              />
            </label>
            <RescheduleDayAgenda
              enabled={showReschedule}
              nextCallLocal={nextCallLocal}
              excludeClientId={client.id}
            />
            {renderCalendlyZoomPanel("reschedule")}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Nota (opcional)</span>
              <Input
                value={rescheduleNote}
                onChange={(event) => setRescheduleNote(event.target.value)}
                placeholder="Ej. Cliente pidió llamar en la tarde"
              />
            </label>
          </div>
        );
      }
      if (rescheduleSource === "premium") {
        return (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Fecha y hora *</span>
              <Input
                type="datetime-local"
                required
                value={nextCallLocal}
                onChange={(event) => setNextCallLocal(event.target.value)}
              />
            </label>
            <RescheduleDayAgenda
              enabled={showReschedule}
              nextCallLocal={nextCallLocal}
              excludeClientId={client.id}
            />
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-foreground">
                Canal de la reunión *
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CLIENT_CONTACT_METHOD_OPTIONS.map((option) => {
                  const selected = rescheduleContactMethod === option.value;
                  return (
                    <label
                      key={option.value}
                      className={joinClasses(
                        "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                        selected
                          ? option.value === "WHATSAPP"
                            ? "border-[#25D366] bg-[#25D366]/10 ring-1 ring-[#25D366]/30"
                            : "border-sky-400 bg-sky-50 ring-1 ring-sky-300/50"
                          : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                      )}
                    >
                      <input
                        type="radio"
                        name="flow-reschedule-contact-method"
                        className="mt-0.5"
                        checked={selected}
                        onChange={() =>
                          setRescheduleContactMethod(option.value)
                        }
                      />
                      <span>
                        <span className="block text-xs font-semibold text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {option.value === "WHATSAPP"
                            ? "Aparecerá en verde en tu calendario."
                            : "Aparecerá en azul en tu calendario."}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {rescheduleContactMethod === "ZOOM"
              ? renderCalendlyZoomPanel("reschedule")
              : null}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Nota (opcional)</span>
              <Input
                value={rescheduleNote}
                onChange={(event) => setRescheduleNote(event.target.value)}
                placeholder="Ej. Cliente pidió llamar en la tarde"
              />
            </label>
          </div>
        );
      }
    }

    if (flowActionModal === "redirect" && showRedirect) {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Ejecutivo Isapres Premium</span>
            <Select
              value={redirectTargetId}
              placeholder="Selecciona un ejecutivo…"
              options={premiumExecutives.map((executive) => ({
                value: executive.id,
                label: `${formatExecutiveOptionLabel({
                  fullName: executive.fullName,
                  executiveKind: executive.executiveKind,
                  realm: executive.realm,
                })} (${executive.email})`,
              }))}
              onChange={(event) => setRedirectTargetId(event.target.value)}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">
              Método de contacto *
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CLIENT_CONTACT_METHOD_OPTIONS.map((option) => {
                const selected = redirectContactMethod === option.value;
                return (
                  <label
                    key={option.value}
                    className={joinClasses(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                      selected
                        ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                        : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                    )}
                  >
                    <input
                      type="radio"
                      name="flow-redirect-contact-method"
                      className="mt-0.5"
                      checked={selected}
                      onChange={() => setRedirectContactMethod(option.value)}
                    />
                    <span>
                      <span className="block text-xs font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {redirectContactMethod === "ZOOM"
            ? renderCalendlyZoomPanel("redirect")
            : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">
              Fecha y hora de atención solicitada *
            </span>
            <Input
              type="datetime-local"
              required
              value={redirectAppointmentLocal}
              onChange={(event) =>
                setRedirectAppointmentLocal(event.target.value)
              }
            />
          </label>
        </div>
      );
    }

    if (flowActionModal === "send_zoom" && showSendToZoom) {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Ejecutivo Zoom</span>
            <Select
              value={sendZoomTargetId}
              placeholder="Selecciona un ejecutivo Zoom…"
              options={zoomExecutives.map((executive) => ({
                value: executive.id,
                label: `${formatExecutiveOptionLabel({
                  fullName: executive.fullName,
                  executiveKind: executive.executiveKind,
                  realm: executive.realm,
                })} (${executive.email})`,
              }))}
              onChange={(event) => setSendZoomTargetId(event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (flowActionModal === "send_isapres" && showSendToIsapres) {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Ejecutivo Isapres</span>
            <Select
              value={sendIsapresTargetId}
              placeholder="Selecciona un ejecutivo Isapres…"
              options={isapresExecutives.map((executive) => ({
                value: executive.id,
                label: `${formatExecutiveOptionLabel({
                  fullName: executive.fullName,
                  executiveKind: executive.executiveKind,
                  realm: executive.realm,
                })} (${executive.email})`,
              }))}
              onChange={(event) => setSendIsapresTargetId(event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (flowActionModal === "lost" && showLost) {
      return (
        <LostReasonFields
          lostReason={lostReason}
          lostReasonOther={lostReasonOther}
          onReasonChange={setLostReason}
          onOtherChange={setLostReasonOther}
          saveButtonLabel={saveButtonLabel}
        />
      );
    }

    return (
      <p className="text-sm text-muted">No hay acción disponible.</p>
    );
  }

  const scheduleIsZoom = isZoomScheduleAction({
    activeFlow,
    rescheduleSource,
    rescheduleContactMethod,
    preferredContactMethod: client?.preferredContactMethod,
  });

  const saveButtonLabel = showSendToZoom
    ? "Confirmar envío a Zoom"
    : showSendToIsapres
      ? "Confirmar envío a Isapres"
      : showLost
        ? "Confirmar perdido"
        : showReschedule
          ? scheduleIsZoom
            ? client?.nextCallAt
              ? "Guardar edición Zoom"
              : "Guardar agendamiento Zoom"
            : client?.nextCallAt
              ? "Guardar reagendamiento"
              : "Guardar agendamiento"
          : showRedirect
            ? "Confirmar redirección"
            : showNoAnswer
              ? "Confirmar No contesta"
              : showCloseForm && pipelineStatus !== "RECEPCIONADO"
                ? "Confirmar recepcionado"
                : "Guardar cambios";

  return (
    <>
    {variant === "modal" ? (
    <AdminFormModal
      open={open}
      onClose={onClose}
      title={client.fullName}
      description={getManagementDescription({ isZoom, isIsapres, isPremium })}
      size="xl"
    >
      {renderManagementBody()}
    </AdminFormModal>
    ) : open ? (
      <div className={activeFlow && isOperationsLayout ? "" : "space-y-5"}>
        {isOperationsLayout ? (
          activeFlow === "seguimiento" ? (
            <ClientSeguimientoFlowView
              client={client}
              pipelineStatus={pipelineStatus}
              pipelineNotes={pipelineNotes}
              canViewInternalNotes={canViewInternalNotes}
              isTrackingOnly={isTrackingOnly}
              onBack={() => setActiveFlow(null)}
            />
          ) : activeFlow ? (
            <ClientProtocoloFlowView
              client={client}
              activeFlow={activeFlow}
              profileForm={profileForm}
              onProfileChange={setProfileForm}
              pipelineStatus={pipelineStatus}
              onManualStatusChange={async (nextStatus, note) => {
                if (!client || saving || actionBusy) return;
                setActionBusy(true);
                try {
                  const updated = await updateClientPipeline(client.id, {
                    pipelineStatus: nextStatus,
                    manualStatusChange: true,
                    statusChangeNote: note,
                  });
                  setPipelineStatus(updated.pipelineStatus ?? nextStatus);
                  if (canViewInternalNotes) {
                    setPipelineNotes(updated.pipelineNotes ?? "");
                  }
                  setShowCloseForm(
                    (updated.pipelineStatus ?? nextStatus) === "RECEPCIONADO",
                  );
                  onUpdated(updated);
                  onNotify("Estatus actualizado.");
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "No se pudo cambiar el estatus.";
                  onNotify(message, "error");
                  throw error instanceof Error ? error : new Error(message);
                } finally {
                  setActionBusy(false);
                }
              }}
              meetingNote={meetingNote}
              onMeetingNoteChange={setMeetingNote}
              canEdit={canEditClientData && !saving && !actionBusy}
              saving={saving}
              actionBusy={actionBusy}
              hasUnsavedChanges={hasUnsavedChanges}
              whatsappUrl={whatsappUrl}
              canManageZoom={canManageZoom}
              canManagePremium={canManagePremium}
              canManageIsapres={canManageIsapres}
              onBack={() => setActiveFlow(null)}
              onSave={() => void handleSave({ forceClose: false })}
              onWhatsApp={() => {
                if (!whatsappUrl) return;
                void markContactedFromWhatsApp();
                window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              }}
              onScheduleZoom={() => {
                if (saving || actionBusy) return;
                clearManagementPanels();
                prepareAgendaReschedulePanels();
                openFlowActionModal("reschedule");
              }}
              onCallback={() => {
                if (saving || actionBusy) return;
                clearManagementPanels();
                prepareAgendaReschedulePanels();
                openFlowActionModal("reschedule");
              }}
              onReminder={() => {
                if (saving || actionBusy) return;
                clearManagementPanels();
                openFlowActionModal("reminder");
              }}
              onRedirectPremium={() => {
                if (saving || actionBusy) return;
                // Vista Zoom o Isapre → asignar / redirigir a Premium
                if (
                  activeFlow === "zoom" ||
                  activeFlow === "isapres" ||
                  canManageZoom ||
                  canManageIsapres
                ) {
                  clearManagementPanels();
                  setShowRedirect(true);
                  openFlowActionModal("redirect");
                  return;
                }
                if (canManagePremium) {
                  clearManagementPanels();
                  openFlowActionModal("derive");
                  return;
                }
                onNotify(
                  "No tienes permiso para redirigir este cliente.",
                  "error",
                );
              }}
              onSendToZoom={() => {
                if (saving || actionBusy) return;
                clearManagementPanels();
                openPremiumAction("send_zoom");
                openFlowActionModal("send_zoom");
              }}
              onSendToIsapres={() => {
                if (saving || actionBusy) return;
                clearManagementPanels();
                openPremiumAction("send_isapres");
                openFlowActionModal("send_isapres");
              }}
              onMarkLost={() => {
                if (saving || actionBusy) return;
                openLostAction();
                openFlowActionModal("lost");
              }}
              onRecepcionado={() => {
                if (saving || actionBusy) return;
                openRecepcionadoAction();
              }}
              onConfirmZoomMeeting={() => {
                if (saving || actionBusy) return;
                if (!client.confirmationCallAt && !client.nextCallAt) {
                  onNotify(
                    "No hay una reunión Zoom agendada para confirmar.",
                    "error",
                  );
                  return;
                }
                setConfirmZoomNote("");
                setPendingConfirm({ kind: "confirm_zoom_meeting" });
              }}
              onAddTitular={() => {
                if (saving || actionBusy) return;
                onFichaModalChange?.("addTitular");
              }}
              onAddCarga={() => {
                if (saving || actionBusy) return;
                onFichaModalChange?.("addCarga");
              }}
              onOpenFichaModal={(modal) => {
                if (saving || actionBusy) return;
                onFichaModalChange?.(modal);
              }}
              onNotify={onNotify}
            />
          ) : (
            <ClientPipelineRoleCard
              selectedId={activeFlow}
              onSelect={setActiveFlow}
            />
          )
        ) : null}
        {isOperationsLayout ? null : (
        <div
          id="client-gestion-operativa"
          className={joinClasses(
            "rounded-2xl border bg-white p-4 shadow-card sm:p-6",
            ui.border,
          )}
        >
          {renderManagementBody()}
        </div>
        )}
      </div>
    ) : null}

    <div className="relative z-[80]">
      <AdminFormModal
        open={Boolean(pendingConfirm && confirmCopy)}
        title={confirmCopy?.title ?? "Confirmar"}
        description={confirmCopy?.description}
        onClose={() => {
          if (saving || actionBusy) return;
          setPendingConfirm(null);
          setConfirmZoomNote("");
        }}
        size="md"
        overlayClassName="z-[80]"
      >
        <div className="space-y-4">
          {confirmCopy?.changes?.length ? (
            <ul className="space-y-1.5 rounded-xl border border-border bg-bg-layout/40 px-3 py-3 text-sm text-foreground">
              {confirmCopy.changes.map((change) => (
                <li key={change} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {pendingConfirm?.kind === "confirm_zoom_meeting" ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">
                Nota (opcional)
              </span>
              <Input
                value={confirmZoomNote}
                disabled={saving || actionBusy}
                onChange={(event) => setConfirmZoomNote(event.target.value)}
                placeholder="Ej. Cliente confirmó asistencia, pidió link Zoom…"
              />
              <p className="text-[11px] text-muted">
                Si agregas una nota, se guarda en Anotaciones del cliente.
              </p>
            </label>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={saving || actionBusy}
              onClick={() => {
                setPendingConfirm(null);
                setConfirmZoomNote("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || actionBusy}
              onClick={() => void executePendingConfirm()}
            >
              {saving || actionBusy ? "Procesando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      </AdminFormModal>
    </div>

    <div className="relative z-[60]">
      <AdminFormModal
        open={Boolean(agendaActionModal)}
        title={agendaActionModalCopy().title}
        description={agendaActionModalCopy().description}
        onClose={() => closeAgendaActionModal()}
        size={
          agendaActionModal?.outcome === "reschedule" ||
          agendaActionModal?.outcome === "redirect"
            ? "xl"
            : "lg"
        }
      >
        <div className="space-y-4">
          {renderAgendaActionModalBody()}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={saving || actionBusy}
              onClick={() => closeAgendaActionModal()}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || actionBusy}
              onClick={() => void confirmAgendaActionModal()}
            >
              {saving || actionBusy
                ? "Procesando…"
                : agendaActionModalCopy().confirmLabel}
            </Button>
          </div>
        </div>
      </AdminFormModal>
    </div>

    <div className="relative z-[60]">
      <AdminFormModal
        open={Boolean(flowActionModal)}
        title={flowActionModalCopy().title}
        description={flowActionModalCopy().description}
        onClose={() => {
          if (saving || actionBusy) return;
          closeFlowActionModal();
        }}
        size={
          flowActionModal === "reschedule" || flowActionModal === "redirect"
            ? "xl"
            : "lg"
        }
        headerTone="navy"
        overlayClassName="z-[60]"
      >
        <div className="space-y-4">
          <fieldset
            disabled={saving || actionBusy}
            className="min-w-0 space-y-4 border-0 p-0 disabled:pointer-events-none disabled:opacity-60"
          >
            {renderFlowActionModalBody()}
          </fieldset>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={saving || actionBusy}
              onClick={() => closeFlowActionModal()}
            >
              {flowActionModal === "derive" ? "Cerrar" : "Cancelar"}
            </Button>
            {flowActionModal !== "derive" ? (
              <Button
                type="button"
                disabled={saving || actionBusy}
                onClick={() => {
                  if (flowActionModal === "reminder") {
                    void handleSaveReminder();
                    return;
                  }
                  if (flowActionModal === "recepcionado") {
                    if (pipelineStatus === "RECEPCIONADO") {
                      void handleSave({ forceClose: true });
                      return;
                    }
                    requestCloseConfirm();
                    return;
                  }
                  requestSaveConfirm();
                }}
              >
                {saving || actionBusy
                  ? "Guardando…"
                  : flowActionModal === "reminder"
                    ? "Guardar recordatorio"
                    : flowActionModal === "recepcionado"
                      ? pipelineStatus === "RECEPCIONADO"
                        ? "Guardar recepcionado"
                        : "Confirmar recepcionado"
                      : saveButtonLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>
    </div>

    <div className="relative z-[60]">
      <AdminFormModal
        open={Boolean(client && fichaModal === "employer")}
        title="Empleador"
        description="Calidad de cliente, RUT del empleador, convenio y renta imponible."
        onClose={() => onFichaModalChange?.(null)}
        size="lg"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["employer"]}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "personal")}
        title="Información personal"
        description="Datos del titular principal."
        onClose={() => onFichaModalChange?.(null)}
        size="lg"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["principal"]}
            showEmail
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
              if (rutErrors.titular) setRutErrors({});
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "prevision")}
        title="Previsión actual"
        description="Isapre, Fonasa o sin previsión, precio del plan y anualidad."
        onClose={() => onFichaModalChange?.(null)}
        size="lg"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["prevision"]}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "complementaria")}
        title="Información complementaria"
        description="Seguro complementario, clínicas de preferencia y preexistencias."
        onClose={() => onFichaModalChange?.(null)}
        size="lg"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["complementaria"]}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "family")}
        title="Grupo familiar"
        description="Titulares y cargas del grupo familiar."
        onClose={() => onFichaModalChange?.(null)}
        size="xl"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["titulares", "cargas"]}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
              if (
                rutErrors.titular ||
                rutErrors.dependents ||
                rutErrors.additionalTitulares
              ) {
                setRutErrors({});
              }
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "addTitular")}
        title="Agregar titular"
        description="Completa los datos del titular adicional."
        onClose={() => {
          onPendingFamilyAddConsumed?.();
          onFichaModalChange?.(null);
        }}
        size="xl"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["titulares"]}
            autoAdd={pendingFamilyAdd === "titular" ? "titular" : null}
            onAutoAddConsumed={onPendingFamilyAddConsumed}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
              if (
                rutErrors.titular ||
                rutErrors.dependents ||
                rutErrors.additionalTitulares
              ) {
                setRutErrors({});
              }
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onPendingFamilyAddConsumed?.();
                onFichaModalChange?.(null);
              }}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar titular"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "addCarga")}
        title="Agregar carga"
        description="Completa los datos de la carga (dependiente)."
        onClose={() => {
          onPendingFamilyAddConsumed?.();
          onFichaModalChange?.(null);
        }}
        size="xl"
        headerTone="navy"
      >
        <div className="space-y-4">
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            sections={["cargas"]}
            autoAdd={pendingFamilyAdd === "carga" ? "carga" : null}
            onAutoAddConsumed={onPendingFamilyAddConsumed}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
              if (
                rutErrors.titular ||
                rutErrors.dependents ||
                rutErrors.additionalTitulares
              ) {
                setRutErrors({});
              }
            }}
            rutErrors={rutErrors}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onPendingFamilyAddConsumed?.();
                onFichaModalChange?.(null);
              }}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar carga"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "plan")}
        title="Plan elegido"
        description="Plan asesorado o cotizado para este cliente."
        onClose={() => onFichaModalChange?.(null)}
        size="xl"
        headerTone="navy"
      >
        <div className="space-y-4">
          {client && canEditClientData ? (
            <ClientAdvisedPlanSection
              client={client}
              onUpdated={onUpdated}
              onNotify={onNotify}
              bare
            />
          ) : client ? (
            <div>
              {client.advisedPlan || client.requestedPlan ? (
                <ClientPlanSummary
                  requestedPlan={client.requestedPlan}
                  advisedPlan={client.advisedPlan}
                />
              ) : (
                <p className="text-sm text-muted">Sin plan registrado.</p>
              )}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "docs")}
        title="Archivos adjuntos"
        description="Checklist de recepción y archivos del cliente."
        onClose={() => onFichaModalChange?.(null)}
        size="xl"
        headerTone="navy"
      >
        <div className="space-y-4">
          {canEditClientData ? (
            <ul className="space-y-2">
              {checklist.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-0.5 size-4 rounded border-border text-primary"
                    />
                    <span
                      className={joinClasses(
                        "block text-sm",
                        item.checked
                          ? "text-muted line-through"
                          : "text-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Solo lectura: no puedes marcar documentos en seguimiento.
            </p>
          )}
          {client ? (
            <ClientDocumentsSection
              clientId={client.id}
              canEdit={canEditClientData}
              onNotify={onNotify}
              bare
            />
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveFichaModal()}
              >
                {saving ? "Guardando…" : "Guardar checklist"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "historial")}
        title="Historial de modificaciones"
        description="Solo lectura. Movimientos del sistema: reagendar, contacto, redirecciones y cierres (sin notas libres)."
        onClose={() => onFichaModalChange?.(null)}
        size="lg"
        headerTone="navy"
      >
        <div className="space-y-4">
          {canViewInternalNotes ? (
            (() => {
              const modificationLines = listPipelineModificationLines(
                pipelineNotes,
              );
              return modificationLines.length > 0 ? (
                <div
                  className="max-h-[min(28rem,70vh)] overflow-y-auto text-sm text-foreground"
                  role="log"
                  aria-label="Historial de modificaciones"
                >
                  <ul className="space-y-2">
                    {modificationLines.map((line, index) => (
                      <li
                        key={`${index}-${line.slice(0, 24)}`}
                        className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                      >
                        <p className="whitespace-pre-wrap text-[13px] leading-snug">
                          {line}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Sin movimientos registrados aún.
                </p>
              );
            })()
          ) : (
            <p className="text-sm text-muted">
              No tienes permiso para ver el historial interno de este cliente.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(client && fichaModal === "notas")}
        title="Anotaciones"
        description="Anotaciones libres del ejecutivo. Distintas del historial de modificaciones."
        onClose={() => onFichaModalChange?.(null)}
        size="lg"
        headerTone="navy"
      >
        <div className="space-y-4">
          {canViewInternalNotes ? (
            (() => {
              const noteLines = listClientNoteLines(pipelineNotes);
              return noteLines.length > 0 ? (
                <div
                  className="max-h-[min(18rem,45vh)] overflow-y-auto rounded-xl border border-border bg-bg-layout/40 px-3 py-2.5"
                  role="log"
                  aria-label="Notas del cliente"
                >
                  <ul className="space-y-3">
                    {noteLines.map((line, index) => {
                      const stamp = extractPipelineNoteStamp(line);
                      const text = clientNoteDisplayText(line);
                      return (
                        <li
                          key={`${index}-${line.slice(0, 32)}`}
                          className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                        >
                          {stamp ? (
                            <p className="text-[11px] font-semibold text-primary-dark">
                              {stamp}
                            </p>
                          ) : null}
                          <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-foreground">
                            {text || line}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
                  Aún no hay notas. Agrega la primera abajo.
                </p>
              );
            })()
          ) : (
            <p className="text-sm text-muted">
              No tienes permiso para ver las notas de este cliente.
            </p>
          )}

          {canEditClientData ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-primary-dark">
                Nueva nota
              </span>
              <textarea
                value={meetingNote}
                onChange={(event) => setMeetingNote(event.target.value)}
                rows={5}
                placeholder="Ej. Cliente interesado en bajar costo; enviará liquidaciones mañana. Prefiere WhatsApp…"
                className={joinClasses(
                  "min-h-[7rem] w-full resize-y rounded-xl px-3 py-2.5 text-sm",
                  ui.input,
                )}
              />
              <p className="text-[11px] text-muted">
                Se guarda con tu nombre y la fecha. No modifica el historial de
                movimientos del sistema.
              </p>
            </label>
          ) : canViewInternalNotes ? (
            <p className="text-sm text-muted">
              Solo lectura: no puedes agregar notas en este cliente.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFichaModalChange?.(null)}
            >
              Cerrar
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving || !meetingNote.trim()}
                onClick={() => void handleSaveMeetingNoteModal()}
              >
                {saving ? "Guardando…" : "Guardar nota"}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminFormModal>
    </div>
    </>
  );

  function renderAgendaActionModalBody() {
    if (!client || !agendaActionModal) return null;
    const { item, outcome } = agendaActionModal;

    if (outcome === "completed") {
      return (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Gestión: <span className="font-semibold">{item.title}</span>
            {item.whenLabel ? (
              <span className="text-muted"> · {item.whenLabel}</span>
            ) : null}
          </p>
          {item.responsibleName ? (
            <p className="text-xs text-muted">
              Responsable:{" "}
              <span className="font-semibold text-foreground">
                {item.responsibleName}
              </span>
              {item.responsibleRole ? ` · ${item.responsibleRole}` : ""}
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">
              ¿Cómo contactaste al cliente? *
            </span>
            <Select
              value={agendaReachCode}
              placeholder="Selecciona…"
              options={AGENDA_REACH_OPTIONS}
              onChange={(event) => setAgendaReachCode(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">
              Detalle
              {agendaReachCode === "otro" ? " *" : " (opcional)"}
            </span>
            <Input
              value={agendaReachNote}
              placeholder="Ej. Aceptó cotización, pidió llamar mañana, quedó de revisar con pareja…"
              onChange={(event) => setAgendaReachNote(event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (outcome === "other") {
      return (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Nota para el historial *</span>
          <Input
            value={agendaOtherNotes[item.id] ?? ""}
            placeholder="Describe qué ocurrió…"
            onChange={(event) =>
              setAgendaOtherNotes((prev) => ({
                ...prev,
                [item.id]: event.target.value,
              }))
            }
          />
        </label>
      );
    }

    if (outcome === "reschedule") {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Fecha y hora *</span>
            <Input
              type="datetime-local"
              required
              value={nextCallLocal}
              onChange={(event) => setNextCallLocal(event.target.value)}
            />
          </label>
          <RescheduleDayAgenda
            enabled
            nextCallLocal={nextCallLocal}
            excludeClientId={client.id}
          />
          {rescheduleSource === "premium" ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-foreground">
                Canal de la reunión *
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CLIENT_CONTACT_METHOD_OPTIONS.map((option) => {
                  const selected = rescheduleContactMethod === option.value;
                  return (
                    <label
                      key={option.value}
                      className={joinClasses(
                        "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                        selected
                          ? option.value === "WHATSAPP"
                            ? "border-[#25D366] bg-[#25D366]/10 ring-1 ring-[#25D366]/30"
                            : "border-sky-400 bg-sky-50 ring-1 ring-sky-300/50"
                          : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                      )}
                    >
                      <input
                        type="radio"
                        name="agenda-reschedule-contact-method"
                        className="mt-0.5"
                        checked={selected}
                        onChange={() => setRescheduleContactMethod(option.value)}
                      />
                      <span>
                        <span className="block text-xs font-semibold text-foreground">
                          {option.label}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          {rescheduleSource === "zoom" || rescheduleContactMethod === "ZOOM"
            ? renderCalendlyZoomPanel("reschedule")
            : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Nota (opcional)</span>
            <Input
              value={rescheduleNote}
              onChange={(event) => setRescheduleNote(event.target.value)}
              placeholder="Ej. Cliente pidió llamar en la tarde"
            />
          </label>
        </div>
      );
    }

    if (outcome === "redirect" && showRedirect) {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">
              Ejecutivo Isapres Premium *
            </span>
            <Select
              value={redirectTargetId}
              placeholder="Selecciona un ejecutivo…"
              options={premiumExecutives.map((executive) => ({
                value: executive.id,
                label: `${formatExecutiveOptionLabel({
                  fullName: executive.fullName,
                  executiveKind: executive.executiveKind,
                  realm: executive.realm,
                })} (${executive.email})`,
              }))}
              onChange={(event) => setRedirectTargetId(event.target.value)}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">
              Método de contacto *
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CLIENT_CONTACT_METHOD_OPTIONS.map((option) => {
                const selected = redirectContactMethod === option.value;
                return (
                  <label
                    key={option.value}
                    className={joinClasses(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                      selected
                        ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                        : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                    )}
                  >
                    <input
                      type="radio"
                      name="agenda-redirect-contact-method"
                      className="mt-0.5"
                      checked={selected}
                      onChange={() => setRedirectContactMethod(option.value)}
                    />
                    <span>
                      <span className="block text-xs font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {redirectContactMethod === "ZOOM"
            ? renderCalendlyZoomPanel("redirect")
            : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">
              Fecha y hora de atención solicitada *
            </span>
            <Input
              type="datetime-local"
              required
              value={redirectAppointmentLocal}
              onChange={(event) =>
                setRedirectAppointmentLocal(event.target.value)
              }
            />
          </label>
        </div>
      );
    }

    if (outcome === "redirect" && showSendToIsapres) {
      return (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Ejecutivo Isapres *</span>
            <Select
              value={sendIsapresTargetId}
              placeholder="Selecciona un ejecutivo Isapres…"
              options={isapresExecutives.map((executive) => ({
                value: executive.id,
                label: `${formatExecutiveOptionLabel({
                  fullName: executive.fullName,
                  executiveKind: executive.executiveKind,
                  realm: executive.realm,
                })} (${executive.email})`,
              }))}
              onChange={(event) => setSendIsapresTargetId(event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (outcome === "lost") {
      return (
        <LostReasonFields
          lostReason={lostReason}
          lostReasonOther={lostReasonOther}
          onReasonChange={setLostReason}
          onOtherChange={setLostReasonOther}
          saveButtonLabel="Confirmar perdido"
        />
      );
    }

    return null;
  }

  function renderAgendaCard() {
    if (!client) return null;
    const pendingItems = buildClientAgendaItems({
      client,
      isTrackingOnly,
    }).map((item) =>
      agendaDoneIds[item.id] ? { ...item, urgency: "done" as const, required: false } : item,
    );
    const pendingIds = new Set(pendingItems.map((item) => item.id));
    const completedOnly = agendaCompletedSnapshots.filter(
      (item) => !pendingIds.has(item.id),
    );
    const agendaItems = [...pendingItems, ...completedOnly];

    return (
      <div
        className={joinClasses(
          "rounded-2xl border bg-white p-4 shadow-card sm:p-6",
          ui.border,
        )}
      >
        <div className="mb-4 border-b border-primary-dark/10 pb-3">
          <h2 className="text-sm font-semibold text-primary-dark">Agenda</h2>
          <p className="mt-1 text-xs text-muted">
            Acciones obligatorias: rojo si vencida, amarillo si es hoy, verde si
            ya se hizo.
          </p>
        </div>

        {agendaItems.length > 0 ? (
          <ul className="space-y-2.5">
            {agendaItems.map((item) => {
              const badge = agendaUrgencyBadge(item.urgency);
              const selectedOutcome = agendaOutcomes[item.id] ?? "";
              const isDone = item.urgency === "done";
              const canAct =
                !isDone &&
                !isTrackingOnly &&
                (canManageZoom || canManagePremium || canManageIsapres);
              const outcomeOptions = item.outcomeOptions.filter((option) => {
                if (option.value === "redirect") {
                  return canManageZoom || canManagePremium;
                }
                if (option.value === "lost") {
                  return canManageZoom || canManagePremium || canManageIsapres;
                }
                if (option.value === "reschedule") {
                  return canManageZoom || canManagePremium;
                }
                return true;
              });

              return (
                <li
                  key={item.id}
                  className={joinClasses(
                    "rounded-xl border px-3.5 py-3",
                    agendaUrgencyClasses(item.urgency),
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        {item.required && !isDone ? (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground ring-1 ring-border">
                            Obligatoria
                          </span>
                        ) : null}
                        {item.channelLabel ? (
                          <span
                            className={joinClasses(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              item.channelLabel === "WhatsApp"
                                ? "bg-[#25D366]/15 text-[#128C7E] ring-1 ring-[#25D366]/35"
                                : item.channelLabel === "Recordatorio"
                                  ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300/60"
                                  : "bg-sky-100 text-sky-900 ring-1 ring-sky-300/50",
                            )}
                          >
                            {item.channelLabel}
                          </span>
                        ) : null}
                        {badge ? (
                          <span
                            className={joinClasses(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              badge.className,
                            )}
                          >
                            {badge.label}
                          </span>
                        ) : null}
                      </div>
                      {item.whenLabel ? (
                        <p className="text-xs font-medium tabular-nums text-foreground/90">
                          {item.whenLabel}
                        </p>
                      ) : null}
                      {item.responsibleName ? (
                        <p className="text-xs text-foreground/90">
                          <span className="text-muted">Responsable: </span>
                          <span className="font-semibold">
                            {item.responsibleName}
                          </span>
                          {item.responsibleRole ? (
                            <span className="text-muted">
                              {" "}
                              · {item.responsibleRole}
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">
                          Responsable: sin ejecutivo asignado
                        </p>
                      )}
                      {item.detail ? (
                        <p className="text-xs text-muted">{item.detail}</p>
                      ) : null}
                      {item.zoomJoinUrl && !isDone ? (
                        <a
                          href={item.zoomJoinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-xs font-semibold text-sky-900 underline underline-offset-2"
                        >
                          Unirse a Zoom
                        </a>
                      ) : null}
                    </div>

                    <div className="w-full shrink-0 space-y-2 lg:w-64">
                      {canAct && outcomeOptions.length > 0 ? (
                        <label className="block space-y-1">
                          <span className="text-[11px] font-medium text-muted">
                            Resultado de la gestión
                          </span>
                          <Select
                            value={selectedOutcome}
                            placeholder="Selecciona resultado…"
                            disabled={actionBusy || Boolean(agendaActionModal)}
                            options={outcomeOptions}
                            onChange={(event) =>
                              handleAgendaOutcomeChange(
                                item,
                                event.target.value as AgendaOutcomeValue | "",
                              )
                            }
                            className="h-9"
                          />
                        </label>
                      ) : isDone ? (
                        <p className="text-xs font-medium text-emerald-800 lg:text-right">
                          Gestión realizada
                        </p>
                      ) : isTrackingOnly ? (
                        <p className="text-xs text-muted lg:text-right">
                          Solo seguimiento
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-transparent px-3 py-4 text-xs text-muted">
            Sin gestiones pendientes en agenda. Usa Gestión operativa para
            reagendar, derivar o registrar contacto.
          </p>
        )}
      </div>
    );
  }

  function renderManagementBody() {
    if (!client) return null;

    return (
      <div className="space-y-6">
        {!isOperationsLayout && (isTrackingOnly || confirmationCallLabel) ? (
          <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-950">
                {isTrackingOnly
                  ? "Seguimiento post-derivación"
                  : "Confirmación Zoom"}
              </h3>
              <p className="mt-1 text-xs text-amber-900/80">
                {isTrackingOnly
                  ? "Este cliente está a cargo de otro ejecutivo. Mantén el seguimiento hasta el cierre y confirma la reunión ~10 min antes."
                  : `Llama al cliente ~${CONFIRMATION_CALL_LEAD_MINUTES} minutos antes de la reunión Premium para recordarle.`}
              </p>
            </div>
            {client.assignedExecutiveName ? (
              <p className="text-xs text-amber-950/90">
                Ejecutivo a cargo:{" "}
                <span className="font-semibold">
                  {client.assignedExecutiveName}
                </span>
              </p>
            ) : null}
            {confirmationCallLabel ? (
              <p className="text-xs font-medium text-amber-950">
                Confirmación agendada: {confirmationCallLabel}
              </p>
            ) : null}
            {nextCallLabel ? (
              <p className="text-xs text-amber-900/80">
                Reunión Premium: {nextCallLabel}
              </p>
            ) : null}
            {confirmationCallLabel ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={actionBusy}
                onClick={() => void handleMarkConfirmationCall()}
              >
                Marcar confirmación realizada
              </Button>
            ) : isTrackingOnly ? (
              <p className="text-[11px] text-amber-900/70">
                Sin confirmación pendiente. El cliente sigue visible hasta
                Cerrado o Perdido.
              </p>
            ) : null}
          </div>
        ) : null}

        {showFullSections ? (
          canEditClientData ? (
            <ClientAdvisedPlanSection
              client={client}
              onUpdated={onUpdated}
              onNotify={onNotify}
            />
          ) : (
            <div className="rounded-xl border border-border bg-bg-layout/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Plan asesorado
              </p>
              <div className="mt-2">
                {client.advisedPlan || client.requestedPlan ? (
                  <ClientPlanSummary
                    requestedPlan={client.requestedPlan}
                    advisedPlan={client.advisedPlan}
                    compact
                  />
                ) : (
                  <p className="text-sm text-muted">Sin plan registrado.</p>
                )}
              </div>
            </div>
          )
        ) : null}

        {showFullSections ? (
          <ClientProfileForm
            value={profileForm}
            readOnly={!canEditClientData}
            onChange={(next) => {
              if (!canEditClientData) return;
              setProfileForm(next);
              if (
                rutErrors.titular ||
                rutErrors.dependents ||
                rutErrors.additionalTitulares
              ) {
                setRutErrors({});
              }
            }}
            rutErrors={rutErrors}
          />
        ) : null}

        {showFullSections && canEditClientData ? (
          <CollapsibleSection
            title="Nota de reunión"
            description="Registra lo conversado con el cliente tras la reunión. Al guardar, queda en el historial."
            className="rounded-xl border border-border bg-bg-layout/30 p-4"
            bodyClassName="space-y-3"
            defaultOpen
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">
                Comentario post-reunión
              </span>
              <textarea
                value={meetingNote}
                onChange={(event) => setMeetingNote(event.target.value)}
                rows={4}
                placeholder="Ej. Cliente interesado en bajar costo; enviará liquidaciones mañana. Prefiere WhatsApp…"
                className={joinClasses(
                  "min-h-[6rem] w-full resize-y rounded-xl px-3 py-2.5 text-sm",
                  ui.input,
                )}
              />
              <p className="text-[11px] text-muted">
                Se agregará al historial con tu nombre y la fecha al guardar
                cambios.
              </p>
            </label>
          </CollapsibleSection>
        ) : null}

        {canManageZoom || canManagePremium || canManageIsapres ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {canManageZoom ? (
                <Button
                  type="button"
                  size="sm"
                  variant="warning"
                  disabled={actionBusy}
                  aria-pressed={showNoAnswer}
                  onClick={() => openZoomAction("no_contesta")}
                >
                  No contesta
                </Button>
              ) : null}
              {canManageZoom || canManagePremium ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={actionBusy}
                  aria-pressed={showReschedule}
                  onClick={() => openRescheduleAction()}
                >
                  {client.nextCallAt ? "Reagendar llamado" : "Agendar llamado"}
                </Button>
              ) : null}
              {canManageZoom ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={actionBusy}
                  aria-pressed={showRedirect}
                  onClick={() => openZoomAction("redirect")}
                >
                  Redirigir a Isapres Premium
                </Button>
              ) : null}
              {canManagePremium ? (
                <Button
                  type="button"
                  size="sm"
                  variant="info"
                  disabled={actionBusy}
                  aria-pressed={showSendToZoom}
                  onClick={() => openPremiumAction("send_zoom")}
                >
                  Enviar a Ejecutivo Zoom
                </Button>
              ) : null}
              {canManagePremium ? (
                <Button
                  type="button"
                  size="sm"
                  variant="success"
                  disabled={actionBusy}
                  aria-pressed={showSendToIsapres}
                  onClick={() => openPremiumAction("send_isapres")}
                >
                  Enviar a Ejecutivo Isapres
                </Button>
              ) : null}
              {canManageZoom || canManagePremium || canManageIsapres ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={actionBusy}
                  aria-pressed={showLost}
                  onClick={() => openLostAction()}
                >
                  Marcar perdido
                </Button>
              ) : null}
              {canManageIsapres ||
              ((canManageZoom || canManagePremium) && canEditClientData) ? (
                <Button
                  type="button"
                  size="sm"
                  variant={pipelineStatus === "RECEPCIONADO" ? "secondary" : "primary"}
                  disabled={actionBusy}
                  aria-pressed={showCloseForm}
                  onClick={() => openCloseAction()}
                >
                  {pipelineStatus === "RECEPCIONADO"
                    ? "Ver recepcionado"
                    : "Recepcionado"}
                </Button>
              ) : null}
            </div>

            <AnimatePresence>
              {showNoAnswer ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-bg-layout/30 p-3">
                    <p className="text-sm text-foreground">
                      Se marcará el estado{" "}
                      <span className="font-semibold">No contesta</span> y se
                      agregará una nota automática en el historial.
                    </p>
                    <p className="text-[11px] text-muted">
                      Usa &quot;{saveButtonLabel}&quot; al final del formulario para
                      confirmar.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showReschedule && rescheduleSource === "zoom" && !agendaActionModal ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-bg-layout/30 p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Fecha y hora *</span>
                      <Input
                        type="datetime-local"
                        required
                        value={nextCallLocal}
                        onChange={(event) => setNextCallLocal(event.target.value)}
                      />
                    </label>
                    <RescheduleDayAgenda
                      enabled={showReschedule}
                      nextCallLocal={nextCallLocal}
                      excludeClientId={client.id}
                    />
                    {renderCalendlyZoomPanel("reschedule")}
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Nota (opcional)</span>
                      <Input
                        value={rescheduleNote}
                        onChange={(event) => setRescheduleNote(event.target.value)}
                        placeholder="Ej. Cliente pidió llamar en la tarde"
                      />
                    </label>
                    <p className="text-[11px] text-muted">
                      Usa &quot;{saveButtonLabel}&quot; al final del formulario para
                      confirmar{" "}
                      {client.nextCallAt
                        ? "la edición de la reunión Zoom"
                        : "el agendamiento Zoom"}
                      {calendlyBookedHint
                        ? " (usa la misma hora que en Calendly)."
                        : "."}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showRedirect && !agendaActionModal ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-bg-layout/30 p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">
                        Ejecutivo Isapres Premium
                      </span>
                      <Select
                        value={redirectTargetId}
                        placeholder="Selecciona un ejecutivo…"
                        options={premiumExecutives.map((executive) => ({
                          value: executive.id,
                          label: `${formatExecutiveOptionLabel({
                            fullName: executive.fullName,
                            executiveKind: executive.executiveKind,
                            realm: executive.realm,
                          })} (${executive.email})`,
                        }))}
                        onChange={(event) =>
                          setRedirectTargetId(event.target.value)
                        }
                      />
                      <p className="text-[11px] text-muted">
                        El cliente quedará como Nuevo para el Premium elegido.
                        Tú lo verás en Derivados hasta el cierre, con llamado de
                        confirmación Zoom ~{CONFIRMATION_CALL_LEAD_MINUTES} min
                        antes.
                      </p>
                    </label>

                    <fieldset className="space-y-2">
                      <legend className="text-xs font-medium text-foreground">
                        Método de contacto *
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CLIENT_CONTACT_METHOD_OPTIONS.map((option) => {
                          const selected = redirectContactMethod === option.value;
                          return (
                            <label
                              key={option.value}
                              className={joinClasses(
                                "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                                selected
                                  ? "border-primary bg-primary/8 ring-1 ring-primary/25"
                                  : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                              )}
                            >
                              <input
                                type="radio"
                                name="redirect-contact-method"
                                className="mt-0.5"
                                checked={selected}
                                onChange={() =>
                                  setRedirectContactMethod(option.value)
                                }
                              />
                              <span>
                                <span className="block text-xs font-semibold text-foreground">
                                  {option.label}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-muted">
                                  {option.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {redirectContactMethod === "ZOOM"
                      ? renderCalendlyZoomPanel("redirect")
                      : null}

                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">
                        Fecha y hora de atención solicitada *
                      </span>
                      <Input
                        type="datetime-local"
                        required
                        value={redirectAppointmentLocal}
                        onChange={(event) =>
                          setRedirectAppointmentLocal(event.target.value)
                        }
                      />
                      <p className="text-[11px] text-muted">
                        Quedará en el calendario del ejecutivo Premium
                        {redirectContactMethod === "WHATSAPP"
                          ? " (verde = WhatsApp)"
                          : redirectContactMethod === "ZOOM"
                            ? " (azul = Zoom). Si ya agendaste en Calendly, usa la misma hora."
                            : ""}.
                      </p>
                    </label>

                    <p className="text-[11px] text-muted">
                      Usa &quot;{saveButtonLabel}&quot; al final del formulario para
                      confirmar la redirección.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showSendToZoom ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-bg-layout/30 p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Ejecutivo Zoom</span>
                      <Select
                        value={sendZoomTargetId}
                        placeholder="Selecciona un ejecutivo Zoom…"
                        options={zoomExecutives.map((executive) => ({
                          value: executive.id,
                          label: `${formatExecutiveOptionLabel({
                            fullName: executive.fullName,
                            executiveKind: executive.executiveKind,
                            realm: executive.realm,
                          })} (${executive.email})`,
                        }))}
                        onChange={(event) =>
                          setSendZoomTargetId(event.target.value)
                        }
                      />
                      <p className="text-[11px] text-muted">
                        Estado destino: No contesta. El cliente saldrá de tu
                        cartera Premium.
                      </p>
                    </label>
                    <p className="text-[11px] text-muted">
                      Usa &quot;{saveButtonLabel}&quot; al final para confirmar.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showSendToIsapres && !agendaActionModal ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-bg-layout/30 p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">
                        Ejecutivo Isapres
                      </span>
                      <Select
                        value={sendIsapresTargetId}
                        placeholder="Selecciona un ejecutivo Isapres…"
                        options={isapresExecutives.map((executive) => ({
                          value: executive.id,
                          label: `${formatExecutiveOptionLabel({
                            fullName: executive.fullName,
                            executiveKind: executive.executiveKind,
                            realm: executive.realm,
                          })} (${executive.email})`,
                        }))}
                        onChange={(event) =>
                          setSendIsapresTargetId(event.target.value)
                        }
                      />
                      <p className="text-[11px] text-muted">
                        Estado destino: Documentación (listo para cierre). Sale
                        de tu cartera Premium.
                      </p>
                    </label>
                    <p className="text-[11px] text-muted">
                      Usa &quot;{saveButtonLabel}&quot; al final para confirmar.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showReschedule && rescheduleSource === "premium" && !agendaActionModal ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-bg-layout/30 p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Fecha y hora *</span>
                      <Input
                        type="datetime-local"
                        required
                        value={nextCallLocal}
                        onChange={(event) =>
                          setNextCallLocal(event.target.value)
                        }
                      />
                    </label>
                    <RescheduleDayAgenda
                      enabled={showReschedule}
                      nextCallLocal={nextCallLocal}
                      excludeClientId={client.id}
                    />
                    <fieldset className="space-y-2">
                      <legend className="text-xs font-medium text-foreground">
                        Canal de la reunión *
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CLIENT_CONTACT_METHOD_OPTIONS.map((option) => {
                          const selected =
                            rescheduleContactMethod === option.value;
                          return (
                            <label
                              key={option.value}
                              className={joinClasses(
                                "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition",
                                selected
                                  ? option.value === "WHATSAPP"
                                    ? "border-[#25D366] bg-[#25D366]/10 ring-1 ring-[#25D366]/30"
                                    : "border-sky-400 bg-sky-50 ring-1 ring-sky-300/50"
                                  : "border-border bg-bg-layout/40 hover:bg-surface-hover",
                              )}
                            >
                              <input
                                type="radio"
                                name="reschedule-contact-method"
                                className="mt-0.5"
                                checked={selected}
                                onChange={() =>
                                  setRescheduleContactMethod(option.value)
                                }
                              />
                              <span>
                                <span className="block text-xs font-semibold text-foreground">
                                  {option.label}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-muted">
                                  {option.value === "WHATSAPP"
                                    ? "Aparecerá en verde en tu calendario."
                                    : "Aparecerá en azul en tu calendario."}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                    {rescheduleContactMethod === "ZOOM"
                      ? renderCalendlyZoomPanel("reschedule")
                      : null}
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Nota (opcional)</span>
                      <Input
                        value={rescheduleNote}
                        onChange={(event) =>
                          setRescheduleNote(event.target.value)
                        }
                        placeholder="Ej. Cliente pidió llamar en la tarde"
                      />
                    </label>
                    <p className="text-[11px] text-muted">
                      Quedará en tu calendario
                      {rescheduleContactMethod === "ZOOM"
                        ? " (azul = Zoom). Si ya agendaste en Calendly, usa la misma hora."
                        : rescheduleContactMethod === "WHATSAPP"
                          ? " (verde = WhatsApp)."
                          : "."}{" "}
                      Usa &quot;{saveButtonLabel}&quot; al final para confirmar.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showLost && !agendaActionModal ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <LostReasonFields
                    lostReason={lostReason}
                    lostReasonOther={lostReasonOther}
                    onReasonChange={setLostReason}
                    onOtherChange={setLostReasonOther}
                    saveButtonLabel={saveButtonLabel}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {showFullSections && canEditClientData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
              <span className="text-xs text-muted">
                Marca cada documento cuando lo recibas del cliente
              </span>
            </div>
            <ul className="space-y-2 rounded-xl border border-border bg-bg-layout/40 p-3">
              {checklist.items.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-0.5 size-4 rounded border-border text-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={joinClasses(
                          "block text-sm",
                          item.checked
                            ? "text-muted line-through"
                            : "text-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.checked && item.checkedAt ? (
                        <span className="mt-0.5 block text-[11px] text-muted">
                          Listo ·{" "}
                          {new Intl.DateTimeFormat("es-CL", {
                            dateStyle: "short",
                          }).format(new Date(item.checkedAt))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showFullSections && client ? (
          <ClientDocumentsSection
            clientId={client.id}
            canEdit={canEditClientData}
            onNotify={onNotify}
          />
        ) : null}

        <AnimatePresence>
          {canEditClientData && showCloseForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-primary-dark">
                    Recepcionado
                  </h3>
                  {pipelineStatus !== "RECEPCIONADO" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCloseForm(false)}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
                {renderRecepcionadoFormFields()}
                {pipelineStatus !== "RECEPCIONADO" ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving || actionBusy}
                      onClick={requestCloseConfirm}
                    >
                      Confirmar recepcionado
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {canViewInternalNotes && showFullSections ? (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Historial de modificaciones</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Solo lectura. Se actualiza automáticamente con las acciones del
                sistema (reagendar, contacto, redirecciones, etc.).
              </p>
            </div>
            {(() => {
              const modificationLines =
                listPipelineModificationLines(pipelineNotes);
              return modificationLines.length > 0 ? (
                <div
                  className={joinClasses(
                    "max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-layout/50 px-3 py-2.5 text-sm text-foreground",
                  )}
                  role="log"
                  aria-label="Historial de modificaciones"
                >
                  <ul className="space-y-2">
                    {modificationLines.map((line, index) => (
                      <li
                        key={`${index}-${line.slice(0, 24)}`}
                        className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                      >
                        <p className="whitespace-pre-wrap text-[13px] leading-snug">
                          {line}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-bg-layout/30 px-3 py-3 text-xs text-muted">
                  Sin movimientos registrados aún.
                </p>
              );
            })()}
          </div>
        ) : null}

        {isOperationsLayout ? (
          canEditClientData &&
          !agendaActionModal &&
          (showNoAnswer ||
            showRedirect ||
            showSendToZoom ||
            showSendToIsapres ||
            showLost ||
            showReschedule) ? (
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                disabled={saving || actionBusy || !hasUnsavedChanges}
                onClick={requestSaveConfirm}
              >
                {saving ? "Guardando…" : saveButtonLabel}
              </Button>
            </div>
          ) : null
        ) : (
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              {variant === "page" ? "Volver a clientes" : "Cancelar"}
            </Button>
            {canEditClientData ? (
              <Button
                type="button"
                disabled={saving || actionBusy || !hasUnsavedChanges}
                onClick={requestSaveConfirm}
              >
                {saving ? "Guardando…" : saveButtonLabel}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    );
  }
}
