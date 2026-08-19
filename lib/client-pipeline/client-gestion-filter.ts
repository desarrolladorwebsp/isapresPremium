import { agendaUrgencyFromIso } from "@/lib/client-pipeline/agenda-urgency";
import type { UserRecord } from "@/types/user";

export type ClientGestionFilter =
  | "hoy"
  | "vencidas"
  | "futuras"
  | "gestionadas";

export const CLIENT_GESTION_FILTER_OPTIONS: Array<{
  value: ClientGestionFilter;
  label: string;
}> = [
  { value: "hoy", label: "Hoy" },
  { value: "vencidas", label: "Vencidas" },
  { value: "futuras", label: "Futuras" },
  { value: "gestionadas", label: "Gestionadas" },
];

/** Por defecto: pendientes (sin gestionadas). */
export const DEFAULT_CLIENT_GESTION_FILTERS: ClientGestionFilter[] = [
  "hoy",
  "vencidas",
  "futuras",
];

function addUrgencyBucket(
  buckets: Set<ClientGestionFilter>,
  iso: string | null | undefined,
): boolean {
  if (!iso) return false;
  const urgency = agendaUrgencyFromIso(iso);
  if (urgency === "due_today") {
    buckets.add("hoy");
    return true;
  }
  if (urgency === "overdue") {
    buckets.add("vencidas");
    return true;
  }
  if (urgency === "upcoming") {
    buckets.add("futuras");
    return true;
  }
  return false;
}

/**
 * Clasifica al cliente según gestiones de agenda pendientes / hechas.
 * Un cliente puede caer en más de un bucket (p. ej. confirmación hoy + llamado futuro).
 */
export function clientGestionBuckets(
  client: UserRecord,
): Set<ClientGestionFilter> {
  const buckets = new Set<ClientGestionFilter>();
  const status = client.pipelineStatus ?? "NUEVO";

  if (status === "RECEPCIONADO" || status === "PERDIDO" || status === "CERRADO") {
    buckets.add("gestionadas");
    return buckets;
  }

  let hasPending = false;
  if (addUrgencyBucket(buckets, client.confirmationCallAt)) hasPending = true;
  if (addUrgencyBucket(buckets, client.nextCallAt)) hasPending = true;

  if (
    status === "NUEVO" &&
    !client.nextCallAt &&
    !client.confirmationCallAt
  ) {
    buckets.add("hoy");
    hasPending = true;
  }

  if (
    status === "NO_CONTESTA" &&
    !client.nextCallAt &&
    !client.confirmationCallAt
  ) {
    buckets.add("vencidas");
    hasPending = true;
  }

  if (!hasPending) {
    buckets.add("gestionadas");
  }

  return buckets;
}

export function clientMatchesGestionFilters(
  client: UserRecord,
  selected: readonly ClientGestionFilter[],
): boolean {
  if (selected.length === 0) return false;
  const buckets = clientGestionBuckets(client);
  return selected.some((value) => buckets.has(value));
}
