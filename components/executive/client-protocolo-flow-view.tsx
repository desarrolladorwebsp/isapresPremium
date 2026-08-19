"use client";

import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ClientProfileFormValue } from "@/components/executive/client-profile-form";
import type { PipelineRoleId } from "@/components/executive/client-pipeline-role-card";
import {
  ClientPremiumExecutiveCapsules,
  type PremiumFichaModal,
} from "@/components/executive/client-premium-hub-view";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { ClientDocumentsSection } from "@/components/executive/client-documents-section";
import { ClientFichaPdfModal } from "@/components/executive/client-ficha-pdf-modal";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientZoomScheduleCard } from "@/components/executive/client-zoom-schedule-card";
import {
  IconArrowLeft,
  IconCalculator,
  IconBell,
  IconCalendar,
  IconCalendarCheck,
  IconClipboard,
  IconExecutive,
  IconHeadset,
  IconPhone,
  IconPhoneOff,
  IconUser,
  IconUserPlus,
  IconWhatsApp,
} from "@/components/executive/executive-icons";
import { staffCotizadorClientHref } from "@/lib/staff/staff-sections";
import {
  buildEmptyAdditionalTitular,
  buildEmptyDependent,
  calculateAgeFromBirthDate,
  CLIENT_MOTIVO_COTIZACION_OPTIONS,
  motivoCotizacionIncludes,
  motivoCotizacionIncludesOtros,
  toggleMotivoCotizacionId,
} from "@/lib/client-profile/constants";
import {
  CLIENT_PIPELINE_STATUS_LABELS,
  CLIENT_PIPELINE_STATUS_OPTIONS,
} from "@/lib/client-pipeline/constants";
import { CURRENT_COVERAGE_OPTIONS } from "@/lib/filter-options";
import {
  resolveCurrentCoverageId,
  resolveCurrentCoverageLabel,
} from "@/lib/client-profile/current-coverage";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type {
  ClientAdditionalTitularProfile,
  ClientDependentProfile,
  ClientMoneyCurrency,
} from "@/types/client-profile";
import type { UserRecord } from "@/types/user";

const PRINCIPAL_MEMBER_ID = "titular-principal";

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
  }).format(date);
}

function formatShortDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark/60">
        {label}
      </p>
      <div className="text-base font-semibold text-foreground sm:text-[17px]">
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-dark/70">
      {children}
    </span>
  );
}


function formatPlanPayLabel(
  amount: string | null | undefined,
  currency: ClientMoneyCurrency | null | undefined,
): string {
  const trimmed = amount?.trim() ?? "";
  if (!trimmed) return "Sin valor";
  return currency === "CLP" ? `$${trimmed}` : `${trimmed} UF`;
}

function formatRentaLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || "Sin renta";
}

function formatAgeLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed ? `${trimmed} años` : "Sin edad";
}

