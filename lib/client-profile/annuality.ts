import { santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";

export function isAnnualityMonth(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
}

/** The anniversary is a calendar month in Chile, never a day or instant. */
export function defaultAnnualityExpiry(reference: Date | string = new Date()): string {
  const month = santiagoMonthKey(reference);
  if (!month) return "";
  return `${Number(month.slice(0, 4)) + 1}${month.slice(4)}`;
}

export function resolveAnnualityExpiry(
  profile: { anualidad?: unknown; anualidadExpiresMonth?: unknown } | null | undefined,
  createdAt?: Date | string | null,
): string {
  if (profile?.anualidad !== true) return "";
  if (isAnnualityMonth(profile.anualidadExpiresMonth)) return profile.anualidadExpiresMonth;
  return createdAt ? defaultAnnualityExpiry(createdAt) : "";
}

export function annualityAvailable(month: string, now: Date | string = new Date()): boolean {
  const current = santiagoMonthKey(now);
  return isAnnualityMonth(month) && Boolean(current && month <= current);
}

export function formatAnnualityMonth(month: string): string {
  if (!isAnnualityMonth(month)) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T12:00:00Z`));
}

export function annualityLabel(profile: { anualidad?: unknown; anualidadExpiresMonth?: unknown } | null | undefined): string {
  if (profile?.anualidad !== true) return "Sin anualidad";
  const month = resolveAnnualityExpiry(profile);
  if (!month) return "Con anualidad · sin fecha";
  return `${annualityAvailable(month) ? "Disponible para gestionar" : "Con anualidad"} · ${formatAnnualityMonth(month)}`;
}
