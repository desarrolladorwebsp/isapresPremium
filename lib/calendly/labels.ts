export type CalendlyTeamId = "EQUIPO_1" | "EQUIPO_2" | "EQUIPO_3";

export const CALENDLY_TEAM_IDS: readonly CalendlyTeamId[] = [
  "EQUIPO_1",
  "EQUIPO_2",
  "EQUIPO_3",
] as const;

export const CALENDLY_TEAM_LABELS: Record<CalendlyTeamId, string> = {
  EQUIPO_1: "Equipo 1",
  EQUIPO_2: "Equipo 2",
  EQUIPO_3: "Equipo 3",
};

export function isCalendlyTeamId(value: unknown): value is CalendlyTeamId {
  return (
    value === "EQUIPO_1" || value === "EQUIPO_2" || value === "EQUIPO_3"
  );
}
