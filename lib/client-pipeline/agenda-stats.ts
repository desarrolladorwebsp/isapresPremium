import {
  agendaUrgencyFromIso,
  santiagoMonthKey,
} from "@/lib/client-pipeline/agenda-urgency";
import type { UserRecord } from "@/types/user";

export type AgendaStatBucket =
  | "dueToday"
  | "overdue"
  | "upcoming"
  | "newClients";

export interface ExecutiveAgendaStatItem {
  id: string;
  clientId: string;
  clientName: string;
  responsibleId: string | null;
  responsibleName: string | null;
  responsibleRole: string | null;
  kind: "meeting" | "confirmation" | "no_contesta" | "new_client";
  title: string;
  whenIso: string | null;
  whenLabel: string | null;
  bucket: AgendaStatBucket;
}

export interface ExecutiveAgendaStats {
  dueToday: number;
  overdue: number;
  upcoming: number;
  newClients: number;
  items: Record<AgendaStatBucket, ExecutiveAgendaStatItem[]>;
}

function isActivePipeline(client: UserRecord): boolean {
  const status = client.pipelineStatus ?? "NUEVO";
  return status !== "RECEPCIONADO" && status !== "PERDIDO";
}

function isAssignedTo(
  client: UserRecord,
  executiveId: string | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!executiveId) return false;
  return client.assignedExecutiveId === executiveId;
}

function ownsConfirmation(
  client: UserRecord,
  executiveId: string | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!executiveId) return false;
  const ownerId =
    client.trackingExecutiveId ?? client.assignedExecutiveId ?? null;
  return ownerId === executiveId;
}

function formatAgendaWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function assignedResponsible(client: UserRecord): {
  id: string | null;
  name: string | null;
  role: string | null;
} {
  const id = client.assignedExecutiveId?.trim() || null;
  const name = client.assignedExecutiveName?.trim() || null;
  return { id, name, role: name ? "Ejecutivo asignado" : null };
}

function confirmationResponsible(client: UserRecord): {
  id: string | null;
  name: string | null;
  role: string | null;
} {
  if (client.trackingExecutiveId || client.trackingExecutiveName?.trim()) {
    return {
      id: client.trackingExecutiveId?.trim() || null,
      name: client.trackingExecutiveName?.trim() || null,
      role: "Confirmación Zoom",
    };
  }
  return assignedResponsible(client);
}

function emptyItems(): Record<AgendaStatBucket, ExecutiveAgendaStatItem[]> {
  return {
    dueToday: [],
    overdue: [],
    upcoming: [],
    newClients: [],
  };
}

function pushByUrgency(
  items: Record<AgendaStatBucket, ExecutiveAgendaStatItem[]>,
  row: Omit<ExecutiveAgendaStatItem, "bucket">,
  urgency: "due_today" | "overdue" | "upcoming",
) {
  const bucket: AgendaStatBucket =
    urgency === "due_today"
      ? "dueToday"
      : urgency === "overdue"
        ? "overdue"
        : "upcoming";
  items[bucket].push({ ...row, bucket });
}

function belongsToMonth(
  iso: string | null | undefined,
  monthKey: string | null | undefined,
): boolean {
  if (!monthKey) return true;
  return santiagoMonthKey(iso ?? "") === monthKey;
}

/** Opciones de mes (`YYYY-MM`) hacia atrás desde el mes actual en Chile. */
export function buildAgendaMonthOptions(monthsBack = 11): Array<{
  value: string;
  label: string;
}> {
  const current = santiagoMonthKey(new Date());
  if (!current) return [];

  const [yearRaw, monthRaw] = current.split("-").map(Number);
  const options: Array<{ value: string; label: string }> = [];

  for (let offset = 0; offset <= monthsBack; offset += 1) {
    const cursor = new Date(Date.UTC(yearRaw, monthRaw - 1 - offset, 1));
    const value = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    const labelMonth = new Intl.DateTimeFormat("es-CL", {
      month: "long",
      timeZone: "UTC",
    }).format(cursor);
    const capitalized =
      labelMonth.charAt(0).toUpperCase() + labelMonth.slice(1);
    options.push({
      value,
      label: `${capitalized} ${cursor.getUTCFullYear()}`,
    });
  }

  return options;
}

/**
 * Lista y cuenta gestiones pendientes del ejecutivo (o de toda la cartera si admin).
 * - `nextCallAt` → ejecutivo asignado
 * - `confirmationCallAt` → seguimiento Zoom (o asignado si no hay tracking)
 * - `NUEVO` sin agenda → cliente nuevo por gestionar
 * - `NO_CONTESTA` sin agenda → se suma como vencida
 * - `monthKey` (`YYYY-MM`, Chile) acota fechas de agenda; clientes nuevos por `createdAt`;
 *   pendientes sin fecha (p. ej. no contesta) solo en el mes actual.
 */
