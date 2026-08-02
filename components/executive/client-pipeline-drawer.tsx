"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientContactMethodBadge } from "@/components/executive/client-contact-method-badge";
import { ClientAdvisedPlanSection } from "@/components/executive/client-advised-plan-section";
import { CalendlyInlineEmbed } from "@/components/executive/calendly-inline-embed";
import { RescheduleDayAgenda } from "@/components/executive/reschedule-day-agenda";
import {
  ClientProfileForm,
  userRecordToProfileFormValue,
  type ClientProfileFormValue,
} from "@/components/executive/client-profile-form";
import { useStaffSession } from "@/hooks/use-auth-session";
import {
  fetchCalendlySchedulingLink,
  fetchEligibleExecutives,
  fetchPremiumExecutives,
  redirectClientToIsapres,
  redirectClientToPremium,
  redirectClientToZoom,
  updateClientPipeline,
} from "@/lib/api/admin-client";
import { CALENDLY_TEAM_LABELS } from "@/lib/calendly/labels";
import {
  advancePipelineStatus,
  buildEmptyClosedRecord,
  buildDefaultClientChecklist,
} from "@/lib/client-pipeline/constants";
import {
  appendPipelineNoteLine,
  canAccessInternalPipelineNotes,
} from "@/lib/client-pipeline/note-stamp";
import { getClientManagementRutErrors } from "@/lib/client-profile/validate-client-ruts";
import { ISAPRE_FILTER_OPTIONS } from "@/lib/filter-options";
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
  | {
      kind: "redirect";
      targetLabel: string;
      contactMethodLabel: string;
      appointmentLabel: string;
    }
  | { kind: "send_zoom"; targetLabel: string }
  | { kind: "send_isapres"; targetLabel: string };

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
   * Si es `false`, tras guardar se permanece en la ficha.
   * Por defecto: `true` en modal, `false` en page.
   */
  closeAfterSave?: boolean;
}

