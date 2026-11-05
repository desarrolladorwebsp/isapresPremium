import { santiagoDateKey } from "@/lib/client-pipeline/agenda-urgency";

export function formatReceptionDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeZone: "America/Santiago" }).format(date)
    : "—";
}

/** Calendar day reported by the insurer, independent of the recording timestamp. */
export function parseReceptionDate(value: unknown, now = new Date()): Date {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Indica la fecha de recepción por la Isapre (día, mes y año).");
  }
  // Noon UTC stays on the selected Chile calendar day in both summer and winter.
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("La fecha de recepción por la Isapre no es válida.");
  }
  if (value > (santiagoDateKey(now) ?? "")) {
    throw new Error("La recepción por la Isapre no puede tener una fecha futura.");
  }
  return date;
}
