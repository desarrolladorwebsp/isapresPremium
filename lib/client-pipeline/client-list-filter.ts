import type { UserRecord, ClientOrigin } from "@/types/user";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import { clientMatchesGestionFilters, type ClientGestionFilter } from "./client-gestion-filter";

const GESTION_INDEPENDENT_STATUSES = new Set<ClientPipelineStatus>([
  "PAUSADO", "PENDIENTE", "PERDIDO", "RECEPCIONADO", "CERRADO",
]);

/** OR within a filter; AND between filters. Never mutates records or ownership. */
export function filterClientList(clients: readonly UserRecord[], {
  search, statuses, executiveIds, gestion, filterExecutives, origins = [],
}: {
  search: string;
  statuses: readonly ClientPipelineStatus[];
  executiveIds: readonly string[];
  gestion: readonly ClientGestionFilter[];
  filterExecutives: boolean;
  origins?: readonly ClientOrigin[];
}): UserRecord[] {
  const query = search.trim().toLowerCase();
  return clients.filter(client => {
    const status = client.pipelineStatus ?? "NUEVO";
    if (origins.length && !origins.includes(client.clientOrigin ?? "MANUAL")) return false;
    if (statuses.length ? !statuses.includes(status) : status === "PAUSADO") return false;
    // Preserve explicit terminal/paused/pending selection and text search behavior.
    // Apply this per row so selecting a paused status does not unfilter other statuses.
    const bypassGestion = query.length > 0 ||
      (statuses.includes(status) && GESTION_INDEPENDENT_STATUSES.has(status));
    if (!bypassGestion && !clientMatchesGestionFilters(client, gestion)) return false;
    if (filterExecutives && executiveIds.length && !executiveIds.includes(
      client.assignedExecutiveId || "__unassigned__",
    )) return false;
    if (!query) return true;
    return [client.fullName, client.email, client.phone, client.rut,
      client.cotizadorSource?.label, client.cotizadorSource?.slug,
      client.cotizadorSource?.description, client.webFormSource]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(query));
  });
}

/** Keep missing schedules last for either direction; support numeric and Spanish text. */
export function compareClientListValues(a: string | number, b: string | number, direction: "asc" | "desc"): number {
  const missingA = typeof a === "number" && !Number.isFinite(a);
  const missingB = typeof b === "number" && !Number.isFinite(b);
  if (missingA || missingB) return missingA === missingB ? 0 : missingA ? 1 : -1;
  const comparison = typeof a === "number" && typeof b === "number" ? a - b :
    String(a).localeCompare(String(b), "es", { sensitivity: "base", numeric: true });
  return comparison * (direction === "asc" ? 1 : -1);
}
