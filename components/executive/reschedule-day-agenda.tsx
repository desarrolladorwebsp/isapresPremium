"use client";

import { useMemo } from "react";
import { useExecutiveCalendarQuery } from "@/hooks/query/use-executive-calendar-query";
import { joinClasses } from "@/lib/utils";

/** Ventana de aviso: 1 h antes / 1 h después de otra reunión (solo notifica). */
const CONFLICT_WINDOW_MS = 60 * 60 * 1000;

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

function isZoomMeetingConflict(
  event: { kind: "call" | "confirmation" | "reminder"; startsAt: string },
  selectedAt: Date | null,
): boolean {
  if (!selectedAt) return false;
  // Solo reuniones Zoom / nextCall; no llamadas de confirmación.
  if (event.kind !== "call") return false;
  return (
    Math.abs(new Date(event.startsAt).getTime() - selectedAt.getTime()) <
    CONFLICT_WINDOW_MS
  );
}

export interface RescheduleDayAgendaProps {
  /** Valor `datetime-local` del próximo llamado. */
  nextCallLocal: string;
  /** Cliente actual: no se cuenta como conflicto consigo mismo. */
  excludeClientId: string;
  enabled: boolean;
}

/**
 * Agenda del día al reagendar: solo reuniones Zoom (`call`);
 * no lista llamadas de confirmación. El aviso amarillo (±1 h) aplica a Zoom.
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

  const zoomMeetings = useMemo(
    () =>
      (eventsQuery.data ?? []).filter(
        (event) =>
          event.clientId !== excludeClientId && event.kind === "call",
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

  const conflicts = zoomMeetings.filter((event) =>
    isZoomMeetingConflict(event, bounds.selectedAt),
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

      {!loading && !error && zoomMeetings.length === 0 ? (
        <p className="text-[11px] text-muted">
          No tienes otras reuniones Zoom agendadas este día.
        </p>
      ) : null}

      {zoomMeetings.length > 0 ? (
        <ul className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
          {zoomMeetings.map((event) => {
            const conflict = isZoomMeetingConflict(event, bounds.selectedAt);
            return (
              <li key={event.id}>
                <span
                  title={
                    conflict
                      ? `${formatTime(event.startsAt)} · ${event.clientName} (Zoom) — Cerca del horario elegido (±1 h)`
                      : `${formatTime(event.startsAt)} · ${event.clientName} (Zoom)`
                  }
                  className={joinClasses(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-tight",
                    conflict
                      ? "border-amber-300 bg-amber-50 text-amber-950"
                      : "border-border bg-white text-foreground",
                  )}
                >
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatTime(event.startsAt)}
                  </span>
                  <span className="min-w-0 truncate">{event.clientName}</span>
                  <span
                    className={joinClasses(
                      "shrink-0 text-[9px] font-semibold uppercase tracking-wide",
                      conflict ? "text-amber-800/80" : "text-primary-dark/55",
                    )}
                  >
                    Zoom
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {conflicts.length > 0 ? (
        <p className="text-[11px] font-medium text-amber-800">
          Aviso: hay {conflicts.length} reunión Zoom
          {conflicts.length === 1 ? "" : "es"} a menos de 1 hora (antes o
          después) del horario elegido. No se bloquea; puedes guardar igual.
        </p>
      ) : bounds.selectedAt && zoomMeetings.length > 0 && !loading ? (
        <p className="text-[11px] text-muted">
          El horario elegido está a más de 1 hora de tus otras reuniones Zoom
          del día.
        </p>
      ) : null}
    </div>
  );
}
