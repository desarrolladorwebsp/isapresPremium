"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchClientActivities } from "@/lib/api/admin-client";
import { buildFollowUpHistory, lastFollowUpEvent, nextFollowUpActions, type FollowUpEvent } from "@/lib/client-pipeline/follow-up";
import { Button } from "@/components/ui/button";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import {
  CLIENT_PIPELINE_STATUS_DESCRIPTIONS,
  CLIENT_PIPELINE_STATUS_DISPLAY_LABELS,
} from "@/lib/client-pipeline/constants";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import { joinClasses } from "@/lib/utils";
import {
  CLIENT_CONTACT_METHOD_LABELS,
  type ClientPipelineStatus,
} from "@/types/client-pipeline";
import { sendpulseOriginLabel } from "@/lib/sendpulse/origin-label";
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
  if (origin === "SENDPULSE") return sendpulseOriginLabel(client.sendpulseBotPhone);
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

const ACTION_LABELS = {
  overdue: "Vencida", today: "Hoy", upcoming: "Programada",
  unscheduled: "Sin agendar", finished: "Finalizado",
};

function FollowUpTimeline({ events }: { events: FollowUpEvent[] }) {
  return (
    <ol className="space-y-3" aria-label="Historial unificado del cliente">
      {events.map(event => (
        <li key={event.id} className="border-l-2 border-cyan-400 py-1 pl-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-semibold text-foreground">{event.title}</p>
            {event.at ? <time dateTime={event.at} className="text-xs text-muted">{formatDateTime(event.at)}</time>
              : <span className="text-xs text-muted">Fecha no registrada</span>}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{event.body}</p>
          <p className="mt-1 text-xs text-muted">{event.actor ? `Por ${event.actor}` : "Autor no registrado"}</p>
        </li>
      ))}
    </ol>
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
                {CLIENT_PIPELINE_STATUS_DISPLAY_LABELS[step]}
              </p>
            </li>
          );
        })}
      </ol>

      {isSideBranch ? (
        <p className="text-xs text-muted">
          Estado lateral:{" "}
          <span className="font-semibold text-foreground">
            {CLIENT_PIPELINE_STATUS_DISPLAY_LABELS[status]}
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
  const [historyFilter, setHistoryFilter] = useState("all");
  const activityQuery = useQuery({
    queryKey: ["executive", "follow-up-history", client.id, client.updatedAt],
    queryFn: () => fetchClientActivities(client.id),
    enabled: canViewInternalNotes,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  // Never display cached commercial data after access is revoked or a refresh fails.
  const history = useMemo(() => buildFollowUpHistory(client, pipelineNotes,
    canViewInternalNotes && !activityQuery.isError ? activityQuery.data ?? [] : [], canViewInternalNotes),
    [client, pipelineNotes, canViewInternalNotes, activityQuery.data, activityQuery.isError]);
  const lastEvent = lastFollowUpEvent(history);
  const actions = nextFollowUpActions({ ...client, pipelineStatus });
  const nextAction = actions[0];
  const filteredHistory = history.filter(event => historyFilter === "all" || event.kind === historyFilter);
  const historyIncomplete = activityQuery.isPending || activityQuery.isError;
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
            <MetaCell label="Última gestión registrada">
              {!canViewInternalNotes ? "Sin acceso al historial" : activityQuery.isPending ? "Cargando historial…"
                : activityQuery.isError ? "Historial incompleto" : lastEvent ? formatDateTime(lastEvent.at) : "Sin gestiones registradas"}
            </MetaCell>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-bg-layout/40 px-3 py-4 sm:px-4 lg:px-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Última gestión registrada" description="Acción guardada en el historial del cliente.">
            {!canViewInternalNotes ? <p className="text-sm text-muted">No tienes permiso para ver el historial interno.</p>
              : activityQuery.isPending ? <p role="status" className="text-sm text-muted">Cargando historial…</p>
              : <>
                {activityQuery.isError ? <p role="alert" className="mb-2 text-sm text-amber-800">Historial incompleto: no se pudieron consultar planes y cotizaciones. Se muestran solo los registros disponibles.</p> : null}
                {lastEvent ? <>
                  <p className="font-semibold text-foreground">{lastEvent.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{lastEvent.body}</p>
                  <p className="mt-2 text-xs text-muted">{formatDateTime(lastEvent.at)} · {lastEvent.actor || "Autor no registrado"}</p>
                </> : <p className="text-sm text-muted">Sin gestiones con fecha registrada. La creación o edición de la ficha no acredita un contacto.</p>}
              </>}
          </Section>
          <Section title="Próxima acción" description="Pendiente más antiguo de la agenda actual; vencimientos por día en Chile.">
            <span className={joinClasses("inline-block rounded-full px-2 py-1 text-xs font-semibold",
              nextAction.urgency === "overdue" ? "bg-red-50 text-red-800"
                : nextAction.urgency === "today" || nextAction.urgency === "unscheduled" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800")}>{ACTION_LABELS[nextAction.urgency]}</span>
            <p className="mt-2 font-semibold text-foreground">{nextAction.title}</p>
            <p className="mt-1 text-sm text-muted">{nextAction.detail}</p>
            {nextAction.at ? <p className="mt-2 text-sm font-semibold">{formatDateTime(nextAction.at)}</p> : null}
            <p className="mt-2 text-xs text-muted">Responsable: {nextAction.responsible}</p>
          </Section>
        </div>
        <Section title="Historial unificado" description="Gestiones, anotaciones, planes y cotizaciones registrados; más recientes primero.">
          {canViewInternalNotes ? <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-muted">Mostrar
                <select aria-label="Filtrar historial" value={historyFilter} onChange={event => setHistoryFilter(event.target.value)} className="rounded-lg border border-border bg-white p-2 text-foreground">
                  <option value="all">Todos los registros</option><option value="gestion">Gestiones</option>
                  <option value="commercial">Planes y cotizaciones</option><option value="note">Anotaciones</option>
                </select>
              </label>
              <Button type="button" size="sm" variant="ghost" disabled={activityQuery.isFetching} onClick={() => void activityQuery.refetch()}>Actualizar historial</Button>
            </div>
            {activityQuery.isPending ? <p role="status" className="text-sm text-muted">Cargando planes y cotizaciones…</p> : null}
            {activityQuery.isError ? <p role="alert" className="text-sm text-amber-800">Historial parcial. No se pudieron cargar planes y cotizaciones. Usa Actualizar historial para reintentar.</p> : null}
            {!historyIncomplete && !lastEvent ? <p className="text-sm text-muted">Sin gestiones con fecha registrada todavía.</p> : null}
            {filteredHistory.length ? <FollowUpTimeline events={filteredHistory} /> : <p className="text-sm text-muted">No hay registros disponibles para este filtro.</p>}
          </> : <p className="text-sm text-muted">No tienes permiso para ver el historial interno de este cliente.</p>}
        </Section>
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
                label="Ejecutivo que acompaña"
                value={
                  client.trackingExecutiveName?.trim() ||
                  "Sin ejecutivo adicional de seguimiento"
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
            <ul className="space-y-3">
              {actions.map(action => <li key={action.kind} className="rounded-xl border border-border px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">{action.title} · {ACTION_LABELS[action.urgency]}</p>
                {action.at ? <p className="mt-1 text-sm">{formatDateTime(action.at)}</p> : null}
                <p className="mt-1 text-xs text-muted">{action.detail}</p>
                <p className="mt-1 text-xs text-muted">Responsable: {action.responsible}</p>
              </li>)}
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

        {client.sendpulseChat?.trim() ? (
          <Section
            title="Chat de SendPulse"
            description="Conversación de WhatsApp. Se actualiza cuando el chatbot vuelve a disparar y hay mensajes."
          >
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-bg-layout/40 px-3 py-3 text-sm leading-relaxed text-foreground">
              {client.sendpulseChat.trim()}
            </pre>
          </Section>
        ) : null}


      </div>
    </div>
  );
}
