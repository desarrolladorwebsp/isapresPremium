/**
 * Factory de queryKeys tipadas para el panel ejecutivo.
 * Misma key = mismo caché (p. ej. Inicio y Clientes comparten `clients`).
 */
export const executiveKeys = {
  all: ["executive"] as const,

  clients: () => [...executiveKeys.all, "clients"] as const,

  quotes: () => [...executiveKeys.all, "quotes"] as const,

  /** Prefijo para invalidar todos los rangos de calendario. */
  calendarRoot: () => [...executiveKeys.all, "calendar"] as const,

  calendar: (range: { from: string; to: string }) =>
    [...executiveKeys.calendarRoot(), range.from, range.to] as const,

  clinics: () => [...executiveKeys.all, "clinics"] as const,

  plans: () => [...executiveKeys.all, "plans"] as const,

  executiveAccounts: () =>
    [...executiveKeys.all, "executive-accounts"] as const,
} as const;
