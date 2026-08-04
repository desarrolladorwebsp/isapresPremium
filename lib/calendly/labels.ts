export type CalendlyTeamId = "EQUIPO_1" | "EQUIPO_2" | "EQUIPO_3";

export const CALENDLY_TEAM_IDS: readonly CalendlyTeamId[] = [
  "EQUIPO_1",
  "EQUIPO_2",
  "EQUIPO_3",
] as const;

/** Labels operativos (protocolo Zoom / equipos de reunión). */
export const CALENDLY_TEAM_LABELS: Record<CalendlyTeamId, string> = {
  EQUIPO_1: "Equipo 1",
  EQUIPO_2: "Equipo 2",
  EQUIPO_3: "Equipo 3",
};

/**
 * Scheduling URLs oficiales por equipo (Event Type con Zoom).
 * Env `CALENDLY_EQUIPO_N_SCHEDULING_URL` tiene prioridad si está definida.
 */
export const CALENDLY_DEFAULT_SCHEDULING_URLS: Record<CalendlyTeamId, string> = {
  EQUIPO_1: "https://calendly.com/cotizador-isaprespremium/reunion",
  EQUIPO_2: "https://calendly.com/cotizador-isaprespremium_/online",
  EQUIPO_3: "https://calendly.com/isaprespremium-info/online",
};

export function isCalendlyTeamId(value: unknown): value is CalendlyTeamId {
  return (
    value === "EQUIPO_1" || value === "EQUIPO_2" || value === "EQUIPO_3"
  );
}