export function countExecutiveAgendaStats(input: {
  clients: UserRecord[];
  executiveId: string | null;
  isAdmin: boolean;
  /** Mes calendario Chile (`YYYY-MM`). Sin valor = sin filtro de mes. */
  monthKey?: string | null;
}): ExecutiveAgendaStats {
  const { clients, executiveId, isAdmin, monthKey } = input;
  const items = emptyItems();
  const currentMonthKey = santiagoMonthKey(new Date());
  const includeUndatedOpen =
    !monthKey || (currentMonthKey != null && monthKey === currentMonthKey);

  for (const client of clients) {
    if (!isActivePipeline(client)) continue;

    const assigned = isAssignedTo(client, executiveId, isAdmin);
    const status = client.pipelineStatus ?? "NUEVO";
    const clientName = client.fullName?.trim() || "Cliente sin nombre";

    if (client.confirmationCallAt && ownsConfirmation(client, executiveId, isAdmin)) {
      if (belongsToMonth(client.confirmationCallAt, monthKey)) {
        const urgency = agendaUrgencyFromIso(client.confirmationCallAt);
        if (urgency === "due_today" || urgency === "overdue" || urgency === "upcoming") {
          const responsible = confirmationResponsible(client);
          pushByUrgency(
            items,
            {
              id: `${client.id}:confirmation`,
              clientId: client.id,
              clientName,
              responsibleId: responsible.id,
              responsibleName: responsible.name,
              responsibleRole: responsible.role,
              kind: "confirmation",
              title: "Confirmación Zoom",
              whenIso: client.confirmationCallAt,
              whenLabel: formatAgendaWhen(client.confirmationCallAt),
            },
            urgency,
          );
        }
      }
    }

    if (client.nextCallAt && assigned) {
      if (belongsToMonth(client.nextCallAt, monthKey)) {
        const urgency = agendaUrgencyFromIso(client.nextCallAt);
        if (urgency === "due_today" || urgency === "overdue" || urgency === "upcoming") {
          const responsible = assignedResponsible(client);
          pushByUrgency(
            items,
            {
              id: `${client.id}:meeting`,
              clientId: client.id,
              clientName,
              responsibleId: responsible.id,
              responsibleName: responsible.name,
              responsibleRole: responsible.role,
              kind: "meeting",
              title: "Llamado / reunión",
              whenIso: client.nextCallAt,
              whenLabel: formatAgendaWhen(client.nextCallAt),
            },
            urgency,
          );
        }
      }
    }

    if (assigned && status === "NUEVO" && !client.nextCallAt && !client.confirmationCallAt) {
      if (belongsToMonth(client.createdAt, monthKey)) {
        const responsible = assignedResponsible(client);
        items.newClients.push({
          id: `${client.id}:new`,
          clientId: client.id,
          clientName,
          responsibleId: responsible.id,
          responsibleName: responsible.name,
          responsibleRole: responsible.role,
          kind: "new_client",
          title: "Cliente nuevo",
          whenIso: null,
          whenLabel: null,
          bucket: "newClients",
        });
      }
    }

    if (
      assigned &&
      status === "NO_CONTESTA" &&
      !client.nextCallAt &&
      !client.confirmationCallAt &&
      includeUndatedOpen
    ) {
      const responsible = assignedResponsible(client);
      items.overdue.push({
        id: `${client.id}:no-contesta`,
        clientId: client.id,
        clientName,
        responsibleId: responsible.id,
        responsibleName: responsible.name,
        responsibleRole: responsible.role,
        kind: "no_contesta",
        title: "Reintentar contacto",
        whenIso: null,
        whenLabel: null,
        bucket: "overdue",
      });
    }
  }

  const sortByWhen = (a: ExecutiveAgendaStatItem, b: ExecutiveAgendaStatItem) => {
    const aTime = a.whenIso ? new Date(a.whenIso).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.whenIso ? new Date(b.whenIso).getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return a.clientName.localeCompare(b.clientName, "es");
  };

  items.dueToday.sort(sortByWhen);
  items.overdue.sort(sortByWhen);
  items.upcoming.sort(sortByWhen);
  items.newClients.sort((a, b) => a.clientName.localeCompare(b.clientName, "es"));

  return {
    dueToday: items.dueToday.length,
    overdue: items.overdue.length,
    upcoming: items.upcoming.length,
    newClients: items.newClients.length,
    items,
  };
}
