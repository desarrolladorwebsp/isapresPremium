"use client";

import type { ReactNode } from "react";
import {
  IconCalendar,
  IconCalendarCheck,
  IconClock,
  IconUser,
} from "@/components/executive/executive-icons";
import { Button } from "@/components/ui/button";
import {
  extractPipelineNoteStamp,
  listPipelineModificationLines,
  stripPipelineNotePrefix,
} from "@/lib/client-pipeline/note-stamp";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import { joinClasses } from "@/lib/utils";
import { CLIENT_CONTACT_METHOD_LABELS } from "@/types/client-pipeline";
import type { ExecutiveKind } from "@/types/staff-account";
import type { UserRecord } from "@/types/user";

const TZ = "America/Santiago";

export type ClientScheduleCardMode = "meeting" | "confirmation";

type ScheduleParts = {
  dateLabel: string;
  weekdayLabel: string;
  timeLabel: string;
  durationLabel: string;
  statusLabel: string;
  statusTitle: string;
  scheduledByName: string;
  scheduledByRole: string;
  ariaLabel: string;
  isWhatsApp: boolean;
};

function capitalizeEs(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function roleLabelForKind(
  kind: ExecutiveKind | null | undefined,
  fallback = "Ejecutivo",
): string {
  switch (kind) {
    case "ZOOM":
      return "Ejecutivo Zoom";
    case "ISAPRES_PREMIUM":
    case "MEMBRESIA_ISAPRES_PREMIUM":
      return "Ejecutivo Premium";
    case "ISAPRES":
      return "Ejecutivo Isapre";
    default:
      return fallback;
  }
}

/** Quién dejó la última nota de Agendado/Reagendado en el historial. */
function schedulerFromPipelineNotes(
  notes: string | null | undefined,
): string | null {
  for (const line of listPipelineModificationLines(notes)) {
    const body = stripPipelineNotePrefix(line);
    if (!/^(Agendado|Reagendado)\s+para\b/i.test(body)) continue;
    const stamp = extractPipelineNoteStamp(line);
    const who = stamp?.match(/·\s*([^\]]+)\]/)?.[1]?.trim();
    if (who) return who;
  }
  return null;
}

function resolveScheduledBy(client: UserRecord): {
  name: string;
  role: string;
} {
  const fromNotes = schedulerFromPipelineNotes(client.pipelineNotes);
  if (fromNotes) {
    const normalized = fromNotes.toLocaleLowerCase("es-CL");
    const matchesAssigned =
      client.assignedExecutiveName?.trim().toLocaleLowerCase("es-CL") ===
      normalized;
    const matchesTracking =
      client.trackingExecutiveName?.trim().toLocaleLowerCase("es-CL") ===
      normalized;
    return {
      name: formatPersonDisplayName(fromNotes, fromNotes),
      role: matchesAssigned
        ? roleLabelForKind(client.assignedExecutiveKind)
        : matchesTracking
          ? "Ejecutivo Zoom"
          : roleLabelForKind(client.assignedExecutiveKind, "Ejecutivo"),
    };
  }

  const tracking = client.trackingExecutiveName?.trim();
  if (tracking) {
    return {
      name: formatPersonDisplayName(tracking),
      role: "Ejecutivo Zoom",
    };
  }

  const assigned = client.assignedExecutiveName?.trim();
  if (assigned) {
    return {
      name: formatPersonDisplayName(assigned),
      role: roleLabelForKind(client.assignedExecutiveKind),
    };
  }

  const registered = client.registeredByName?.trim();
  if (registered) {
    return {
      name: formatPersonDisplayName(registered),
      role: "Registro",
    };
  }

  return { name: "", role: "" };
}

function formatScheduleAt(iso: string): Omit<
  ScheduleParts,
  | "durationLabel"
  | "statusLabel"
  | "statusTitle"
  | "scheduledByName"
  | "scheduledByRole"
  | "ariaLabel"
  | "isWhatsApp"
> | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const dateLabel = new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\//g, " / ");

  const weekdayLabel = capitalizeEs(
    new Intl.DateTimeFormat("es-CL", {
      timeZone: TZ,
      weekday: "long",
    }).format(date),
  );

  const timeLabel = `${new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)} hrs`;

  return { dateLabel, weekdayLabel, timeLabel };
}

