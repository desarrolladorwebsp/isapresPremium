"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import {
  CLIENT_PIPELINE_STATUS_DESCRIPTIONS,
  CLIENT_PIPELINE_STATUS_LABELS,
} from "@/lib/client-pipeline/constants";
import {
  clientNoteDisplayText,
  extractPipelineNoteStamp,
  listClientNoteLines,
  listPipelineModificationLines,
} from "@/lib/client-pipeline/note-stamp";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import { joinClasses } from "@/lib/utils";
import {
  CLIENT_CONTACT_METHOD_LABELS,
  type ClientPipelineStatus,
} from "@/types/client-pipeline";
import { CLIENT_ORIGIN_OPTIONS, type UserRecord } from "@/types/user";

/** Embudo principal para la franja de etapa (sin ramas laterales). */
const FUNNEL_STEPS: ClientPipelineStatus[] = [
  "NUEVO",
  "CONTACTADO",
  "EN_SEGUIMIENTO",
  "ENVIADO_ISAPRE",
  "RECEPCIONADO",
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
  }).format(date);
}

function originLabel(client: UserRecord): string {
  const origin = client.clientOrigin;
  if (!origin) return "Sin origen";
  const base =
    CLIENT_ORIGIN_OPTIONS.find((option) => option.value === origin)?.label ??
    origin;
  if (origin === "FORMULARIO_WEB" && client.webFormSource?.trim()) {
    return `${base} · ${client.webFormSource.trim()}`;
  }
  return base;
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
      <div className="text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
        {children}
      </div>
    </div>
  );
}