function SectionCard({
  number,
  title,
  children,
  className,
}: {
  number: number;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={joinClasses("flex h-full min-w-0 flex-col", className)}>
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-dark text-xs font-bold text-white">
          {number}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary-dark">
          {title}
        </h3>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {([true, false] as const).map((option) => {
          const selected = value === option;
          return (
            <button
              key={String(option)}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={joinClasses(
                "rounded-full px-3.5 py-1 text-xs font-semibold transition",
                selected
                  ? "bg-primary-dark text-white"
                  : "border border-border bg-white text-zinc-600 hover:border-primary/30",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {option ? "Sí" : "No"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type SidebarActionTone =
  | "navy"
  | "sky"
  | "emerald"
  | "green"
  | "whatsapp"
  | "amber"
  | "slate"
  | "danger"
  | "ghost";

function SidebarActionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--dash-navy,#092558)]/45">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function SidebarAction({
  label,
  icon,
  tone = "slate",
  size = "md",
  disabled,
  onClick,
  title,
}: {
  label: string;
  icon?: ReactNode;
  tone?: SidebarActionTone;
  size?: "md" | "lg";
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  const toneClass: Record<SidebarActionTone, string> = {
    navy:
      "border border-[color:var(--dash-navy,#092558)]/15 bg-[color:var(--dash-navy,#092558)] text-white shadow-[0_4px_14px_-6px_rgb(9_37_88_/_0.45)] hover:bg-[color:color-mix(in_srgb,var(--dash-navy,#092558)_90%,black)]",
    sky: "border border-sky-200/90 bg-sky-50 text-sky-950 hover:bg-sky-100",
    emerald:
      "border border-emerald-200/90 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
    green:
      "border border-emerald-700/20 bg-emerald-600 text-white shadow-[0_4px_14px_-6px_rgb(5_150_105_/_0.45)] hover:bg-emerald-700",
    whatsapp:
      "border border-[#25D366]/35 bg-[#25D366]/12 text-[#0f7a4a] hover:bg-[#25D366]/20",
    amber:
      "border border-amber-200/90 bg-amber-50 text-amber-950 hover:bg-amber-100",
    slate:
      "border border-border bg-white text-[color:var(--dash-navy,#092558)] hover:bg-[color:var(--dash-navy,#092558)]/[0.04]",
    danger:
      "border border-danger/25 bg-danger/5 text-danger hover:bg-danger/10",
    ghost:
      "border border-transparent bg-transparent text-muted hover:border-border hover:bg-surface-hover hover:text-foreground",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      title={title ?? label}
      onClick={onClick}
      className={joinClasses(
        "flex w-full items-center gap-2 rounded-xl px-2.5 text-left transition active:scale-[0.99]",
        size === "lg" ? "min-h-12 py-3" : "min-h-10 py-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-45",
        toneClass[tone],
      )}
    >
      {icon ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.06]">
          {icon}
        </span>
      ) : null}
      <span
        className={joinClasses(
          "min-w-0 flex-1 font-semibold leading-snug tracking-tight",
          size === "lg" ? "text-xs" : "text-[11px]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export interface ClientProtocoloFlowViewProps {
  client: UserRecord;
  activeFlow: PipelineRoleId;
  profileForm: ClientProfileFormValue;
  onProfileChange: Dispatch<SetStateAction<ClientProfileFormValue>>;
  pipelineStatus: ClientPipelineStatus;
  /** Cambio manual de estatus (requiere nota de justificación). */
  onManualStatusChange: (
    status: ClientPipelineStatus,
    note: string,
  ) => Promise<void>;
  meetingNote: string;
  onMeetingNoteChange: (value: string) => void;
  canEdit: boolean;
  saving: boolean;
  actionBusy: boolean;
  hasUnsavedChanges: boolean;
  whatsappUrl: string | null;
  canManageZoom: boolean;
  canManagePremium: boolean;
  canManageIsapres: boolean;
  onBack: () => void;
  onSave: () => void;
  onWhatsApp: () => void;
  onScheduleZoom: () => void;
  onMeetingDone: () => void;
  onCallback: () => void;
  onReminder: () => void;
  onNoAnswer: () => void;
  onRedirectPremium: () => void;
  /** Premium → Ejecutivo Zoom. */
  onSendToZoom: () => void;
  /** Premium → Ejecutivo Isapres. */
  onSendToIsapres: () => void;
  onMarkLost: () => void;
  /** Isapres: marcar cliente como recepcionado (cierre). */
  onRecepcionado: () => void;
  onConfirmZoomMeeting: () => void;
  onAddTitular: () => void;
  onAddCarga: () => void;
  onOpenFichaModal?: (modal: PremiumFichaModal) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

export function ClientProtocoloFlowView({
  client,
  activeFlow,
  profileForm,
  onProfileChange,
  pipelineStatus,
  onManualStatusChange,
  meetingNote,
  onMeetingNoteChange,
  canEdit,
  saving,
  actionBusy,
  hasUnsavedChanges,
  whatsappUrl,
  canManageZoom,
  canManagePremium,
  canManageIsapres,
  onBack,
  onSave,
  onWhatsApp,
  onScheduleZoom,
  onMeetingDone,
  onCallback,
  onReminder,
  onNoAnswer,
  onRedirectPremium,
  onSendToZoom,
  onSendToIsapres,
  onMarkLost,
  onRecepcionado,
  onConfirmZoomMeeting,
  onOpenFichaModal,
  onNotify,
}: ClientProtocoloFlowViewProps) {
  const router = useRouter();
  const busy = saving || actionBusy;
  const isIsapresHub = activeFlow === "isapres";
  const isPremiumHub = activeFlow === "premium";
  const isZoomFlow = activeFlow === "zoom";
  /** Hub tipo Premium (cápsulas ejecutivas): Premium e Isapres. */
  const isExecutiveHub = isPremiumHub || isIsapresHub;
  const showSidebarSave = isZoomFlow;
  const hasScheduledMeeting = Boolean(client.nextCallAt);
  /** Solo con llamado de confirmación pendiente (post-derivación a Premium). */
  const canConfirmZoomMeeting = Boolean(client.confirmationCallAt);
  const canScheduleOrEditZoom =
    canManageZoom ||
    canManagePremium ||
    canManageIsapres ||
    (hasScheduledMeeting && canEdit);
  const canEditScheduledMeeting = canScheduleOrEditZoom && hasScheduledMeeting;
  /** Agendar solo si aún no hay reunión/llamado; la edición vive en la tarjeta. */
  const showSidebarScheduleZoom =
    canScheduleOrEditZoom && !hasScheduledMeeting;
  const [selectedMemberId, setSelectedMemberId] =
    useState(PRINCIPAL_MEMBER_ID);
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    kind: "additional" | "dependent";
    role: string;
    name: string;
  } | null>(null);
  const [hoverSummary, setHoverSummary] = useState<{
    memberId: string;
    top: number;
    left: number;
  } | null>(null);
  const [fichaPdfOpen, setFichaPdfOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] =
    useState<ClientPipelineStatus | null>(null);
  const [statusChangeNote, setStatusChangeNote] = useState("");
  const [statusChangeBusy, setStatusChangeBusy] = useState(false);

  const principalDisplayName =
    [profileForm.firstNames, profileForm.lastNames]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ") || client.fullName;

  const selectedAdditional =
    profileForm.additionalTitulares.find(
      (titular) => titular.id === selectedMemberId,
    ) ?? null;
  const selectedDependent =
    profileForm.dependents.find(
      (dependent) => dependent.id === selectedMemberId,
    ) ?? null;
  const memberMode: "principal" | "additional" | "dependent" =
    selectedMemberId === PRINCIPAL_MEMBER_ID ||
    (!selectedAdditional && !selectedDependent)
      ? "principal"
      : selectedAdditional
        ? "additional"
        : "dependent";

  function updateField<K extends keyof ClientProfileFormValue>(
    key: K,
    value: ClientProfileFormValue[K],
  ) {
    if (!canEdit) return;
    onProfileChange((current) => {
      if (key === "birthDate" && typeof value === "string") {
        return {
          ...current,
          birthDate: value,
          age: calculateAgeFromBirthDate(value) || current.age,
        };
      }
      return { ...current, [key]: value };
    });
  }

  function updateAdditionalTitular(
    titularId: string,
    patch: Partial<ClientAdditionalTitularProfile>,
  ) {
    if (!canEdit) return;
    onProfileChange((current) => ({
      ...current,
      additionalTitulares: current.additionalTitulares.map((titular) => {
        if (titular.id !== titularId) return titular;
        const next = { ...titular, ...patch };
        if (patch.birthDate !== undefined) {
          next.age =
            calculateAgeFromBirthDate(patch.birthDate) || next.age;
        }
        return next;
      }),
    }));
  }

  function updateDependent(
    dependentId: string,
    patch: Partial<ClientDependentProfile>,
  ) {
    if (!canEdit) return;
    onProfileChange((current) => ({
      ...current,
      dependents: current.dependents.map((dependent) => {
        if (dependent.id !== dependentId) return dependent;
        const next = { ...dependent, ...patch };
        if (patch.birthDate !== undefined) {
          next.age =
            calculateAgeFromBirthDate(patch.birthDate) || next.age;
        }
        return next;
      }),
    }));
  }

  function handleAddTitular() {
    if (!canEdit) return;
    const next = buildEmptyAdditionalTitular();
    onProfileChange((current) => ({
      ...current,
      additionalTitulares: [...current.additionalTitulares, next],
    }));
    setSelectedMemberId(next.id);
  }

  function handleAddCarga() {
    if (!canEdit) return;
    const next = buildEmptyDependent();
    onProfileChange((current) => ({
      ...current,
      dependents: [...current.dependents, next],
    }));
    setSelectedMemberId(next.id);
  }

  function requestRemoveMember(member: {
    id: string;
    kind: "additional" | "dependent";
    role: string;
    name: string;
  }) {
    if (!canEdit || busy) return;
    setPendingRemove({
      id: member.id,
      kind: member.kind,
      role: member.role,
      name: member.name.trim() || "Sin nombre",
    });
  }

  function confirmRemoveMember() {
    if (!pendingRemove || !canEdit || busy) return;
    const { id: memberId, kind } = pendingRemove;
    onProfileChange((current) => {
      if (kind === "additional") {
        return {
          ...current,
          additionalTitulares: current.additionalTitulares.filter(
            (titular) => titular.id !== memberId,
          ),
        };
      }
      return {
        ...current,
        dependents: current.dependents.filter(
          (dependent) => dependent.id !== memberId,
        ),
      };
    });
    if (selectedMemberId === memberId) {
      setSelectedMemberId(PRINCIPAL_MEMBER_ID);
    }
    setPendingRemove(null);
  }

  const activeName =
    memberMode === "principal"
      ? principalDisplayName
      : memberMode === "additional"
        ? [selectedAdditional?.firstNames, selectedAdditional?.lastNames]
            .map((part) => part?.trim())
            .filter(Boolean)
            .join(" ") || ""
        : (selectedDependent?.fullName ?? "");

  const activeRut =
    memberMode === "principal"
      ? profileForm.rut
      : memberMode === "additional"
        ? (selectedAdditional?.rut ?? "")
        : (selectedDependent?.rut ?? "");
  const activeAge =
    memberMode === "principal"
      ? profileForm.age
      : memberMode === "additional"
        ? (selectedAdditional?.age ?? "")
        : (selectedDependent?.age ?? "");
  const activePhone =
    memberMode === "principal"
      ? profileForm.phone
      : memberMode === "additional"
        ? (selectedAdditional?.phone ?? "")
        : "";
  const activeEmail = memberMode === "principal" ? profileForm.email : "";
  const activeEmployerRut =
    memberMode === "principal" ? profileForm.employerRut : "";
  const activeRenta =
    memberMode === "principal"
      ? profileForm.rentaImponible
      : memberMode === "additional"
        ? (selectedAdditional?.rentaImponible ?? "")
        : "";
  const activeIsapre =
    memberMode === "principal"
      ? profileForm.currentIsapre
      : memberMode === "additional"
        ? (selectedAdditional?.currentIsapre ?? "")
        : "";
  const activePlanPrice =
    memberMode === "principal"
      ? profileForm.currentPlanPrice
      : memberMode === "additional"
        ? (selectedAdditional?.currentPlanPrice ?? "")
        : "";
  const activePlanCurrency: ClientMoneyCurrency =
    memberMode === "principal"
      ? profileForm.currentPlanPriceCurrency
      : (selectedAdditional?.currentPlanPriceCurrency ?? "UF");
  const activeVoluntary =
    memberMode === "principal"
      ? profileForm.voluntaryAdditional
      : memberMode === "additional"
        ? (selectedAdditional?.voluntaryAdditional ?? "")
        : "";
  const activeVoluntaryCurrency: ClientMoneyCurrency =
    memberMode === "principal"
      ? profileForm.voluntaryAdditionalCurrency
      : (selectedAdditional?.voluntaryAdditionalCurrency ?? "UF");
  const activePreferredClinics =
    memberMode === "principal" ? profileForm.preferredClinics : "";
  const activeAnualidad =
    memberMode === "principal" ? profileForm.anualidad : false;
  const activeSeguro =
    memberMode === "principal" ? profileForm.segurosComplementarios : "";
  const activePreexistencia =
    memberMode === "principal"
      ? profileForm.preexistenciasMedicas
      : memberMode === "additional"
        ? (selectedAdditional?.preexistenciasMedicas ?? "")
        : (selectedDependent?.preexistenciasMedicas ?? "");
  const activeMotivo =
    memberMode === "principal"
      ? profileForm.motivoCotizacion
      : memberMode === "additional"
        ? (selectedAdditional?.motivoCotizacion ?? "")
        : "";
  const activeMotivoOther =
    memberMode === "principal"
      ? profileForm.motivoCotizacionOther
      : memberMode === "additional"
        ? (selectedAdditional?.motivoCotizacionOther ?? "")
        : "";

  const hasSeguroCompl = activeSeguro.trim().length > 0;
  const hasPreexistencia = activePreexistencia.trim().length > 0;
  const showTitularPlanFields =
    memberMode === "principal" || memberMode === "additional";
  const showPrincipalOnlyFields = memberMode === "principal";

  function setActiveName(raw: string) {
    if (!canEdit) return;
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (memberMode === "principal") {
      onProfileChange((current) => {
        if (parts.length <= 1) {
          return {
            ...current,
            firstNames: raw,
            lastNames: parts.length === 0 ? "" : current.lastNames,
          };
        }
        const last = parts.pop() ?? "";
        return {
          ...current,
          firstNames: parts.join(" "),
          lastNames: last,
        };
      });
      return;
    }
    if (memberMode === "additional" && selectedAdditional) {
      if (parts.length <= 1) {
        updateAdditionalTitular(selectedAdditional.id, {
          firstNames: raw,
          lastNames: parts.length === 0 ? "" : selectedAdditional.lastNames,
        });
        return;
      }
      const last = parts.pop() ?? "";
      updateAdditionalTitular(selectedAdditional.id, {
        firstNames: parts.join(" "),
        lastNames: last,
      });
      return;
    }
    if (memberMode === "dependent" && selectedDependent) {
      updateDependent(selectedDependent.id, { fullName: raw });
    }
  }

  function setActiveRut(value: string) {
    if (memberMode === "principal") updateField("rut", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, { rut: value });
    } else if (memberMode === "dependent" && selectedDependent) {
      updateDependent(selectedDependent.id, { rut: value });
    }
  }

  function setActiveAge(value: string) {
    if (memberMode === "principal") updateField("age", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, { age: value });
    } else if (memberMode === "dependent" && selectedDependent) {
      updateDependent(selectedDependent.id, { age: value });
    }
  }

  function setActivePhone(value: string) {
    if (memberMode === "principal") updateField("phone", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, { phone: value });
    }
  }

  function setActiveRenta(value: string) {
    if (memberMode === "principal") updateField("rentaImponible", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, { rentaImponible: value });
    }
  }

  function setActiveIsapre(value: string) {
    if (memberMode === "principal") updateField("currentIsapre", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, { currentIsapre: value });
    }
  }

  function setActivePlanPrice(value: string) {
    if (memberMode === "principal") updateField("currentPlanPrice", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, {
        currentPlanPrice: value,
      });
    }
  }

  function setActivePlanCurrency(value: ClientMoneyCurrency) {
    if (memberMode === "principal") {
      updateField("currentPlanPriceCurrency", value);
    } else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, {
        currentPlanPriceCurrency: value,
      });
    }
  }

  function setActiveVoluntary(value: string) {
    if (memberMode === "principal") updateField("voluntaryAdditional", value);
    else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, {
        voluntaryAdditional: value,
      });
    }
  }

  function setActiveVoluntaryCurrency(value: ClientMoneyCurrency) {
    if (memberMode === "principal") {
      updateField("voluntaryAdditionalCurrency", value);
    } else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, {
        voluntaryAdditionalCurrency: value,
      });
    }
  }

  function setActivePreexistencia(value: string) {
    if (memberMode === "principal") {
      updateField("preexistenciasMedicas", value);
    } else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, {
        preexistenciasMedicas: value,
      });
    } else if (memberMode === "dependent" && selectedDependent) {
      updateDependent(selectedDependent.id, { preexistenciasMedicas: value });
    }
  }

  function toggleActiveMotivo(motivoId: string) {
    if (!canEdit) return;
    if (memberMode === "principal") {
      onProfileChange((current) => {
        const nextMotivo = toggleMotivoCotizacionId(
          current.motivoCotizacion,
          motivoId,
        );
        return {
          ...current,
          motivoCotizacion: nextMotivo,
          motivoCotizacionOther: motivoCotizacionIncludesOtros(nextMotivo)
            ? current.motivoCotizacionOther
            : "",
        };
      });
      return;
    }
    if (memberMode === "additional" && selectedAdditional) {
      const nextMotivo = toggleMotivoCotizacionId(
        selectedAdditional.motivoCotizacion,
        motivoId,
      );
      updateAdditionalTitular(selectedAdditional.id, {
        motivoCotizacion: nextMotivo,
        motivoCotizacionOther: motivoCotizacionIncludesOtros(nextMotivo)
          ? selectedAdditional.motivoCotizacionOther
          : "",
      });
    }
  }

  function setActiveMotivoOther(value: string) {
    if (memberMode === "principal") {
      updateField("motivoCotizacionOther", value);
    } else if (memberMode === "additional" && selectedAdditional) {
      updateAdditionalTitular(selectedAdditional.id, {
        motivoCotizacionOther: value,
      });
    }
  }

  const familyMembers: Array<{
    id: string;
    kind: "principal" | "additional" | "dependent";
    role: string;
    badge: string;
    name: string;
    rut: string;
    age: string;
    renta: string;
    prevision: string;
    pay: string;
  }> = [
    {
      id: PRINCIPAL_MEMBER_ID,
      kind: "principal",
      role: "Titular 1",
      badge: "TITULAR",
      name: principalDisplayName,
      rut: profileForm.rut || client.rut || "—",
      age: formatAgeLabel(profileForm.age),
      renta: formatRentaLabel(profileForm.rentaImponible),
      prevision: resolveCurrentCoverageLabel(profileForm.currentIsapre),
      pay: formatPlanPayLabel(
        profileForm.currentPlanPrice,
        profileForm.currentPlanPriceCurrency,
      ),
    },
    ...profileForm.additionalTitulares.map((titular, index) => ({
      id: titular.id || `titular-${index}`,
      kind: "additional" as const,
      role: `Titular ${index + 2}`,
      badge: "TITULAR",
      name:
        [titular.firstNames, titular.lastNames]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" ") || "Sin nombre",
      rut: titular.rut || "—",
      age: formatAgeLabel(titular.age),
      renta: formatRentaLabel(titular.rentaImponible),
      prevision: resolveCurrentCoverageLabel(titular.currentIsapre),
      pay: formatPlanPayLabel(
        titular.currentPlanPrice,
        titular.currentPlanPriceCurrency,
      ),
    })),
    ...profileForm.dependents.map((dependent, index) => ({
      id: dependent.id || `carga-${index}`,
      kind: "dependent" as const,
      role: `Carga ${index + 1}`,
      badge: "CARGA",
      name: dependent.fullName.trim() || "Sin nombre",
      rut: dependent.rut.trim() || "—",
      age: formatAgeLabel(dependent.age),
      renta: "—",
      prevision: "—",
      pay: "—",
    })),
  ];

  const flowLabel =
    activeFlow === "zoom"
      ? "Ejecutivo Zoom"
      : activeFlow === "premium"
        ? "Ejecutivo Premium"
        : activeFlow === "isapres"
          ? "Ejecutivo Isapre"
          : "Seguimiento";

  const statusOptions = CLIENT_PIPELINE_STATUS_OPTIONS.includes(pipelineStatus)
    ? CLIENT_PIPELINE_STATUS_OPTIONS
    : ([pipelineStatus, ...CLIENT_PIPELINE_STATUS_OPTIONS] as ClientPipelineStatus[]);

  function closeStatusChangeModal() {
    if (statusChangeBusy) return;
    setPendingStatusChange(null);
    setStatusChangeNote("");
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange || statusChangeBusy) return;
    const note = statusChangeNote.trim();
    if (!note) {
      onNotify("Indica el motivo del cambio de estatus.", "error");
      return;
    }
    setStatusChangeBusy(true);
    try {
      await onManualStatusChange(pendingStatusChange, note);
      setPendingStatusChange(null);
      setStatusChangeNote("");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estatus.",
        "error",
      );
    } finally {
      setStatusChangeBusy(false);
    }
  }

  return (
    <div className="-mx-3 -mb-5 -mt-5 flex flex-col sm:-mx-4 sm:-mb-7 sm:-mt-7 lg:-mx-5 lg:-mb-8 lg:-mt-8 lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)] lg:overflow-hidden">
      <AdminFormModal
        open={Boolean(pendingStatusChange)}
        title="Cambiar estatus"
        description={
          pendingStatusChange
            ? `De ${CLIENT_PIPELINE_STATUS_LABELS[pipelineStatus]} a ${CLIENT_PIPELINE_STATUS_LABELS[pendingStatusChange]}. Indica el motivo del cambio manual.`
            : undefined
        }
        onClose={closeStatusChangeModal}
        size="md"
        overlayClassName="z-[80]"
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Motivo *</span>
            <textarea
              value={statusChangeNote}
              onChange={(event) => setStatusChangeNote(event.target.value)}
              rows={3}
              placeholder="Ej. Cliente retomó contacto y retomamos seguimiento"
              className={joinClasses(
                "min-h-[5rem] w-full resize-y rounded-xl px-3 py-2.5 text-sm",
                ui.input,
              )}
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={statusChangeBusy}
              onClick={closeStatusChangeModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={statusChangeBusy}
              onClick={() => void confirmStatusChange()}
            >
              {statusChangeBusy ? "Guardando…" : "Confirmar cambio"}
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <AdminFormModal
        open={Boolean(pendingRemove)}
        title="Eliminar del grupo familiar"
        description={
          pendingRemove
            ? `¿Confirmas eliminar a ${pendingRemove.name} (${pendingRemove.role})? Esta acción se aplicará al guardar la ficha.`
            : undefined
        }
        onClose={() => setPendingRemove(null)}
        size="md"
        headerTone="navy"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPendingRemove(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!canEdit || busy}
            onClick={confirmRemoveMember}
          >
            Eliminar
          </Button>
        </div>
      </AdminFormModal>

      <ClientFichaPdfModal
        client={client}
        open={fichaPdfOpen}
        onClose={() => setFichaPdfOpen(false)}
        onNotify={onNotify}
      />

      {/* Barra superior: full-bleed bajo el menú (fija en lg) */}
      <div className="shrink-0 border-b border-border bg-white px-3 pb-3 pt-5 sm:px-4 sm:pt-7 lg:px-5 lg:pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 shrink-0 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark/60">
              Isapres Premium
            </p>
            <h2 className="text-sm font-semibold text-foreground">
              Rol · {flowLabel}
            </h2>
          </div>
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetaCell label="Cliente">
              <span className="block truncate text-xl font-bold tracking-tight text-[color:var(--dash-navy,#092558)] sm:text-2xl">
                {formatPersonDisplayName(principalDisplayName)}
              </span>
            </MetaCell>
            <MetaCell label="Ejecutivo asignado">
              {client.assignedExecutiveName?.trim() || "Sin asignar"}
            </MetaCell>
            <MetaCell label="Estado">
              {canEdit ? (
                <label className="block min-w-0">
                  <span className="sr-only">Estado del cliente</span>
                  <select
                    value={pipelineStatus}
                    disabled={busy || statusChangeBusy}
                    onChange={(event) => {
                      const next = event.target.value as ClientPipelineStatus;
                      if (next === pipelineStatus) return;
                      setPendingStatusChange(next);
                      setStatusChangeNote("");
                    }}
                    className={joinClasses(
                      "h-9 w-full max-w-[12rem] rounded-lg px-2.5 text-sm font-semibold",
                      ui.input,
                    )}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {CLIENT_PIPELINE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <ClientPipelineStatusBadge status={pipelineStatus} />
              )}
            </MetaCell>
            <MetaCell label="Fecha creación">
              {formatShortDate(client.createdAt)}
            </MetaCell>
            <MetaCell label="Última gestión">
              {formatShortDateTime(client.updatedAt)}
            </MetaCell>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)] lg:overflow-hidden">
        {/* Columna izquierda (fija en lg; scroll interno si hay muchas cargas) */}
        <aside className="flex flex-col border-b border-border bg-white px-3 py-4 sm:px-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-dark">
              Grupo familiar
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!canEdit || busy}
                onClick={handleAddTitular}
                className="justify-start gap-2 border border-border"
              >
                <IconUserPlus className="size-3.5" />
                Agregar titular
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!canEdit || busy}
                onClick={handleAddCarga}
                className="justify-start gap-2 border border-border"
              >
                <IconUser className="size-3.5" />
                Agregar carga
              </Button>
            </div>
            <ul className="space-y-2">
              {familyMembers.map((member) => {
                const selected = selectedMemberId === member.id;
                const canRemove =
                  canEdit &&
                  !busy &&
                  (member.kind === "additional" || member.kind === "dependent");
                const isTitular =
                  member.kind === "principal" || member.kind === "additional";
                return (
                  <li
                    key={member.id}
                    className="relative"
                    onMouseEnter={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const panelWidth = 224;
                      const gap = 8;
                      const left =
                        rect.right + gap + panelWidth > window.innerWidth
                          ? Math.max(8, rect.left - panelWidth - gap)
                          : rect.right + gap;
                      const top = Math.min(
                        Math.max(8, rect.top),
                        window.innerHeight - 180,
                      );
                      setHoverSummary({
                        memberId: member.id,
                        top,
                        left,
                      });
                    }}
                    onMouseLeave={() => setHoverSummary(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      aria-pressed={selected}
                      className={joinClasses(
                        "w-full rounded-xl border px-2.5 py-2 text-left transition",
                        canRemove ? "pr-8" : "",
                        selected
                          ? "border-primary/40 bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_14%,white)] shadow-sm"
                          : "border-border/80 bg-bg-layout/40 hover:border-primary/25",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {member.role}
                        </p>
                        <span className="shrink-0 rounded-full bg-primary-dark/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-dark">
                          {member.badge}
                        </span>
                      </div>
                      <dl className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-muted">
                        <div className="flex justify-between gap-2">
                          <dt className="shrink-0">Edad</dt>
                          <dd className="truncate font-medium text-foreground/85">
                            {member.age}
                          </dd>
                        </div>
                        {isTitular ? (
                          <>
                            <div className="flex justify-between gap-2">
                              <dt className="shrink-0">Renta</dt>
                              <dd className="truncate font-medium text-foreground/85">
                                {member.renta}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="shrink-0">Previsión</dt>
                              <dd className="truncate font-medium text-foreground/85">
                                {member.prevision}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt className="shrink-0">Paga</dt>
                              <dd className="truncate font-medium text-foreground/85">
                                {member.pay}
                              </dd>
                            </div>
                          </>
                        ) : null}
                      </dl>
                    </button>

                    {canRemove &&
                    (member.kind === "additional" ||
                      member.kind === "dependent") ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setHoverSummary(null);
                          requestRemoveMember({
                            id: member.id,
                            kind:
                              member.kind === "additional"
                                ? "additional"
                                : "dependent",
                            role: member.role,
                            name: member.name,
                          });
                        }}
                        title={`Eliminar ${member.role.toLowerCase()}`}
                        aria-label={`Eliminar ${member.role}: ${member.name || "sin nombre"}`}
                        className="absolute right-1.5 top-1.5 z-10 inline-flex size-6 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                      >
                        <span
                          className="text-base font-bold leading-none"
                          aria-hidden
                        >
                          ×
                        </span>
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {typeof document !== "undefined" &&
          hoverSummary &&
          (() => {
            const member = familyMembers.find(
              (row) => row.id === hoverSummary.memberId,
            );
            if (!member) return null;
            const isTitular =
              member.kind === "principal" || member.kind === "additional";
            return createPortal(
              <div
                role="tooltip"
                className="pointer-events-none fixed z-[80] w-56 rounded-xl border border-border bg-white p-3 shadow-xl"
                style={{ top: hoverSummary.top, left: hoverSummary.left }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary-dark/60">
                  {member.role}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[color:var(--dash-navy,#092558)]">
                  {formatPersonDisplayName(member.name, member.name)}
                </p>
                <p className="truncate text-xs text-muted">RUT {member.rut}</p>
                <dl className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-muted">
                  <div className="flex justify-between gap-2">
                    <dt>Edad</dt>
                    <dd className="font-medium text-foreground">{member.age}</dd>
                  </div>
                  {isTitular ? (
                    <>
                      <div className="flex justify-between gap-2">
                        <dt>Renta</dt>
                        <dd className="max-w-[8rem] truncate font-medium text-foreground">
                          {member.renta}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Previsión</dt>
                        <dd className="max-w-[8rem] truncate font-medium text-foreground">
                          {member.prevision}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Paga</dt>
                        <dd className="max-w-[8rem] truncate font-medium text-foreground">
                          {member.pay}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              </div>,
              document.body,
            );
          })()}

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {(isZoomFlow || isPremiumHub || isIsapresHub) && (
              <SidebarActionGroup title="Derivación">
                {isZoomFlow ? (
                  <SidebarAction
                    tone="navy"
                    disabled={busy}
                    onClick={onRedirectPremium}
                    icon={<IconUserPlus className="size-3.5" />}
                    label="Asignar Premium"
                    title="Asignar Ejecutivo Premium"
                  />
                ) : null}
                {isPremiumHub ? (
                  <>
                    <SidebarAction
                      tone="sky"
                      disabled={busy}
                      onClick={onSendToZoom}
                      icon={<IconHeadset className="size-3.5" />}
                      label="Derivar a Zoom"
                      title="Derivar a Ejecutivo Zoom"
                    />
                    <SidebarAction
                      tone="emerald"
                      disabled={busy}
                      onClick={onSendToIsapres}
                      icon={<IconExecutive className="size-3.5" />}
                      label="Derivar a Isapre"
                      title="Derivar a Ejecutivo Isapre"
                    />
                  </>
                ) : null}
                {isIsapresHub ? (
                  <SidebarAction
                    tone="navy"
                    disabled={busy}
                    onClick={onRedirectPremium}
                    icon={<IconUserPlus className="size-3.5" />}
                    label="Devolver a Premium"
                    title="Redirigir a Ejecutivo Isapre Premium"
                  />
                ) : null}
              </SidebarActionGroup>
            )}

            <SidebarActionGroup title="Gestión">
              {isExecutiveHub ? (
                <SidebarAction
                  tone="navy"
                  disabled={busy}
                  onClick={() => {
                    if (busy) return;
                    router.push(staffCotizadorClientHref(client.id));
                  }}
                  icon={<IconCalculator className="size-3.5" />}
                  label="Abrir cotizador"
                />
              ) : null}
              {showSidebarScheduleZoom ? (
                <SidebarAction
                  tone="sky"
                  disabled={busy}
                  onClick={onScheduleZoom}
                  icon={<IconCalendar className="size-3.5" />}
                  label="Agendar Zoom"
                />
              ) : null}
              {canConfirmZoomMeeting ? (
                <SidebarAction
                  tone="emerald"
                  disabled={busy}
                  onClick={onConfirmZoomMeeting}
                  icon={<IconCalendarCheck className="size-3.5" />}
                  label="Confirmar Zoom"
                  title="Confirmar reunión Zoom"
                />
              ) : null}
              {client.advisedPlan ? (
                <SidebarAction
                  tone="whatsapp"
                  disabled={busy || !whatsappUrl}
                  onClick={onWhatsApp}
                  icon={<IconWhatsApp className="size-3.5" />}
                  label="Cotización"
                  title="Cotización WhatsApp"
                />
              ) : null}
              <SidebarAction
                tone="slate"
                disabled={busy}
                onClick={onCallback}
                icon={<IconPhone className="size-3.5" />}
                label="Volver a llamar"
              />
              <SidebarAction
                tone="amber"
                disabled={busy}
                onClick={onNoAnswer}
                icon={<IconPhoneOff className="size-3.5" />}
                label="No contestó"
              />
              <SidebarAction
                tone="amber"
                disabled={busy}
                onClick={onReminder}
                icon={<IconBell className="size-3.5" />}
                label="Recordatorio"
              />
              {(canManageZoom || canManagePremium || canManageIsapres) && (
                <SidebarAction
                  tone="danger"
                  disabled={busy}
                  onClick={onMarkLost}
                  icon={<IconUser className="size-3.5" />}
                  label="Cliente perdido"
                />
              )}
              {isIsapresHub ? (
                <SidebarAction
                  tone="green"
                  disabled={busy}
                  onClick={onRecepcionado}
                  icon={<IconCalendarCheck className="size-3.5" />}
                  label="Recepcionado"
                  title={
                    pipelineStatus === "RECEPCIONADO"
                      ? "Ver registro de recepcionado"
                      : "Marcar cliente como recepcionado"
                  }
                />
              ) : null}
            </SidebarActionGroup>

            <SidebarActionGroup title="Ficha">
              <SidebarAction
                tone="slate"
                disabled={busy}
                onClick={() => {
                  if (busy) return;
                  setFichaPdfOpen(true);
                }}
                icon={<IconClipboard className="size-3.5" />}
                label="Ver ficha PDF"
              />
              {showSidebarSave ? (
                <SidebarAction
                  tone="green"
                  size="lg"
                  disabled={!canEdit || busy || !hasUnsavedChanges}
                  onClick={onSave}
                  label={busy ? "Guardando…" : "Guardar cambios"}
                />
              ) : null}
              <SidebarAction
                tone="danger"
                disabled={busy}
                onClick={() => {
                  if (busy) return;
                  onBack();
                }}
                icon={<IconArrowLeft className="size-3.5" />}
                label="Volver"
              />
            </SidebarActionGroup>
          </div>
        </aside>

        {/* Main: cápsulas Premium/Isapres · formulario ZOOM/otros */}
        <div className="min-h-0 min-w-0 px-3 py-4 sm:px-4 lg:overflow-y-auto lg:overscroll-contain lg:px-5">
        {isExecutiveHub ? (
          <div className="space-y-4">
            <ClientZoomScheduleCard
              client={client}
              mode="meeting"
              canEdit={canEditScheduledMeeting}
              editDisabled={busy}
              onEdit={onScheduleZoom}
              canComplete={canEditScheduledMeeting}
              completeDisabled={busy}
              onComplete={onMeetingDone}
            />
            <ClientPremiumExecutiveCapsules
              client={client}
              profileForm={profileForm}
              canEdit={canEdit}
              meetingNote={meetingNote}
              onOpenModal={(modal) => onOpenFichaModal?.(modal)}
            />
          </div>
        ) : (
        <div className="space-y-4">
          {/* Zoom: reunión agendada (nextCallAt) — el ejecutivo llama para confirmar */}
          {isZoomFlow ? (
            <ClientZoomScheduleCard
              client={client}
              mode="meeting"
              canEdit={canEditScheduledMeeting}
              editDisabled={busy}
              onEdit={onScheduleZoom}
              canComplete={canEditScheduledMeeting}
              completeDisabled={busy}
              onComplete={onMeetingDone}
            />
          ) : (
            <ClientZoomScheduleCard client={client} mode="confirmation" />
          )}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-card sm:p-5">
          {memberMode === "dependent" ? (
            <SectionCard number={1} title="Datos de la carga">
              <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                <label className="block space-y-1 sm:col-span-2">
                  <FieldLabel>Nombre</FieldLabel>
                  <Input
                    value={activeName}
                    disabled={!canEdit}
                    onChange={(event) => setActiveName(event.target.value)}
                    placeholder="Nombre de la carga"
                  />
                </label>
                <label className="block space-y-1">
                  <FieldLabel>Edad</FieldLabel>
                  <Input
                    value={activeAge}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/[^\d]/g, "");
                      setActiveAge(digits);
                    }}
                    placeholder="Ej. 12"
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <FieldLabel>Enfermedades o preexistencias</FieldLabel>
                  <Input
                    value={activePreexistencia}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setActivePreexistencia(event.target.value)
                    }
                    placeholder="Ej. asma, alergias… (dejar vacío si no aplica)"
                  />
                </label>
              </div>
            </SectionCard>
          ) : (
          <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-x-6 lg:gap-y-5">
          <SectionCard
            number={1}
            title="Datos personales"
            className="lg:border-r lg:border-primary-dark/10 lg:pr-6"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2">
                <FieldLabel>Nombre completo</FieldLabel>
                <Input
                  value={activeName}
                  disabled={!canEdit}
                  onChange={(event) => setActiveName(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <FieldLabel>RUT</FieldLabel>
                <Input
                  value={activeRut}
                  disabled={!canEdit}
                  onChange={(event) => setActiveRut(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <FieldLabel>Edad</FieldLabel>
                <Input
                  value={activeAge}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/[^\d]/g, "");
                    setActiveAge(digits);
                  }}
                  placeholder="Ej. 37"
                />
              </label>
              <label className="block space-y-1">
                <FieldLabel>Teléfono</FieldLabel>
                <div className="relative">
                  <Input
                    value={activePhone}
                    disabled={!canEdit}
                    onChange={(event) => setActivePhone(event.target.value)}
                    className="pr-10"
                  />
                  {showPrincipalOnlyFields && whatsappUrl ? (
                    <button
                      type="button"
                      onClick={onWhatsApp}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#25D366]"
                      title="WhatsApp"
                      aria-label="Abrir WhatsApp"
                    >
                      <IconWhatsApp className="size-4" />
                    </button>
                  ) : null}
                </div>
              </label>
              {showPrincipalOnlyFields ? (
                <label className="block space-y-1">
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    type="email"
                    value={activeEmail}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                  />
                </label>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            number={2}
            title="Información laboral"
            className="border-t border-primary-dark/10 pt-5 lg:border-t-0 lg:pt-0"
          >
            <div className="space-y-3">
              {showPrincipalOnlyFields ? (
                <label className="block space-y-1">
                  <FieldLabel>RUT empleador</FieldLabel>
                  <Input
                    value={activeEmployerRut}
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateField("employerRut", event.target.value)
                    }
                  />
                </label>
              ) : null}
              <label className="block space-y-1">
                <FieldLabel>Renta imponible</FieldLabel>
                <Input
                  value={activeRenta}
                  disabled={!canEdit}
                  onChange={(event) => setActiveRenta(event.target.value)}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            number={3}
            title="Información del plan actual"
            className="border-t border-primary-dark/10 pt-5 lg:border-r lg:pr-6"
          >
            <div className="grid gap-4 xl:grid-cols-2 xl:gap-6">
              <div className="space-y-3">
                <label className="block space-y-1">
                  <FieldLabel>Isapre actual</FieldLabel>
                  <Select
                    value={resolveCurrentCoverageId(activeIsapre)}
                    disabled={!canEdit}
                    placeholder="Selecciona…"
                    options={CURRENT_COVERAGE_OPTIONS.map((option) => ({
                      value: option.id,
                      label: option.label,
                    }))}
                    onChange={(event) => setActiveIsapre(event.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <FieldLabel>Valor plan</FieldLabel>
                  <div className="flex min-w-0 items-center gap-2">
                    <Input
                      value={activePlanPrice}
                      disabled={!canEdit}
                      inputMode="decimal"
                      onChange={(event) =>
                        setActivePlanPrice(event.target.value)
                      }
                      className="min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        setActivePlanCurrency(
                          activePlanCurrency === "UF" ? "CLP" : "UF",
                        )
                      }
                      className={joinClasses(
                        "inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition",
                        activePlanCurrency === "UF"
                          ? "border-primary/30 bg-primary/10 text-primary-dark hover:bg-primary/15"
                          : "border-secondary/30 bg-secondary-muted/50 text-secondary hover:bg-secondary-muted",
                        !canEdit && "cursor-not-allowed opacity-60",
                      )}
                      title={`Moneda: ${activePlanCurrency}. Clic para cambiar.`}
                      aria-label={`Moneda ${activePlanCurrency}`}
                    >
                      {activePlanCurrency === "UF" ? "UF" : "$"}
                    </button>
                  </div>
                </label>
                <label className="block space-y-1">
                  <FieldLabel>Adicional voluntario</FieldLabel>
                  <div className="flex min-w-0 items-center gap-2">
                    <Input
                      value={activeVoluntary}
                      disabled={!canEdit}
                      inputMode="decimal"
                      onChange={(event) =>
                        setActiveVoluntary(event.target.value)
                      }
                      className="min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        setActiveVoluntaryCurrency(
                          activeVoluntaryCurrency === "UF" ? "CLP" : "UF",
                        )
                      }
                      className={joinClasses(
                        "inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition",
                        activeVoluntaryCurrency === "UF"
                          ? "border-primary/30 bg-primary/10 text-primary-dark hover:bg-primary/15"
                          : "border-secondary/30 bg-secondary-muted/50 text-secondary hover:bg-secondary-muted",
                        !canEdit && "cursor-not-allowed opacity-60",
                      )}
                      title={`Moneda: ${activeVoluntaryCurrency}. Clic para cambiar.`}
                      aria-label={`Moneda ${activeVoluntaryCurrency}`}
                    >
                      {activeVoluntaryCurrency === "UF" ? "UF" : "$"}
                    </button>
                  </div>
                </label>
                {showPrincipalOnlyFields ? (
                  <>
                    <YesNoRow
                      label="Seguro complementario"
                      value={hasSeguroCompl}
                      disabled={!canEdit}
                      onChange={(next) => {
                        updateField(
                          "segurosComplementarios",
                          next ? activeSeguro.trim() || "Sí" : "",
                        );
                      }}
                    />
                    {hasSeguroCompl ? (
                      <label className="block space-y-1">
                        <FieldLabel>Nombre / detalle del seguro</FieldLabel>
                        <Input
                          value={activeSeguro}
                          disabled={!canEdit}
                          onChange={(event) =>
                            updateField(
                              "segurosComplementarios",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="space-y-3">
                {showPrincipalOnlyFields ? (
                  <>
                    <label className="block space-y-1">
                      <FieldLabel>Clínicas de preferencia</FieldLabel>
                      <Input
                        value={activePreferredClinics}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateField("preferredClinics", event.target.value)
                        }
                      />
                    </label>
                    <YesNoRow
                      label="Anualidad"
                      value={activeAnualidad}
                      disabled={!canEdit}
                      onChange={(next) => updateField("anualidad", next)}
                    />
                  </>
                ) : null}
                <YesNoRow
                  label="Preexistencias"
                  value={hasPreexistencia}
                  disabled={!canEdit}
                  onChange={(next) => {
                    setActivePreexistencia(
                      next ? activePreexistencia.trim() || "Sí" : "",
                    );
                  }}
                />
                {hasPreexistencia ? (
                  <label className="block space-y-1">
                    <FieldLabel>Describe las preexistencias</FieldLabel>
                    <textarea
                      value={activePreexistencia}
                      disabled={!canEdit}
                      rows={2}
                      onChange={(event) =>
                        setActivePreexistencia(event.target.value)
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            number={4}
            title="Motivo de cotización"
            className="border-t border-primary-dark/10 pt-5"
          >
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {CLIENT_MOTIVO_COTIZACION_OPTIONS.map((option) => {
                  const selected = motivoCotizacionIncludes(
                    activeMotivo,
                    option.id,
                  );
                  return (
                    <label
                      key={option.id}
                      className={joinClasses(
                        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                        selected
                          ? "border-primary/40 bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_12%,white)] font-semibold text-primary-dark"
                          : "border-border bg-white text-foreground hover:border-primary/25",
                        !canEdit && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-[color:var(--dash-navy)]"
                        checked={selected}
                        disabled={!canEdit}
                        onChange={() => toggleActiveMotivo(option.id)}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              {motivoCotizacionIncludesOtros(activeMotivo) ? (
                <label className="block space-y-1">
                  <FieldLabel>Detalle de Otros</FieldLabel>
                  <Input
                    value={activeMotivoOther}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setActiveMotivoOther(event.target.value)
                    }
                    placeholder="Describe el motivo…"
                  />
                </label>
              ) : null}

              <div className="space-y-3 border-t border-primary-dark/10 pt-4">
                <header className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-dark text-xs font-bold text-white">
                    5
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-primary-dark">
                    Observaciones del ejecutivo
                  </h3>
                </header>
                <textarea
                  value={meetingNote}
                  disabled={!canEdit}
                  rows={2}
                  onChange={(event) => onMeetingNoteChange(event.target.value)}
                  placeholder="Notas de la gestión o reunión…"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="space-y-3 border-t border-primary-dark/10 pt-4">
                <header className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-dark text-xs font-bold text-white">
                    6
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-primary-dark">
                    Documentos
                  </h3>
                </header>
                <ClientDocumentsSection
                  clientId={client.id}
                  canEdit={canEdit && !busy}
                  onNotify={onNotify}
                  bare
                />
              </div>
            </div>
          </SectionCard>
          </div>
          )}
        </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}
