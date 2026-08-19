"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ClientOriginBadge } from "@/components/executive/client-origin-badge";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientPlanSummary } from "@/components/executive/client-plan-summary";
import { CotizadorSourceBadge } from "@/components/executive/cotizador-source-badge";
import {
  IconCalculator,
  IconCalendar,
  IconClipboard,
  IconClock,
  IconEye,
  IconMail,
  IconPhone,
  IconSwap,
  IconUser,
  IconUserPlus,
  IconVideo,
  IconWhatsApp,
} from "@/components/executive/executive-icons";
import { buildClientWhatsAppMessage } from "@/lib/client-pipeline/constants";
import {
  AGENDA_URGENCY_LABELS,
  agendaUrgencyChipClasses,
  agendaUrgencyFromIso,
  type AgendaUrgency,
} from "@/lib/client-pipeline/agenda-urgency";
import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";
import { joinClasses } from "@/lib/utils";
import {
  CLIENT_CONTACT_METHOD_LABELS,
  type ClientContactMethod,
  type ClientPipelineStatus,
} from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";

function formatCardDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <div className="min-w-0 text-sm font-semibold text-primary-dark">
        {children}
      </div>
    </div>
  );
}

function ScheduleCell({
  icon,
  label,
  value,
  urgency,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  urgency: AgendaUrgency;
}) {
  const tone = agendaUrgencyChipClasses(urgency);
  return (
    <div
      className={joinClasses(
        "flex min-w-0 items-start gap-2 px-2.5 py-2 sm:px-3",
        tone.shell,
      )}
      title={`${label}: ${AGENDA_URGENCY_LABELS[urgency]}`}
    >
      <span
        className={joinClasses(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full",
          tone.icon,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={joinClasses(
            "text-xs font-semibold leading-snug",
            tone.label,
          )}
        >
          {label}
        </p>
        {value ? (
          <p
            className={joinClasses(
              "mt-0.5 text-[11px] font-medium tabular-nums leading-snug",
              tone.value,
            )}
          >
            {value}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function scheduleUrgencyForClient(
  iso: string | null | undefined,
  pipelineStatus: ClientPipelineStatus | undefined,
): AgendaUrgency {
  const closed =
    pipelineStatus === "RECEPCIONADO" ||
    pipelineStatus === "PERDIDO" ||
    pipelineStatus === "CERRADO";
  return agendaUrgencyFromIso(iso, closed);
}

export interface ClientPortfolioCardProps {
  client: UserRecord;
  isAdmin: boolean;
  /** Puede reasignar ejecutivo (admin, Ejecutivo Zoom o Isapres Premium). */
  canReassign?: boolean;
  isTrackingOnly?: boolean;
  registeredByLabel: string;
  assignedLabel: string;
  assignControl?: ReactNode;
  onOpenFicha: () => void;
}

export function ClientPortfolioCard({
  client,
  isAdmin,
  canReassign = false,
  isTrackingOnly = false,
  registeredByLabel,
  assignedLabel,
  assignControl,
  onOpenFicha,
}: ClientPortfolioCardProps) {
  const pipelineStatus = (client.pipelineStatus ??
    "NUEVO") as ClientPipelineStatus;
  const contactMethod = client.preferredContactMethod as
    | ClientContactMethod
    | null
    | undefined;
  const contactLabel = contactMethod
    ? `Contacto: ${CLIENT_CONTACT_METHOD_LABELS[contactMethod]}`
    : "Contacto";
  const confirmationAt = formatCardDateTime(client.confirmationCallAt);
  const nextCallAt = formatCardDateTime(client.nextCallAt);
  const createdAt = formatCardDateTime(client.createdAt);
  const whatsappHref = client.phone
    ? buildWhatsAppUrl(
        client.phone,
        buildClientWhatsAppMessage(client.fullName),
      )
    : null;

  return (
    <article
      className={joinClasses(
        "group/card flex flex-col gap-3.5 rounded-2xl border border-border/70 bg-white p-4",
        "shadow-[0_8px_28px_-10px_rgb(9_37_88_/_0.18),0_2px_8px_-2px_rgb(13_109_238_/_0.1)]",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:border-primary/40 hover:bg-secondary-muted/25",
        "hover:shadow-[0_18px_44px_-12px_rgb(9_37_88_/_0.26),0_8px_20px_-6px_rgb(13_109_238_/_0.2)]",
        "hover:ring-2 hover:ring-primary/15",
      )}
    >
      <header className="min-w-0 space-y-2">
        <h3 className="truncate text-base font-bold capitalize leading-tight text-primary-dark sm:text-lg">
          {client.fullName}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <ClientPipelineStatusBadge status={pipelineStatus} />
          <ClientOriginBadge
            origin={client.clientOrigin}
            cotizadorSource={client.cotizadorSource}
            webFormSource={client.webFormSource}
          />
          {isTrackingOnly ? (
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              Derivado · seguimiento
            </span>
          ) : null}
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-bg-layout/30">
        <div className="grid grid-cols-1 divide-y divide-border/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ScheduleCell
            icon={<IconVideo className="size-3.5" />}
            label={contactLabel}
            urgency="upcoming"
          />
          <ScheduleCell
            icon={<IconCalendar className="size-3.5" />}
            label="Confirmación Zoom"
            value={confirmationAt}
            urgency={scheduleUrgencyForClient(
              client.confirmationCallAt,
              pipelineStatus,
            )}
          />
          <ScheduleCell
            icon={<IconClock className="size-3.5" />}
            label="Próximo llamado"
            value={nextCallAt}
            urgency={scheduleUrgencyForClient(
              client.nextCallAt,
              pipelineStatus,
            )}
          />
        </div>
      </div>

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-primary-dark">
          <IconUser className="size-4 text-primary" />
          Contacto
        </p>
        <ul className="space-y-1.5 text-sm text-foreground">
          <li className="flex min-w-0 items-center gap-2">
            <IconMail className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{client.email}</span>
          </li>
          <li className="flex min-w-0 items-center gap-2">
            <IconPhone className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{client.phone ?? "Sin teléfono"}</span>
          </li>
        </ul>
        {createdAt ? (
          <p className="flex items-center gap-2 border-t border-border/70 pt-2 text-xs text-muted">
            <IconClock className="size-3.5 shrink-0 text-primary/70" />
            <span className="tabular-nums">{createdAt}</span>
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
        <div className="space-y-3">
          <MetaRow icon={<IconUser className="size-3.5" />} label="Registró">
            <span className="block truncate uppercase">
              {registeredByLabel}
            </span>
          </MetaRow>
          {isAdmin ? (
            <MetaRow
              icon={<IconCalculator className="size-3.5" />}
              label="Cotizador"
            >
              <CotizadorSourceBadge
                source={client.cotizadorSource}
                compact
              />
            </MetaRow>
          ) : null}
          <MetaRow
            icon={<IconClipboard className="size-3.5" />}
            label="Plan"
          >
            <div className="font-normal">
              <ClientPlanSummary
                requestedPlan={client.requestedPlan}
                advisedPlan={client.advisedPlan}
                compact
              />
            </div>
          </MetaRow>
        </div>
        <div className="space-y-3">
          <MetaRow
            icon={<IconUserPlus className="size-3.5" />}
            label="Asignado"
          >
            <span className="block truncate">{assignedLabel}</span>
          </MetaRow>
          {canReassign && assignControl ? (
            <MetaRow
              icon={<IconSwap className="size-3.5" />}
              label="Reasignar"
            >
              <div className="font-normal">{assignControl}</div>
            </MetaRow>
          ) : null}
        </div>
      </section>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0"
          >
            <Button
              type="button"
              variant="whatsapp"
              className="h-11 w-full gap-2 rounded-xl"
            >
              <IconWhatsApp className="size-4" />
              WhatsApp
            </Button>
          </a>
        ) : (
          <Button
            type="button"
            variant="whatsapp"
            disabled
            className="h-11 w-full gap-2 rounded-xl opacity-50"
          >
            <IconWhatsApp className="size-4" />
            WhatsApp
          </Button>
        )}
        <Button
          type="button"
          className="h-11 w-full gap-2 rounded-xl bg-[var(--dash-navy,#092558)] text-white shadow-sm hover:brightness-110"
          onClick={onOpenFicha}
        >
          <IconEye className="size-4" />
          Ver ficha
        </Button>
      </div>
    </article>
  );
}