function RoleCell({
  label,
  value,
  highlight = false,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "space-y-0.5 rounded-xl px-2.5 py-2",
        highlight
          ? "border border-[color:var(--dash-cyan,#1ac9ea)] bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_14%,white)]"
          : "border border-transparent",
        className,
      )}
    >
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary-dark/60">
        {label}
        {highlight ? (
          <span className="rounded-full bg-[color:var(--dash-navy,#092558)] px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-wide text-white">
            Responsable actual
          </span>
        ) : null}
      </dt>
      <dd
        className={joinClasses(
          "text-sm font-semibold",
          highlight
            ? "text-[color:var(--dash-navy,#092558)]"
            : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-white p-4 sm:p-5">
      <header className="space-y-0.5">
        <h3 className="text-sm font-bold text-[color:var(--dash-navy,#092558)]">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function TimelineList({
  lines,
  emptyLabel,
  ariaLabel,
  mode,
}: {
  lines: string[];
  emptyLabel: string;
  ariaLabel: string;
  mode: "history" | "notes";
}) {
  if (lines.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-bg-layout/40 px-3 py-4 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted">
        {lines.length}{" "}
        {lines.length === 1 ? "registro" : "registros"} · más reciente primero
      </p>
      <div
        className="max-h-72 min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg-layout/40 px-3 py-3"
        role="log"
        aria-label={ariaLabel}
      >
        <ol className="relative space-y-0 border-l border-[color:var(--dash-navy,#092558)]/15 pl-4">
          {lines.map((line, index) => {
            const stamp = extractPipelineNoteStamp(line);
            const body =
              mode === "notes"
                ? clientNoteDisplayText(line)
                : stamp
                  ? line.replace(stamp, "").trim()
                  : line;
            return (
              <li
                key={`${index}-${line.slice(0, 32)}`}
                className="relative pb-4 last:pb-0"
              >
                <span
                  className="absolute -left-[1.28rem] top-1.5 size-2.5 rounded-full bg-[color:var(--dash-cyan,#1ac9ea)] ring-4 ring-white"
                  aria-hidden
                />
                {stamp ? (
                  <p className="text-[11px] font-semibold text-primary-dark">
                    {stamp}
                  </p>
                ) : null}
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-foreground">
                  {body || line}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function StageFunnel({ status }: { status: ClientPipelineStatus }) {
  const isSideBranch = status === "NO_CONTESTA" || status === "PERDIDO";
  const currentIndex = FUNNEL_STEPS.indexOf(status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ClientPipelineStatusBadge status={status} />
        <p className="text-sm text-muted">
          {CLIENT_PIPELINE_STATUS_DESCRIPTIONS[status]}
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {FUNNEL_STEPS.map((step, index) => {
          const reached =
            !isSideBranch && currentIndex >= 0 && index <= currentIndex;
          const current = !isSideBranch && step === status;
          return (
            <li
              key={step}
              className={joinClasses(
                "rounded-xl border px-2.5 py-2 text-center",
                current
                  ? "border-[color:var(--dash-cyan,#1ac9ea)] bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_14%,white)] text-[color:var(--dash-navy,#092558)]"
                  : reached
                    ? "border-[color:var(--dash-navy,#092558)]/20 bg-[color-mix(in_srgb,var(--dash-navy,#092558)_6%,white)] text-[color:var(--dash-navy,#092558)]"
                    : "border-border bg-bg-layout/50 text-muted",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                {index + 1}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight sm:text-xs">
                {CLIENT_PIPELINE_STATUS_LABELS[step]}
              </p>
            </li>
          );
        })}
      </ol>

      {isSideBranch ? (
        <p className="text-xs text-muted">
          Estado lateral:{" "}
          <span className="font-semibold text-foreground">
            {CLIENT_PIPELINE_STATUS_LABELS[status]}
          </span>
          . No forma parte del embudo lineal de cierre.
        </p>
      ) : null}
    </div>
  );
}

export interface ClientSeguimientoFlowViewProps {
  client: UserRecord;
  pipelineStatus: ClientPipelineStatus;
  pipelineNotes: string;
  canViewInternalNotes: boolean;
  isTrackingOnly: boolean;
  onBack: () => void;
}

export function ClientSeguimientoFlowView({
  client,
  pipelineStatus,
  pipelineNotes,
  canViewInternalNotes,
  isTrackingOnly,
  onBack,
}: ClientSeguimientoFlowViewProps) {
  const modificationLines = canViewInternalNotes
    ? listPipelineModificationLines(pipelineNotes)
    : [];
  const noteLines = canViewInternalNotes
    ? listClientNoteLines(pipelineNotes)
    : [];
  const closed = client.closedRecord;
  const contactMethod = client.preferredContactMethod
    ? CLIENT_CONTACT_METHOD_LABELS[client.preferredContactMethod]
    : null;
  const responsibleRole: "assigned" | "tracking" | null =
    client.assignedExecutiveName?.trim() || client.assignedExecutiveId
      ? "assigned"
      : client.trackingExecutiveName?.trim() || client.trackingExecutiveId
        ? "tracking"
        : null;

  const agendaRows = [
    {
      label: "Reunión / llamado",
      value: formatDateTime(client.nextCallAt),
      present: Boolean(client.nextCallAt),
    },
    {
      label: "Confirmación Zoom",
      value: formatDateTime(client.confirmationCallAt),
      present: Boolean(client.confirmationCallAt),
    },
    {
      label: "Recordatorio",
      value: formatDateTime(client.reminderAt),
      present: Boolean(client.reminderAt),
      detail: client.reminderNote?.trim() || null,
    },
  ];

  return (
    <div className="-mx-3 -mb-5 -mt-5 flex flex-col sm:-mx-4 sm:-mb-7 sm:-mt-7 lg:-mx-5 lg:-mb-8 lg:-mt-8 lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)] lg:overflow-hidden">
      <div className="shrink-0 border-b border-border bg-white px-3 pb-3 pt-5 sm:px-4 sm:pt-7 lg:px-5 lg:pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onBack}
              className="mt-0.5 shrink-0 justify-center gap-2 border border-border"
            >
              Volver
            </Button>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark/60">
                Isapres Premium
              </p>
              <h2 className="text-sm font-semibold text-foreground">
                Rol · Seguimiento
              </h2>
              {isTrackingOnly ? (
                <p className="text-xs text-amber-800">
                  Post-derivación: mantén el seguimiento hasta el cierre.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaCell label="Cliente">
              <span className="block truncate text-xl font-bold tracking-tight text-[color:var(--dash-navy,#092558)] sm:text-2xl">
                {formatPersonDisplayName(client.fullName)}
              </span>
            </MetaCell>
            <MetaCell label="Etapa actual">
              <ClientPipelineStatusBadge status={pipelineStatus} />
            </MetaCell>
            <MetaCell label="Creado">
              {formatDate(client.createdAt)}
            </MetaCell>
            <MetaCell label="Última gestión">
              {formatDateTime(client.updatedAt)}
            </MetaCell>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-bg-layout/40 px-3 py-4 sm:px-4 lg:px-5">
        <Section
          title="Etapa del pipeline"
          description="Estado comercial actual y avance en el embudo."
        >
          <StageFunnel status={pipelineStatus} />
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Quién interviene">
            <dl className="grid gap-3 sm:grid-cols-2">
              <RoleCell
                label="Registrado por"
                value={
                  client.registeredByName?.trim() || "Sistema / lead inbound"
                }
              />
              <RoleCell
                label="Ejecutivo asignado"
                value={client.assignedExecutiveName?.trim() || "Sin asignar"}
                highlight={responsibleRole === "assigned"}
              />
              <RoleCell
                label="En seguimiento"
                value={
                  client.trackingExecutiveName?.trim() ||
                  "Sin seguimiento activo"
                }
                highlight={responsibleRole === "tracking"}
              />
              <RoleCell label="Origen" value={originLabel(client)} />
              {contactMethod ? (
                <RoleCell
                  label="Canal preferido"
                  value={contactMethod}
                  className="sm:col-span-2"
                />
              ) : null}
            </dl>
          </Section>

          <Section
            title="Agenda de seguimiento"
            description="Próximas gestiones calendarizadas para este cliente."
          >
            <ul className="space-y-2.5">
              {agendaRows.map((row) => (
                <li
                  key={row.label}
                  className={joinClasses(
                    "rounded-xl border px-3 py-2.5",
                    row.present
                      ? "border-[color:var(--dash-navy,#092558)]/15 bg-[color-mix(in_srgb,var(--dash-navy,#092558)_4%,white)]"
                      : "border-dashed border-border bg-transparent",
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark/60">
                    {row.label}
                  </p>
                  <p
                    className={joinClasses(
                      "mt-0.5 text-sm font-semibold",
                      row.present ? "text-foreground" : "text-muted",
                    )}
                  >
                    {row.present ? row.value : "Sin agendar"}
                  </p>
                  {"detail" in row && row.detail ? (
                    <p className="mt-1 text-xs text-muted">{row.detail}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            {client.lastCallOutcome?.trim() ? (
              <p className="mt-3 text-xs text-muted">
                Último resultado de llamado:{" "}
                <span className="font-semibold text-foreground">
                  {client.lastCallOutcome.trim()}
                </span>
              </p>
            ) : null}
          </Section>
        </div>

        {closed ? (
          <Section
            title="Cierre / recepción"
            description="Registro al marcar el cliente como recepcionado."
          >
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetaCell label="Isapre">{closed.isapre || "—"}</MetaCell>
              <MetaCell label="Plan">
                {closed.planName?.trim() || closed.planCode?.trim() || "—"}
              </MetaCell>
              <MetaCell label="Fecha cierre">
                {formatDate(closed.closedAt)}
              </MetaCell>
              <MetaCell label="Referencia">
                {closed.isapreReference?.trim() || "—"}
              </MetaCell>
              {(closed.finalPriceUf || closed.finalPriceClp) && (
                <MetaCell label="Precio final">
                  {[
                    closed.finalPriceUf
                      ? `UF ${closed.finalPriceUf}`
                      : null,
                    closed.finalPriceClp
                      ? `CLP ${closed.finalPriceClp}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </MetaCell>
              )}
              {closed.notes?.trim() ? (
                <div className="sm:col-span-2 lg:col-span-4">
                  <MetaCell label="Notas de cierre">{closed.notes.trim()}</MetaCell>
                </div>
              ) : null}
            </dl>
          </Section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Historial de gestiones"
            description="Movimientos del sistema: contacto, reagendar, derivaciones y cambios de etapa."
          >
            {canViewInternalNotes ? (
              <TimelineList
                lines={modificationLines}
                emptyLabel="Sin movimientos registrados aún."
                ariaLabel="Historial de gestiones"
                mode="history"
              />
            ) : (
              <p className="text-sm text-muted">
                No tienes permiso para ver el historial interno de este cliente.
              </p>
            )}
          </Section>

          <Section
            title="Anotaciones"
            description="Notas libres del equipo. Distintas del historial automático."
          >
            {canViewInternalNotes ? (
              <TimelineList
                lines={noteLines}
                emptyLabel="Aún no hay anotaciones."
                ariaLabel="Anotaciones del cliente"
                mode="notes"
              />
            ) : (
              <p className="text-sm text-muted">
                No tienes permiso para ver las anotaciones internas.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