function parseSchedule(
  client: UserRecord,
  mode: ClientScheduleCardMode,
): ScheduleParts | null {
  const raw =
    mode === "confirmation"
      ? client.confirmationCallAt?.trim()
      : client.nextCallAt?.trim();
  if (!raw) return null;

  const formatted = formatScheduleAt(raw);
  if (!formatted) return null;

  const scheduledBy = resolveScheduledBy(client);

  if (mode === "confirmation") {
    return {
      ...formatted,
      durationLabel: "Llamado de confirmación",
      statusLabel: "AGENDADO",
      statusTitle: "Estado de confirmación",
      scheduledByName: scheduledBy.name,
      scheduledByRole: scheduledBy.role || "Ejecutivo Zoom",
      ariaLabel: "Información del llamado de confirmación",
      isWhatsApp: false,
    };
  }

  const channel = client.preferredContactMethod;
  const isWhatsApp = channel === "WHATSAPP";

  return {
    ...formatted,
    durationLabel: isWhatsApp
      ? "Reunión telefónica / WhatsApp"
      : "Duración estimada: 30 min",
    statusLabel: channel
      ? CLIENT_CONTACT_METHOD_LABELS[channel].toUpperCase()
      : "AGENDADO",
    statusTitle: "Estado de reunión",
    scheduledByName: scheduledBy.name,
    scheduledByRole: scheduledBy.role,
    ariaLabel: "Información de la reunión agendada",
    isWhatsApp,
  };
}

function ScheduleColumn({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "flex min-w-0 flex-col gap-2 px-3 py-3 sm:px-4 sm:py-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[color:var(--dash-cyan,#1ac9ea)]">
          {icon}
        </span>
        <p className="text-[13px] font-bold leading-tight text-[color:var(--dash-navy,#0b1f3a)]">
          {title}
        </p>
      </div>
      <div className="min-h-[2.75rem] pl-0 sm:pl-7">{children}</div>
    </div>
  );
}

type ClientZoomScheduleCardProps = {
  client: UserRecord;
  /** `meeting` = Zoom/teléfono (`nextCallAt`). `confirmation` = llamado de confirmación (`confirmationCallAt`). */
  mode: ClientScheduleCardMode;
  className?: string;
  /** Editar reunión Zoom / llamado WhatsApp (solo modo `meeting`). */
  onEdit?: () => void;
  canEdit?: boolean;
  editDisabled?: boolean;
};

export function ClientZoomScheduleCard({
  client,
  mode,
  className,
  onEdit,
  canEdit = false,
  editDisabled = false,
}: ClientZoomScheduleCardProps) {
  const schedule = parseSchedule(client, mode);
  if (!schedule) return null;

  const showEdit = mode === "meeting" && canEdit && Boolean(onEdit);
  const editLabel = schedule.isWhatsApp
    ? "Editar llamado WhatsApp"
    : "Editar reunión Zoom";

  return (
    <section
      aria-label={schedule.ariaLabel}
      className={joinClasses(
        "overflow-hidden rounded-xl border border-border bg-white shadow-card",
        className,
      )}
    >
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-border">
        <ScheduleColumn
          icon={<IconCalendar className="size-5" />}
          title="Fecha agendada"
        >
          <p className="min-h-[1.35rem] text-[15px] font-bold tabular-nums tracking-wide text-[color:var(--dash-navy,#0b1f3a)] sm:text-base">
            {schedule.dateLabel}
          </p>
          <p className="min-h-[1.1rem] text-sm text-[color:var(--dash-navy,#0b1f3a)]/85">
            {schedule.weekdayLabel}
          </p>
        </ScheduleColumn>

        <ScheduleColumn
          icon={<IconClock className="size-5" />}
          title="Hora agendada"
        >
          <p className="min-h-[1.35rem] text-[15px] font-bold tabular-nums tracking-wide text-[color:var(--dash-navy,#0b1f3a)] sm:text-base">
            {schedule.timeLabel}
          </p>
          <p className="min-h-[1.1rem] text-sm text-[color:var(--dash-navy,#0b1f3a)]/85">
            {schedule.durationLabel}
          </p>
        </ScheduleColumn>

        <ScheduleColumn
          icon={<IconCalendarCheck className="size-5" />}
          title={schedule.statusTitle}
        >
          <span
            className={joinClasses(
              "inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
              schedule.isWhatsApp
                ? "bg-[#25D366]/15 text-[#0f7a4a]"
                : "bg-emerald-100 text-emerald-800",
            )}
          >
            {schedule.statusLabel}
          </span>
        </ScheduleColumn>

        <div
          className={joinClasses(
            "flex min-w-0 items-stretch",
            showEdit ? "gap-1" : null,
          )}
        >
          <ScheduleColumn
            icon={<IconUser className="size-5" />}
            title="Agendado por"
            className="min-w-0 flex-1"
          >
            <p className="min-h-[1.35rem] truncate text-[15px] font-bold text-[color:var(--dash-navy,#0b1f3a)] sm:text-base">
              {schedule.scheduledByName}
            </p>
            <p className="min-h-[1.1rem] truncate text-sm text-[color:var(--dash-navy,#0b1f3a)]/85">
              {schedule.scheduledByRole}
            </p>
          </ScheduleColumn>

          {showEdit ? (
            <div className="flex shrink-0 items-center pr-3 sm:pr-4">
              <Button
                type="button"
                size="sm"
                variant={schedule.isWhatsApp ? "whatsapp" : "info"}
                disabled={editDisabled}
                onClick={onEdit}
                aria-label={editLabel}
                title={editLabel}
                className="shrink-0"
              >
                Editar
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
