"use client";

import { useMemo } from "react";
import { useExecutiveCalendarQuery } from "@/hooks/query/use-executive-calendar-query";
import { joinClasses } from "@/lib/utils";

const CONFLICT_WINDOW_MS = 30 * 60 * 1000;

function dayBoundsFromLocal(datetimeLocal: string): {
  dayLabel: string;
  fromIso: string;
  toIso: string;
  selectedAt: Date | null;
} | null {
  const day = datetimeLocal.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const from = new Date(`${day}T00:00:00`);
  if (Number.isNaN(from.getTime())) return null;
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const selectedAt =
    datetimeLocal.trim().length >= 16 && !Number.isNaN(new Date(datetimeLocal).getTime())
      ? new Date(datetimeLocal)
      : null;

  const dayLabel = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(from);

  return {
    dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    selectedAt,
  };
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isConflicting(
  eventAt: Date,
  selectedAt: Date | null,
): boolean {
  if (!selectedAt) return false;
  return Math.abs(eventAt.getTime() - selectedAt.getTime()) < CONFLICT_WINDOW_MS;
}

export interface RescheduleDayAgendaProps {
  /** Valor `datetime-local` del próximo llamado. */
  nextCallLocal: string;
  /** Cliente actual: no se cuenta como conflicto consigo mismo. */
  excludeClientId: string;
  enabled: boolean;
}

/**
 * Agenda del día al reagendar: lista llamados ya programados y marca
 * solapes (±30 min) para que el ejecutivo no duplique horario.
 */
export function RescheduleDayAgenda({
  nextCallLocal,
  excludeClientId,
  enabled,
}: RescheduleDayAgendaProps) {
  const dayKey = useMemo(() => {
    const day = nextCallLocal.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
    const today = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }, [nextCallLocal]);

  const bounds = useMemo(
    () => dayBoundsFromLocal(`${dayKey}T${nextCallLocal.trim().slice(11, 16) || "00:00"}`),
    [dayKey, nextCallLocal],
  );

  const range = useMemo(
    () =>
      bounds
        ? { from: bounds.fromIso, to: bounds.toIso }
        : { from: "", to: "" },
    [bounds],
  );

  const eventsQuery = useExecutiveCalendarQuery(range, {
    enabled: enabled && Boolean(bounds),
  });

  const events = useMemo(
    () =>
      (eventsQuery.data ?? []).filter(
        (event) => event.clientId !== excludeClientId,
      ),
    [eventsQuery.data, excludeClientId],
  );

  const loading = eventsQuery.isLoading && !eventsQuery.data;
  const error =
    eventsQuery.isError
      ? eventsQuery.error instanceof Error
        ? eventsQuery.error.message
        : "No se pudo cargar la agenda del día."
      : null;

  if (!enabled || !bounds) return null;

  const conflicts = events.filter((event) =>
    isConflicting(new Date(event.startsAt), bounds.selectedAt),
  );

  return (
    <div className="space-y-2 rounded-lg border border-border bg-bg-layout/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Agenda del día
          </p>
          <p className="text-[11px] text-muted">{bounds.dayLabel}</p>
        </div>
        {loading ? (
          <span className="text-[11px] text-muted">Cargando…</span>
        ) : null}
      </div>

      {error ? (
        <p className="text-[11px] text-danger">{error}</p>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <p className="text-[11px] text-muted">
          No tienes otros llamados agendados este día.
        </p>
      ) : null}

      {events.length > 0 ? (
        <ul className="max-h-36 space-y-1.5 overflow-y-auto">
          {events.map((event) => {
            const conflict = isConflicting(
              new Date(event.startsAt),
              bounds.selectedAt,
            );
            return (
              <li
                key={event.id}
                className={joinClasses(
                  "rounded-md px-2 py-1.5 text-[11px]",
                  conflict
                    ? "border border-amber-300 bg-amber-50 text-amber-950"
                    : "border border-transparent bg-white text-foreground",
                )}
              >
                <span className="font-semibold tabular-nums">
                  {formatTime(event.startsAt)}
                </span>
                <span className="mx-1 text-muted">·</span>
                <span>{event.clientName}</span>
                {conflict ? (
                  <span className="mt-0.5 block font-medium text-amber-800">
                    Coincide con el horario elegido (±30 min)
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {conflicts.length > 0 ? (
        <p className="text-[11px] font-medium text-amber-800">
          Ya tienes {conflicts.length} llamado
          {conflicts.length === 1 ? "" : "s"} cerca de esta hora. Puedes
          guardar igual, pero revisa si quieres evitar el choque.
        </p>
      ) : bounds.selectedAt && events.length > 0 && !loading ? (
        <p className="text-[11px] text-muted">
          El horario elegido no coincide con otros llamados del día.
        </p>
      ) : null}
    </div>
  );
}
