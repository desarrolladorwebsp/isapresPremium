export type AgendaUrgency = "overdue" | "due_today" | "upcoming" | "done";

/** Día calendario en Chile (`YYYY-MM-DD`) para comparar vencimientos. */
export function santiagoDateKey(value: Date | string): string | null {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Mes calendario en Chile (`YYYY-MM`). */
export function santiagoMonthKey(value: Date | string): string | null {
  const day = santiagoDateKey(value);
  return day ? day.slice(0, 7) : null;
}

export function agendaUrgencyFromIso(
  iso: string | null | undefined,
  done = false,
): AgendaUrgency {
  if (done) return "done";
  if (!iso) return "upcoming";
  const day = santiagoDateKey(iso);
  const today = santiagoDateKey(new Date());
  if (!day || !today) return "upcoming";
  if (day < today) return "overdue";
  if (day === today) return "due_today";
  return "upcoming";
}

export const AGENDA_URGENCY_LABELS: Record<AgendaUrgency, string> = {
  overdue: "Atrasada",
  due_today: "Hoy",
  upcoming: "Futura",
  done: "Gestionada",
};

/** Estilos de chip para agenda (tabla / cards). */
export function agendaUrgencyChipClasses(urgency: AgendaUrgency): {
  shell: string;
  icon: string;
  label: string;
  value: string;
} {
  const text = {
    label: "text-primary-dark",
    value: "text-primary-dark",
  };
  switch (urgency) {
    case "overdue":
      return {
        shell: "bg-red-50",
        icon: "bg-red-100 text-red-700",
        ...text,
      };
    case "due_today":
      return {
        shell: "bg-amber-50",
        icon: "bg-amber-100 text-amber-700",
        ...text,
      };
    case "done":
      return {
        shell: "bg-emerald-50",
        icon: "bg-emerald-100 text-emerald-700",
        ...text,
      };
    default:
      return {
        shell: "bg-sky-50",
        icon: "bg-sky-100 text-sky-700",
        ...text,
      };
  }
}
