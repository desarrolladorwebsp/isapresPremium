"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AdminFormModal,
  AdminPanel,
  AdminPanelHeader,
  AdminRefreshButton,
} from "@/components/admin/admin-data-table";
import { ClientContactMethodBadge } from "@/components/executive/client-contact-method-badge";
import { ClientPipelineStatusBadge } from "@/components/executive/client-pipeline-status-badge";
import { ClientRutCell } from "@/components/executive/client-rut-cell";
import { Button } from "@/components/ui/button";
import { useExecutiveCalendarQuery } from "@/hooks/query/use-executive-calendar-query";
import { getStaffRoleLabel } from "@/lib/auth/staff-role";
import { CALENDLY_TEAM_LABELS } from "@/lib/calendly/labels";
import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";
import {
  staffClientHref,
  staffExecutiveHref,
} from "@/lib/staff/staff-sections";
import { horizontalScrollRail, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { CalendarCallEvent } from "@/types/calendar";
import { CLIENT_CONTACT_METHOD_LABELS } from "@/types/client-pipeline";

type CalendarView = "month" | "week" | "day" | "year";

/** Semana lun–dom (estándar Chile / es-CL). */
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const HOUR_SLOTS = Array.from({ length: 13 }, (_, index) => 8 + index); // 8:00–20:00

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
  { value: "year", label: "Año" },
];

const EMPTY_HINT = "No hay llamados reagendados en este periodo.";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Lunes de la semana que contiene `date` (lun=0 … dom=6). */
function startOfWeekMonday(date: Date): Date {
  const day = startOfDay(date);
  const weekday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - weekday);
  return day;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date: Date, amount: number): Date {
  return new Date(date.getFullYear() + amount, date.getMonth(), 1);
}