function getManagementDescription(input: {
  isZoom: boolean;
  isIsapres: boolean;
  isPremium: boolean;
}): string | undefined {
  if (input.isZoom) {
    return "Gestión ejecutivo: contacto, reagendar, redirigir a Premium y datos del cliente.";
  }
  if (input.isIsapres) {
    return "Gestión Isapres: revisa los datos del cliente y cierra el contrato cuando corresponda.";
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
  { key: "firstNames", label: "Nombres" },
  { key: "lastNames", label: "Apellidos" },
  { key: "birthDate", label: "Fecha de nacimiento" },
  { key: "currentIsapre", label: "Isapre actual" },
  { key: "heightCm", label: "Estatura" },
  { key: "weightKg", label: "Peso" },
  { key: "maritalStatus", label: "Estado civil" },
  { key: "address", label: "Dirección" },
  { key: "commune", label: "Comuna" },
];

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

function buildSaveChangeSummary(input: {
  client: UserRecord;
  profileForm: ClientProfileFormValue;
  nextCallLocal: string;
  rescheduleNote: string;
  rescheduleContactMethod: ClientContactMethod | "";
  checklist: ClientChecklist;
  closedRecord: ClientClosedRecord;
  showCloseForm: boolean;
  pipelineStatus: ClientPipelineStatus;
  isZoom: boolean;
}): string[] {
  const {
    client,
    profileForm,
    nextCallLocal,
    rescheduleNote,
    rescheduleContactMethod,
    checklist,
    closedRecord,
    showCloseForm,
    pipelineStatus,
    isZoom,
  } = input;
  const items: string[] = [];

  const originalNextCall = toDatetimeLocalValue(client.nextCallAt);
  if (nextCallLocal !== originalNextCall) {
    if (!nextCallLocal.trim()) {
      items.push("Quitar la fecha del próximo llamado");
    } else {
      const when =
        formatNextCallFromLocal(nextCallLocal) ?? nextCallLocal;
      items.push(
        originalNextCall
          ? `Reagendar llamado para ${when}`
          : `Agendar llamado para ${when}`,
      );
    }
  } else if (rescheduleNote.trim() && nextCallLocal.trim()) {
    const when =
      formatNextCallFromLocal(nextCallLocal) ?? nextCallLocal;
    items.push(`Confirmar llamado para ${when}`);
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
    items.push(`Nota de reagendamiento: “${rescheduleNote.trim()}”`);
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

    const closing = showCloseForm || pipelineStatus === "CERRADO";
    if (closing) {
      const originalClosed = client.closedRecord ?? buildEmptyClosedRecord();
      if (
        client.pipelineStatus !== "CERRADO" ||
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
          client.pipelineStatus === "CERRADO"
            ? `Actualizar registro de cierre${
                closeBits.length ? ` (${closeBits.join(" · ")})` : ""
              }`
            : `Cerrar negocio${
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
    currentIsapre: value.currentIsapre || "",
    heightCm: value.heightCm || "",
    weightKg: value.weightKg || "",
    maritalStatus: value.maritalStatus || "",
    address: value.address || "",
    commune: value.commune || "",
    dependents: value.dependents,
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
  closeAfterSave,
}: ClientPipelineDrawerProps) {
  const shouldCloseAfterSave = closeAfterSave ?? variant === "modal";
  const { isAdmin, executiveKind, user: sessionUser } = useStaffSession();
  const isZoom = executiveKind === "ZOOM";
  const isPremium = executiveKind === "ISAPRES_PREMIUM";
  const isIsapres = executiveKind === "ISAPRES";
  const canManageZoom = isZoom || isAdmin;
  const canManagePremium = isPremium || isAdmin;
  const canManageIsapres = isIsapres || isAdmin;
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
  const [rescheduleContactMethod, setRescheduleContactMethod] = useState<
    ClientContactMethod | ""
  >("");
  const [profileForm, setProfileForm] = useState<ClientProfileFormValue>(
    userRecordToProfileFormValue(null),
  );
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [premiumExecutives, setPremiumExecutives] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([]);
  const [zoomExecutives, setZoomExecutives] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([]);
  const [isapresExecutives, setIsapresExecutives] = useState<
    Array<{ id: string; fullName: string; email: string }>
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
  const [calendlyLinkInfo, setCalendlyLinkInfo] = useState<{
    teamLabel: string;
    schedulingUrl: string;
    prefill: { email: string | null; name: string | null } | null;
  } | null>(null);
  const [calendlyError, setCalendlyError] = useState<string | null>(null);
  const [calendlyBookedHint, setCalendlyBookedHint] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const [rutErrors, setRutErrors] = useState<{
    titular?: string;
    dependents?: Record<string, string>;
  }>({});

  const isTerminalStatus =
    pipelineStatus === "CERRADO" || pipelineStatus === "PERDIDO";

  const hasUnsavedChanges = useMemo(() => {
    if (!client) return false;
    if (showNoAnswer || showRedirect || showSendToZoom || showSendToIsapres || showLost) {
      return true;
    }
    if (toDatetimeLocalValue(client.nextCallAt) !== nextCallLocal) return true;
    if (rescheduleNote.trim()) return true;
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
      if (showCloseForm || pipelineStatus === "CERRADO") {
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
    setRescheduleNote("");
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
    setShowCloseForm((client.pipelineStatus ?? "NUEVO") === "CERRADO");
    setRedirectTargetId("");
    setRedirectContactMethod("");
    setRedirectAppointmentLocal("");
    setSendZoomTargetId("");
    setSendIsapresTargetId("");
    setPendingConfirm(null);
    setRutErrors({});
  }, [open, client]);

  useEffect(() => {
    if (!open || !canManageZoom) return;
    let cancelled = false;
    void (async () => {
      try {
        const executives = await fetchPremiumExecutives();
        if (!cancelled) setPremiumExecutives(executives);
      } catch {
        if (!cancelled) setPremiumExecutives([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canManageZoom]);

  useEffect(() => {
    if (!open || !canManagePremium) return;
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
          auto: true,
        });
        if (cancelled) return;
        setCalendlyLinkInfo({
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
  ]);

  const checklistProgress = useMemo(() => {
    const total = checklist.items.length;
    const done = checklist.items.filter((item) => item.checked).length;
    return { total, done };
  }, [checklist]);

  const nextCallLabel = formatNextCallAt(client?.nextCallAt);

  const confirmCopy = useMemo(() => {
    if (!pendingConfirm || !client) return null;
    switch (pendingConfirm.kind) {
      case "save": {
        const changes = buildSaveChangeSummary({
          client,
          profileForm,
          nextCallLocal,
          rescheduleNote,
          rescheduleContactMethod,
          checklist,
          closedRecord,
          showCloseForm,
          pipelineStatus,
          isZoom,
        });
        const onlySchedule =
          changes.length > 0 &&
          changes.every(
            (item) =>
              item.startsWith("Agendar llamado") ||
              item.startsWith("Reagendar llamado") ||
              item.startsWith("Confirmar llamado") ||
              item.startsWith("Quitar la fecha") ||
              item.startsWith("Nota de reagendamiento") ||
              item.startsWith("Canal de reunión"),
          );
        const whenLabel =
          formatNextCallFromLocal(nextCallLocal) ?? nextCallLocal;
        return {
          title: onlySchedule
            ? changes.some((item) => item.startsWith("Reagendar"))
              ? "Confirmar reagendamiento"
              : "Confirmar agendamiento"
            : "Guardar cambios",
          description:
            onlySchedule && whenLabel
              ? `¿Confirmas reagendar el llamado de ${client.fullName} para el ${whenLabel}?`
              : `Se aplicarán estos cambios en ${client.fullName}:`,
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
            ? `Fecha cierre: ${closedRecord.closedAt}`
            : null,
        ].filter((value): value is string => Boolean(value));
        return {
          title: "Cerrar negocio",
          description: `¿Confirmas cerrar el negocio de ${client.fullName} con ${isapreLabel}?`,
          changes: ["Estado → Cerrado", ...closeBits],
        };
      }
      case "redirect":
        return {
          title: "Redirigir a Isapres Premium",
          description: `Se reasignará a ${client.fullName}:`,
          changes: [
            `Ejecutivo destino: ${pendingConfirm.targetLabel}`,
            `Contacto preferido: ${pendingConfirm.contactMethodLabel}`,
            `Atención solicitada: ${pendingConfirm.appointmentLabel}`,
            "Estado → Nuevo en la cartera Premium",
            "Saldrá de tu cartera Zoom",
          ],
        };
      case "send_zoom":
        return {
          title: "Confirmar envío a Zoom",
          description: `¿Confirmas devolver a ${client.fullName} a un Ejecutivo Zoom por falta de contacto?`,
          changes: [
            `Ejecutivo Zoom destino: ${pendingConfirm.targetLabel}`,
            "Estado → No contesta",
            "Saldrá de tu cartera Premium",
          ],
        };
      case "send_isapres":
        return {
          title: "Confirmar envío a Isapres",
          description: `¿Confirmas enviar a ${client.fullName} a un Ejecutivo Isapres para cierre/contratación?`,
          changes: [
            `Ejecutivo Isapres destino: ${pendingConfirm.targetLabel}`,
            "Estado → Documentación (listo para cierre)",
            "Saldrá de tu cartera Premium",
          ],
        };
    }
  }, [
    pendingConfirm,
    client,
    profileForm,
    nextCallLocal,
    rescheduleNote,
    rescheduleContactMethod,
    checklist,
    closedRecord,
    showCloseForm,
    pipelineStatus,
    isZoom,
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
          advancePipelineStatus(status, "DOCUMENTACION"),
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
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim() || null,
      rut: profileForm.rut.trim() || null,
      firstNames: profileForm.firstNames.trim(),
      lastNames: profileForm.lastNames.trim(),
      birthDate: profileForm.birthDate || null,
      currentIsapre: profileForm.currentIsapre || null,
      heightCm: profileForm.heightCm || null,
      weightKg: profileForm.weightKg || null,
      maritalStatus: profileForm.maritalStatus || null,
      address: profileForm.address || null,
      commune: profileForm.commune || null,
      dependents: profileForm.dependents,
    };
  }

  function renderCalendlyZoomPanel(context: "redirect" | "reschedule") {
    if (!client) return null;

    const bookedHint =
      context === "redirect"
        ? "Horario reservado en Calendly. Indica la misma fecha y hora abajo y confirma la redirección a Premium."
        : "Horario reservado en Calendly. Indica la misma fecha y hora arriba/abajo y confirma el reagendamiento.";
    const notifyHint =
      context === "redirect"
        ? "Reunión Calendly confirmada. Completa la fecha abajo y confirma la redirección."
        : "Reunión Calendly confirmada. Completa la fecha y confirma el reagendamiento.";

    return (
      <div className="space-y-3 rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-3">
        <div>
          <p className="text-xs font-semibold text-sky-950">
            Agendar Zoom con Calendly
          </p>
          <p className="mt-1 text-[11px] text-sky-900/80">
            Agenda aquí mismo con el widget. Tras confirmar, el webhook guarda
            el link Zoom y sincroniza la agenda.
          </p>
        </div>

        {calendlyLinkInfo ? (
          <p className="text-[11px] text-sky-950">
            Equipo:{" "}
            <span className="font-semibold">{calendlyLinkInfo.teamLabel}</span>
          </p>
        ) : null}
        {client.calendlyTeam && !calendlyLinkInfo ? (
          <p className="text-[11px] text-sky-950">
            Equipo asignado:{" "}
            <span className="font-semibold">
              {CALENDLY_TEAM_LABELS[client.calendlyTeam]}
            </span>
          </p>
        ) : null}

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
      pipelineStatus === "CERRADO";
    if (closing && !isZoom) {
      if (!closedRecord.isapre.trim()) {
        onNotify("Indica la Isapre del registro de cierre.", "error");
        return;
      }
      if (!closedRecord.closedAt.trim()) {
        onNotify("Indica la fecha de cierre.", "error");
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

    let notesToSave: string | null | undefined;
    let lastCallOutcome: string | null | undefined;
    if (applyReschedule && nextCallIso) {
      const whenLabel = formatNextCallAt(nextCallIso) ?? nextCallLocal;
      const channelLabel =
        rescheduleSource === "premium" && rescheduleContactMethod
          ? ` Canal: ${CLIENT_CONTACT_METHOD_LABELS[rescheduleContactMethod]}.`
          : "";
      const noteBody = `Reagendado para ${whenLabel}.${channelLabel}${
        rescheduleNote.trim() ? ` ${rescheduleNote.trim()}` : ""
      }`;
      notesToSave = appendPipelineNoteLine(
        client.pipelineNotes,
        noteBody,
        actorDisplayName,
      );
      lastCallOutcome =
        rescheduleNote.trim() ||
        (rescheduleContactMethod
          ? `Llamado reagendado · ${CLIENT_CONTACT_METHOD_LABELS[rescheduleContactMethod]}`
          : "Llamado reagendado");
    }

    if (closing && !isZoom) {
      const closeBody = `Cierre de negocio registrado. Isapre: ${closedRecord.isapre.trim()}.${
        closedRecord.planName?.trim() || closedRecord.planCode?.trim()
          ? ` Plan: ${closedRecord.planName?.trim() || closedRecord.planCode?.trim()}.`
          : ""
      }`;
      notesToSave = appendPipelineNoteLine(
        notesToSave ?? client.pipelineNotes,
        closeBody,
        actorDisplayName,
      );
      lastCallOutcome = `Cerrado · ${closedRecord.isapre.trim()}`;
    }

    setSaving(true);
    try {
      const nextStatus = closing
        ? "CERRADO"
        : applyReschedule
          ? "EN_SEGUIMIENTO"
          : !isZoom && checklist.items.some((item) => item.checked)
            ? advancePipelineStatus(pipelineStatus, "DOCUMENTACION")
            : pipelineStatus;

      const updated = await updateClientPipeline(client.id, {
        ...(closing || nextStatus !== (client.pipelineStatus ?? "NUEVO")
          ? { pipelineStatus: nextStatus }
          : {}),
        ...(isZoom ? {} : { checklist }),
        clientProfile: buildProfilePayload(),
        ...(closing && !isZoom ? { closedRecord } : {}),
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
      setShowReschedule(false);
      setRescheduleSource(null);
      setShowCloseForm(closing);
      onUpdated(updated);
      onNotify(
        closing
          ? "Cliente cerrado."
          : applyReschedule
            ? "Llamado reagendado y cambios guardados."
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
      { rut: profileForm.rut, dependents: profileForm.dependents },
      { requireTitularRut: false },
    );
    if (errors.firstMessage) {
      setRutErrors({
        titular: errors.titular,
        dependents: errors.dependents,
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
      const targetLabel =
        premiumExecutives.find((row) => row.id === redirectTargetId)?.fullName ??
        "el ejecutivo seleccionado";
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
      const targetLabel =
        zoomExecutives.find((row) => row.id === sendZoomTargetId)?.fullName ??
        "el ejecutivo seleccionado";
      setPendingConfirm({ kind: "send_zoom", targetLabel });
      return;
    }

    if (showSendToIsapres) {
      if (!sendIsapresTargetId) {
        onNotify("Selecciona un Ejecutivo Isapres.", "error");
        return;
      }
      const targetLabel =
        isapresExecutives.find((row) => row.id === sendIsapresTargetId)
          ?.fullName ?? "el ejecutivo seleccionado";
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
      onNotify("Indica la fecha y hora del llamado reagendado.", "error");
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

    if (!hasUnsavedChanges) return;
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
        auto: true,
      });
      setCalendlyLinkInfo({
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
      if (!link) {
        const row = await fetchCalendlySchedulingLink({
          clientId: client.id,
          auto: true,
        });
        link = {
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
      onNotify("Indica la Isapre del registro de cierre.", "error");
      return;
    }
    if (!closedRecord.closedAt.trim()) {
      onNotify("Indica la fecha de cierre.", "error");
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

  async function executePendingConfirm() {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);

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
    await handleRedirect();
  }

  const saveButtonLabel = showSendToZoom
    ? "Confirmar envío a Zoom"
    : showSendToIsapres
      ? "Confirmar envío a Isapres"
      : showLost
        ? "Confirmar perdido"
        : showReschedule
          ? "Guardar reagendamiento"
          : showRedirect
            ? "Confirmar redirección"
            : showNoAnswer
              ? "Confirmar No contesta"
              : showCloseForm && pipelineStatus !== "CERRADO"
                ? "Confirmar cierre de negocio"
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
      <div
        className={joinClasses(
          "rounded-2xl border bg-white p-4 shadow-sm sm:p-6",
          ui.border,
        )}
      >
        {renderManagementBody()}
      </div>
    ) : null}

    <div className="relative z-[60]">
      <AdminFormModal
        open={Boolean(pendingConfirm && confirmCopy)}
        title={confirmCopy?.title ?? "Confirmar"}
        description={confirmCopy?.description}
        onClose={() => setPendingConfirm(null)}
        size="md"
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={saving || actionBusy}
              onClick={() => setPendingConfirm(null)}
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
    </>
  );

  function renderManagementBody() {
    if (!client) return null;

    return (
      <div className="space-y-6">
        {!isZoom ? (
          <ClientAdvisedPlanSection
            client={client}
            onUpdated={onUpdated}
            onNotify={onNotify}
          />
        ) : null}

        <ClientProfileForm
          value={profileForm}
          onChange={(next) => {
            setProfileForm(next);
            if (rutErrors.titular || rutErrors.dependents) {
              setRutErrors({});
            }
          }}
          rutErrors={rutErrors}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ClientPipelineStatusBadge status={pipelineStatus} />
            <ClientContactMethodBadge
              method={client.preferredContactMethod}
            />
            {!isZoom ? (
              <span className="text-xs text-muted">
                {checklistProgress.done}/{checklistProgress.total} documentos listos
              </span>
            ) : null}
            {nextCallLabel ? (
              <span className="text-xs font-medium text-primary-dark">
                Próximo llamado: {nextCallLabel}
              </span>
            ) : null}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void markContactedFromWhatsApp()}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        {canManageIsapres ? (
          <div className="space-y-3 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4">
            <div>
              <h3 className="text-sm font-semibold text-primary-dark">
                Gestión Isapres
              </h3>
              <p className="mt-1 text-xs text-muted">
                Revisa los datos del cliente y cierra el contrato cuando
                corresponda.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isTerminalStatus ? (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={actionBusy}
                  aria-pressed={showCloseForm}
                  onClick={() => {
                    clearManagementPanels();
                    setShowCloseForm(true);
                  }}
                >
                  Cerrar negocio
                </Button>
              ) : null}
              {!isTerminalStatus ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={actionBusy}
                  aria-pressed={showLost && lostSource === "isapres"}
                  onClick={() => {
                    clearManagementPanels();
                    setShowCloseForm(false);
                    setShowLost(true);
                    setLostSource("isapres");
                    setLostReason("");
                    setLostReasonOther("");
                  }}
                >
                  Marcar perdido
                </Button>
              ) : null}
              {pipelineStatus === "CERRADO" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={actionBusy}
                  aria-pressed={showCloseForm}
                  onClick={() => {
                    clearManagementPanels();
                    setShowCloseForm(true);
                  }}
                >
                  Ver registro de cierre
                </Button>
              ) : null}
            </div>

            <AnimatePresence>
              {showLost && lostSource === "isapres" ? (
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

        {canManageZoom ? (
          <div className="space-y-3 rounded-xl border border-secondary/25 bg-secondary-muted/40 p-4">
            <div>
              <h3 className="text-sm font-semibold text-primary-dark">
                Gestión ejecutivo
              </h3>
              <p className="mt-1 text-xs text-muted">
                Acciones rápidas de contacto y derivación a Ejecutivo Isapres Premium.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={actionBusy}
                aria-pressed={showReschedule && rescheduleSource === "zoom"}
                onClick={() => openZoomAction("reschedule")}
              >
                Reagendar llamado
              </Button>
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
              {!isTerminalStatus ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={actionBusy}
                  aria-pressed={showLost && lostSource === "zoom"}
                  onClick={() => openZoomAction("perdido")}
                >
                  Marcar perdido
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
                  <div className="space-y-3 rounded-xl border border-border bg-white p-3">
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
              {showReschedule && rescheduleSource === "zoom" ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-white p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Fecha y hora</span>
                      <Input
                        type="datetime-local"
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
                      confirmar el reagendamiento
                      {calendlyBookedHint
                        ? " (usa la misma hora que en Calendly)."
                        : "."}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {showRedirect ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-white p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">
                        Ejecutivo Isapres Premium
                      </span>
                      <Select
                        value={redirectTargetId}
                        placeholder="Selecciona un ejecutivo…"
                        options={premiumExecutives.map((executive) => ({
                          value: executive.id,
                          label: `${executive.fullName} (${executive.email})`,
                        }))}
                        onChange={(event) =>
                          setRedirectTargetId(event.target.value)
                        }
                      />
                      <p className="text-[11px] text-muted">
                        El cliente quedará como Nuevo para el Premium elegido y
                        saldrá de tu cartera.
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
              {showLost && lostSource === "zoom" ? (
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

        {canManagePremium ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div>
              <h3 className="text-sm font-semibold text-primary-dark">
                Gestión Isapres Premium
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
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
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={actionBusy}
                aria-pressed={
                  showReschedule && rescheduleSource === "premium"
                }
                onClick={() => openPremiumAction("reschedule")}
                className="border border-violet-200 bg-violet-600 text-white shadow-sm hover:bg-violet-700 hover:text-white active:scale-[0.98]"
              >
                Reagendar llamado
              </Button>
              {!isTerminalStatus ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={actionBusy}
                  aria-pressed={showLost && lostSource === "premium"}
                  onClick={() => openPremiumAction("perdido")}
                >
                  Marcar perdido
                </Button>
              ) : null}
            </div>

            <AnimatePresence>
              {showSendToZoom ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-white p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Ejecutivo Zoom</span>
                      <Select
                        value={sendZoomTargetId}
                        placeholder="Selecciona un ejecutivo Zoom…"
                        options={zoomExecutives.map((executive) => ({
                          value: executive.id,
                          label: `${executive.fullName} (${executive.email})`,
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
              {showSendToIsapres ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-white p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">
                        Ejecutivo Isapres
                      </span>
                      <Select
                        value={sendIsapresTargetId}
                        placeholder="Selecciona un ejecutivo Isapres…"
                        options={isapresExecutives.map((executive) => ({
                          value: executive.id,
                          label: `${executive.fullName} (${executive.email})`,
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
              {showReschedule && rescheduleSource === "premium" ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-white p-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium">Fecha y hora</span>
                      <Input
                        type="datetime-local"
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
              {showLost && lostSource === "premium" ? (
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

        {!isZoom ? (
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

        <AnimatePresence>
          {!isZoom && showCloseForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-primary-dark">
                    Registro de cierre
                  </h3>
                  {pipelineStatus !== "CERRADO" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCloseForm(false)}
                    >
                      Cancelar cierre
                    </Button>
                  ) : null}
                </div>
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
                    <span className="text-xs font-medium">Fecha cierre *</span>
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
                    <span className="text-xs font-medium">Notas de cierre</span>
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
                {pipelineStatus !== "CERRADO" ? (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving || actionBusy}
                      onClick={requestCloseConfirm}
                    >
                      Confirmar cierre de negocio
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {canViewInternalNotes ? (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Historial de modificaciones</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Solo lectura. Se actualiza automáticamente con las acciones del
                sistema (reagendar, contacto, redirecciones, etc.).
              </p>
            </div>
            {pipelineNotes.trim() ? (
              <div
                className={joinClasses(
                  "max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-layout/50 px-3 py-2.5 text-sm text-foreground",
                )}
                role="log"
                aria-label="Historial de modificaciones"
              >
                <ul className="space-y-2">
                  {pipelineNotes
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, index) => (
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
            )}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {variant === "page" ? "Volver a clientes" : "Cancelar"}
          </Button>
          <Button
            type="button"
            disabled={saving || actionBusy || !hasUnsavedChanges}
            onClick={requestSaveConfirm}
          >
            {saving ? "Guardando…" : saveButtonLabel}
          </Button>
        </div>
      </div>
    );
  }
}