function formatPeriodTitle(view: CalendarView, cursor: Date): string {
  if (view === "month") {
    const label = new Intl.DateTimeFormat("es-CL", {
      month: "long",
      year: "numeric",
    }).format(cursor);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  if (view === "year") {
    return String(cursor.getFullYear());
  }

  if (view === "day") {
    const formatted = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(cursor);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const weekStart = startOfWeekMonday(cursor);
  const weekEnd = addDays(weekStart, 6);
  const startLabel = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(weekEnd);

  return `Semana del ${startLabel} – ${endLabel}`;
}

function capitalizeMonth(date: Date): string {
  const label = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatEventDateTime(iso: string): string {
  const formatted = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventDayKey(event: CalendarCallEvent): string {
  return dayKey(new Date(event.startsAt));
}

function eventsForDay(
  events: CalendarCallEvent[],
  day: Date,
): CalendarCallEvent[] {
  const key = dayKey(day);
  return events.filter((event) => eventDayKey(event) === key);
}

function eventsForHour(
  events: CalendarCallEvent[],
  day: Date,
  hour: number,
): CalendarCallEvent[] {
  return eventsForDay(events, day).filter(
    (event) => new Date(event.startsAt).getHours() === hour,
  );
}

interface MonthCell {
  date: Date;
  inCurrentMonth: boolean;
}

function buildMonthCells(cursor: Date): MonthCell[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeekMonday(firstOfMonth);
  const cells: MonthCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    cells.push({
      date,
      inCurrentMonth: date.getMonth() === month,
    });
  }

  return cells;
}

function buildWeekDays(cursor: Date): Date[] {
  const weekStart = startOfWeekMonday(cursor);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function getVisibleRange(
  view: CalendarView,
  cursor: Date,
): { from: Date; to: Date } {
  if (view === "month") {
    const cells = buildMonthCells(cursor);
    const from = startOfDay(cells[0].date);
    const to = addDays(startOfDay(cells[41].date), 1);
    return { from, to };
  }
  if (view === "week") {
    const from = startOfWeekMonday(cursor);
    return { from, to: addDays(from, 7) };
  }
  if (view === "day") {
    const from = startOfDay(cursor);
    return { from, to: addDays(from, 1) };
  }
  const from = new Date(cursor.getFullYear(), 0, 1);
  return { from, to: new Date(cursor.getFullYear() + 1, 0, 1) };
}

function shiftCursor(view: CalendarView, cursor: Date, direction: -1 | 1): Date {
  switch (view) {
    case "month":
      return addMonths(cursor, direction);
    case "week":
      return addDays(cursor, direction * 7);
    case "day":
      return addDays(cursor, direction);
    case "year":
      return addYears(cursor, direction);
  }
}

function EmptyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={joinClasses(
        "text-muted",
        compact ? "text-[11px] leading-snug" : "text-sm",
      )}
    >
      {EMPTY_HINT}
    </p>
  );
}

function eventChipClass(contactMethod?: CalendarCallEvent["contactMethod"]): string {
  if (contactMethod === "WHATSAPP") {
    return "bg-[#25D366]/20 font-medium text-[#0f7a4a] ring-1 ring-[#25D366]/35";
  }
  if (contactMethod === "ZOOM") {
    return "bg-sky-100 font-medium text-sky-900 ring-1 ring-sky-300/60";
  }
  return "bg-primary/12 font-medium text-primary-dark";
}

function contactDotClass(
  events: CalendarCallEvent[],
  isToday = false,
): string {
  if (isToday) return "bg-white";
  const methods = new Set(
    events
      .map((event) => event.contactMethod)
      .filter((value): value is "ZOOM" | "WHATSAPP" => Boolean(value)),
  );
  if (methods.size === 1 && methods.has("WHATSAPP")) return "bg-[#25D366]";
  if (methods.size === 1 && methods.has("ZOOM")) return "bg-sky-500";
  return "bg-primary";
}

function EventChip({
  event,
  showTime = false,
  dense = false,
  onSelect,
}: {
  event: CalendarCallEvent;
  showTime?: boolean;
  dense?: boolean;
  onSelect: (event: CalendarCallEvent) => void;
}) {
  const time = formatEventTime(event.startsAt);
  const label = showTime ? `${time} ${event.title}` : event.title;
  return (
    <button
      type="button"
      title={`${event.title} · ${time}${event.zoomJoinUrl ? " · Zoom disponible" : ""}`}
      aria-label={`Ver reunión: ${event.title}`}
      onClick={() => onSelect(event)}
      className={joinClasses(
        "block w-full truncate rounded-md text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        eventChipClass(event.contactMethod),
        dense
          ? "px-1 py-0.5 text-[10px] leading-tight"
          : "px-1.5 py-1 text-[11px] leading-snug sm:text-xs",
      )}
    >
      {label}
      {event.zoomJoinUrl && !dense ? (
        <span className="ml-1 font-semibold underline decoration-sky-400/70 underline-offset-2">
          Unirse
        </span>
      ) : null}
    </button>
  );
}

function MeetingDetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function MeetingDetailModal({
  event,
  onClose,
  onOpenClient,
  onOpenExecutive,
}: {
  event: CalendarCallEvent | null;
  onClose: () => void;
  onOpenClient: (clientId: string) => void;
  onOpenExecutive: (executiveId: string) => void;
}) {
  if (!event) return null;

  const channelLabel = event.contactMethod
    ? CLIENT_CONTACT_METHOD_LABELS[event.contactMethod]
    : "Llamado";
  const whatsappUrl = event.clientPhone
    ? buildWhatsAppUrl(event.clientPhone)
    : null;
  const calendlyLabel =
    event.calendlyTeam && event.calendlyTeam in CALENDLY_TEAM_LABELS
      ? CALENDLY_TEAM_LABELS[event.calendlyTeam]
      : null;
  const executiveRoleLabel = event.assignedExecutiveName
    ? getStaffRoleLabel({
        realm: "executive",
        executiveKind: event.assignedExecutiveKind,
      })
    : null;

  return (
    <AdminFormModal
      open
      size="md"
      title={event.clientName}
      description={`${channelLabel} · ${formatEventDateTime(event.startsAt)}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ClientContactMethodBadge method={event.contactMethod} />
          <ClientPipelineStatusBadge status={event.pipelineStatus ?? undefined} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MeetingDetailField label="Fecha y hora">
            {formatEventDateTime(event.startsAt)}
          </MeetingDetailField>
          <MeetingDetailField label="Canal">
            {channelLabel}
          </MeetingDetailField>
          <MeetingDetailField label="Ejecutivo a cargo">
            {event.assignedExecutiveName && event.assignedExecutiveId ? (
              <button
                type="button"
                onClick={() => onOpenExecutive(event.assignedExecutiveId!)}
                className="text-left font-medium text-primary-dark underline-offset-2 hover:underline"
              >
                {event.assignedExecutiveName}
              </button>
            ) : event.assignedExecutiveName ? (
              <span className="font-medium">{event.assignedExecutiveName}</span>
            ) : (
              <span className="text-muted">Sin ejecutivo asignado</span>
            )}
          </MeetingDetailField>
          <MeetingDetailField label="Rol">
            {executiveRoleLabel ?? (
              <span className="text-muted">Sin rol</span>
            )}
          </MeetingDetailField>
          <MeetingDetailField label="RUT">
            <ClientRutCell rut={event.clientRut} />
          </MeetingDetailField>
          <MeetingDetailField label="Teléfono">
            {event.clientPhone ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  href={`tel:${event.clientPhone}`}
                  className="font-medium text-primary-dark underline-offset-2 hover:underline"
                >
                  {event.clientPhone}
                </a>
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#128C7E] underline-offset-2 hover:underline"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : (
              <span className="text-muted">Sin teléfono</span>
            )}
          </MeetingDetailField>
          <MeetingDetailField label="Correo">
            {event.clientEmail ? (
              <a
                href={`mailto:${event.clientEmail}`}
                className="break-all font-medium text-primary-dark underline-offset-2 hover:underline"
              >
                {event.clientEmail}
              </a>
            ) : (
              <span className="text-muted">Sin correo</span>
            )}
          </MeetingDetailField>
          {calendlyLabel ? (
            <MeetingDetailField label="Equipo Calendly">
              {calendlyLabel}
            </MeetingDetailField>
          ) : null}
        </div>

        {event.zoomJoinUrl ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
              Reunión Zoom
            </p>
            <a
              href={event.zoomJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-sm font-semibold text-sky-900 underline decoration-sky-400/70 underline-offset-2"
            >
              Unirse a la videollamada
            </a>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            onClick={() => onOpenClient(event.clientId)}
          >
            Ver ficha del cliente
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </AdminFormModal>
  );
}

function MonthView({
  cursor,
  today,
  events,
  onSelectEvent,
}: {
  cursor: Date;
  today: Date;
  events: CalendarCallEvent[];
  onSelectEvent: (event: CalendarCallEvent) => void;
}) {
  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-surface-hover px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
          >
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const isToday = isSameDay(cell.date, today);
          const dayEvents = eventsForDay(events, cell.date);
          const visible = dayEvents.slice(0, 2);
          const overflow = dayEvents.length - visible.length;
          return (
            <div
              key={cell.date.toISOString()}
              className={joinClasses(
                "min-h-[4.25rem] bg-white p-1.5 sm:min-h-[5.5rem] sm:p-2",
                !cell.inCurrentMonth && "bg-bg-layout/70 text-muted/70",
                isToday && "ring-2 ring-inset ring-primary/35",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <span
                  className={joinClasses(
                    "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold sm:size-8 sm:text-sm",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : cell.inCurrentMonth
                        ? "text-foreground"
                        : "text-muted/80",
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {dayEvents.length > 0 ? (
                  <span
                    className={joinClasses(
                      "size-1.5 rounded-full sm:hidden",
                      contactDotClass(dayEvents),
                    )}
                  />
                ) : null}
              </div>
              <div className="hidden space-y-1 sm:block">
                {visible.map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    showTime
                    dense
                    onSelect={onSelectEvent}
                  />
                ))}
                {overflow > 0 ? (
                  <p className="px-0.5 text-[10px] font-medium text-muted">
                    +{overflow} más
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {events.length === 0 ? <EmptyBanner /> : null}
    </div>
  );
}

function WeekView({
  cursor,
  today,
  events,
  onSelectEvent,
}: {
  cursor: Date;
  today: Date;
  events: CalendarCallEvent[];
  onSelectEvent: (event: CalendarCallEvent) => void;
}) {
  const days = useMemo(() => buildWeekDays(cursor), [cursor]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border bg-surface-hover">
            <div className="border-r border-border" />
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const count = eventsForDay(events, day).length;
              return (
                <div
                  key={day.toISOString()}
                  className={joinClasses(
                    "border-r border-border px-2 py-2 text-center last:border-r-0",
                    isToday && "bg-primary/8",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase text-muted">
                    {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
                  </p>
                  <p
                    className={joinClasses(
                      "mt-0.5 text-sm font-bold",
                      isToday ? "text-primary-dark" : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </p>
                  {count > 0 ? (
                    <p className="mt-0.5 text-[10px] font-medium text-primary-dark">
                      {count} llamado{count === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {HOUR_SLOTS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border last:border-b-0"
            >
              <div className="border-r border-border px-1 py-3 text-right text-[10px] font-medium text-muted sm:text-xs">
                {`${String(hour).padStart(2, "0")}:00`}
              </div>
              {days.map((day) => {
                const slotEvents = eventsForHour(events, day, hour);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="min-h-10 space-y-1 border-r border-border p-1 last:border-r-0"
                  >
                    {slotEvents.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        dense
                        onSelect={onSelectEvent}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {events.length === 0 ? <EmptyBanner /> : null}
    </div>
  );
}

function DayView({
  cursor,
  today,
  events,
  onSelectEvent,
}: {
  cursor: Date;
  today: Date;
  events: CalendarCallEvent[];
  onSelectEvent: (event: CalendarCallEvent) => void;
}) {
  const isToday = isSameDay(cursor, today);
  const dayEvents = eventsForDay(events, cursor);
  const outsideHours = dayEvents.filter((event) => {
    const hour = new Date(event.startsAt).getHours();
    return hour < 8 || hour > 20;
  });

  return (
    <div className="space-y-3">
      <div
        className={joinClasses(
          "overflow-hidden rounded-xl border border-border bg-white",
          isToday && "ring-1 ring-primary/25",
        )}
      >
        <div className="border-b border-border bg-surface-hover px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Franja horaria (8:00 – 20:00)
          </p>
          <p className="mt-1 text-xs text-muted">
            {dayEvents.length === 0
              ? "Sin llamados programados"
              : `${dayEvents.length} llamado${dayEvents.length === 1 ? "" : "s"} en el día`}
          </p>
        </div>
        {outsideHours.length > 0 ? (
          <div className="space-y-1 border-b border-border bg-amber-50/70 px-4 py-2">
            {outsideHours.map((event) => (
              <EventChip
                key={event.id}
                event={event}
                showTime
                onSelect={onSelectEvent}
              />
            ))}
          </div>
        ) : null}
        <ul className="divide-y divide-border">
          {HOUR_SLOTS.map((hour) => {
            const slotEvents = eventsForHour(events, cursor, hour);
            return (
              <li
                key={hour}
                className="flex min-h-12 items-start gap-3 px-4 py-2.5"
              >
                <span className="w-12 shrink-0 pt-1 text-xs font-medium text-muted">
                  {`${String(hour).padStart(2, "0")}:00`}
                </span>
                {slotEvents.length === 0 ? (
                  <span className="mt-3 h-px flex-1 bg-border/80" />
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {slotEvents.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        showTime
                        onSelect={onSelectEvent}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {dayEvents.length === 0 ? <EmptyBanner /> : null}
    </div>
  );
}

function YearView({
  cursor,
  today,
  events,
}: {
  cursor: Date;
  today: Date;
  events: CalendarCallEvent[];
}) {
  const year = cursor.getFullYear();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthDate = new Date(year, monthIndex, 1);
          const cells = buildMonthCells(monthDate);

          return (
            <div
              key={monthIndex}
              className={joinClasses(ui.surfaceCard, "p-3")}
            >
              <p className="mb-2 text-sm font-semibold text-primary-dark">
                {capitalizeMonth(monthDate)}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={`${monthIndex}-${label}`}
                    className="py-0.5 text-center text-[9px] font-semibold uppercase text-muted"
                  >
                    {label.charAt(0)}
                  </div>
                ))}
                {cells.map((cell) => {
                  const isToday = isSameDay(cell.date, today);
                  const dayEvents = eventsForDay(events, cell.date);
                  const hasEvent = dayEvents.length > 0;
                  return (
                    <div
                      key={cell.date.toISOString()}
                      title={
                        hasEvent
                          ? dayEvents.map((event) => event.title).join(" · ")
                          : undefined
                      }
                      className={joinClasses(
                        "relative flex aspect-square items-center justify-center rounded text-[10px]",
                        cell.inCurrentMonth
                          ? "text-foreground"
                          : "text-muted/50",
                        isToday &&
                          "bg-primary font-semibold text-primary-foreground",
                        hasEvent &&
                          !isToday &&
                          "font-semibold text-primary-dark",
                      )}
                    >
                      {cell.date.getDate()}
                      {hasEvent ? (
                        <span
                          className={joinClasses(
                            "absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                            contactDotClass(dayEvents, isToday),
                          )}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {events.length === 0 ? <EmptyBanner /> : null}
    </div>
  );
}

export function ExecutiveCalendarPanel() {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<CalendarCallEvent | null>(
    null,
  );
  const today = useMemo(() => startOfDay(new Date()), []);

  const periodTitle = useMemo(
    () => formatPeriodTitle(view, cursor),
    [view, cursor],
  );

  const range = useMemo(() => getVisibleRange(view, cursor), [view, cursor]);
  const rangeKey = useMemo(
    () => ({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    }),
    [range],
  );

  const eventsQuery = useExecutiveCalendarQuery(rangeKey);
  const events = eventsQuery.data ?? [];
  const loading = eventsQuery.isLoading && !eventsQuery.data;
  const isFetching = eventsQuery.isFetching;
  const loadError =
    eventsQuery.isError
      ? eventsQuery.error instanceof Error
        ? eventsQuery.error.message
        : "No se pudieron cargar los llamados."
      : null;

  function openClientFicha(clientId: string) {
    setSelectedEvent(null);
    router.push(staffClientHref(clientId));
  }

  function openExecutiveFicha(executiveId: string) {
    setSelectedEvent(null);
    router.push(staffExecutiveHref(executiveId));
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Calendario"
        description="Reuniones y llamados agendados. WhatsApp en verde, Zoom en azul. Haz clic en un evento para ver el detalle."
        actions={
          <AdminRefreshButton
            loading={isFetching && !loading}
            onClick={() => void eventsQuery.refetch()}
          />
        }
      />

      <div className={joinClasses(ui.surfaceCard, "space-y-4 p-3 sm:p-4")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className={joinClasses(horizontalScrollRail, "flex gap-1")}
            role="tablist"
            aria-label="Vista del calendario"
          >
            {VIEW_OPTIONS.map((option) => {
              const isActive = view === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-pressed={isActive}
                  onClick={() => setView(option.value)}
                  className={joinClasses(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    touchTarget,
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-transparent text-foreground hover:bg-surface-hover",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Periodo anterior"
              onClick={() => setCursor((current) => shiftCursor(view, current, -1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label="Ir a hoy"
              onClick={() => setCursor(startOfDay(new Date()))}
            >
              Hoy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Periodo siguiente"
              onClick={() => setCursor((current) => shiftCursor(view, current, 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-primary-dark sm:text-xl">
            {periodTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[#25D366]/70" />
              WhatsApp
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-sky-400" />
              Zoom
            </span>
            {isFetching && !loading ? <span>Actualizando…</span> : null}
            {loading ? <span>Cargando llamados…</span> : null}
          </div>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {loadError}
          </p>
        ) : null}

        {view === "month" ? (
          <MonthView
            cursor={cursor}
            today={today}
            events={events}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}
        {view === "week" ? (
          <WeekView
            cursor={cursor}
            today={today}
            events={events}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}
        {view === "day" ? (
          <DayView
            cursor={cursor}
            today={today}
            events={events}
            onSelectEvent={setSelectedEvent}
          />
        ) : null}
        {view === "year" ? (
          <YearView cursor={cursor} today={today} events={events} />
        ) : null}
      </div>

      <MeetingDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onOpenClient={openClientFicha}
        onOpenExecutive={openExecutiveFicha}
      />
    </AdminPanel>
  );
}
