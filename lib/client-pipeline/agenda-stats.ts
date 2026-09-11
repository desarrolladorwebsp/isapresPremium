import {
  agendaUrgencyFromIso,
  santiagoDateKey,
  santiagoMonthKey,
} from "@/lib/client-pipeline/agenda-urgency";
import type { UserRecord } from "@/types/user";

export type AgendaStatBucket =
  | "dueToday"
  | "overdue"
  | "upcoming"
  | "newClients";

export type NewClientIntakeSource = "web" | "self_registered" | "assigned";

export interface ExecutiveAgendaStatItem {
  id: string;
  clientId: string;
  clientName: string;
  responsibleId: string | null;
  responsibleName: string | null;
  responsibleRole: string | null;
  kind: "meeting" | "confirmation" | "new_client";
  title: string;
  /** Acción concreta que el ejecutivo debe hacer. */
  action: string;
  whenIso: string | null;
  whenLabel: string | null;
  bucket: AgendaStatBucket;
  intakeSource?: NewClientIntakeSource;
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
  return status !== "RECEPCIONADO" && status !== "PERDIDO" && status !== "CERRADO";
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

function formatAgendaDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
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

export function isZoomScheduledMeeting(client: UserRecord): boolean {
  if (client.preferredContactMethod === "WHATSAPP") return false;
  if (client.preferredContactMethod === "ZOOM") return true;
  if (client.calendlyTeam) return true;
  if (client.zoomJoinUrl?.trim()) return true;
  return client.assignedExecutiveKind === "ZOOM";
}

export function resolveNewClientIntakeSource(
  client: UserRecord,
): NewClientIntakeSource {
  const origin = client.clientOrigin ?? "MANUAL";
  if (origin === "COTIZADOR" || origin === "FORMULARIO_WEB") {
    return "web";
  }
  const assignedId = client.assignedExecutiveId?.trim() || null;
  const registeredById = client.registeredById?.trim() || null;
  if (assignedId && registeredById && assignedId === registeredById) {
    return "self_registered";
  }
  return "assigned";
}

function meetingTitle(client: UserRecord): string {
  if (isZoomScheduledMeeting(client)) return "Reunión Zoom";
  if (client.preferredContactMethod === "WHATSAPP") return "Contacto WhatsApp";
  return "Llamado / reunión";
}

function meetingAction(
  client: UserRecord,
  urgency: "due_today" | "overdue" | "upcoming",
): string {
  if (isZoomScheduledMeeting(client)) {
    if (urgency === "overdue") {
      return "Confirmar si se llevó a cabo la reunión Zoom. Márcala como realizada o reagéndala.";
    }
    if (urgency === "due_today") {
      return "Realizar la reunión Zoom de hoy o confirmar si se hizo.";
    }
    return "Reunión Zoom agendada para los próximos días.";
  }
  if (urgency === "due_today") {
    return "Realizar el llamado o contacto de hoy.";
  }
  return "Llamado o contacto agendado para los próximos días.";
}

function confirmationAction(
  urgency: "due_today" | "overdue" | "upcoming",
): string {
  if (urgency === "overdue") {
    return "Confirmar si el cliente asistirá a la reunión Zoom. Esta confirmación sigue pendiente.";
  }
  if (urgency === "due_today") {
    return "Llamar ahora para confirmar la reunión Zoom de hoy.";
  }
  return "Llamar para confirmar la reunión Zoom en la fecha indicada.";
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

function isBeforeToday(iso: string | null | undefined): boolean {
  const day = santiagoDateKey(iso ?? "");
  const today = santiagoDateKey(new Date());
  if (!day || !today) return false;
  return day < today;
}

function isNewWithoutGestion(client: UserRecord): boolean {
  const status = client.pipelineStatus ?? "NUEVO";
  return (
    status === "NUEVO" && !client.nextCallAt && !client.confirmationCallAt
  );
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
 * Gestiones pendientes del ejecutivo (o de toda la cartera si admin).
 * - Confirmación Zoom → `confirmationCallAt`
 * - Reunión / llamado → `nextCallAt` (Hoy/Futuras: todos los canales; Atrasadas: solo Zoom)
 * - Cliente nuevo sin gestión → `NUEVO` sin agenda (Atrasadas si ingresó antes de hoy)
 * - `monthKey` (`YYYY-MM`, Chile) acota por fecha de la gestión o `createdAt` en nuevos
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

  for (const client of clients) {
    if (!isActivePipeline(client)) continue;

    const assigned = isAssignedTo(client, executiveId, isAdmin);
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
              action: confirmationAction(urgency),
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
        const isZoom = isZoomScheduledMeeting(client);
        const include =
          urgency === "due_today" ||
          urgency === "upcoming" ||
          (urgency === "overdue" && isZoom);
        if (include) {
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
              title: meetingTitle(client),
              action: meetingAction(client, urgency),
              whenIso: client.nextCallAt,
              whenLabel: formatAgendaWhen(client.nextCallAt),
            },
            urgency,
          );
        }
      }
    }

    if (assigned && isNewWithoutGestion(client)) {
      if (belongsToMonth(client.createdAt, monthKey)) {
        const responsible = assignedResponsible(client);
        const intakeSource = resolveNewClientIntakeSource(client);
        const enteredLabel = formatAgendaDay(client.createdAt);
        items.newClients.push({
          id: `${client.id}:new`,
          clientId: client.id,
          clientName,
          responsibleId: responsible.id,
          responsibleName: responsible.name,
          responsibleRole: responsible.role,
          kind: "new_client",
          title: "Cliente nuevo",
          action:
            "Hacer el primer contacto. Si no responde, marca No contesta.",
          whenIso: client.createdAt,
          whenLabel: enteredLabel ? `Ingresó el ${enteredLabel}` : null,
          bucket: "newClients",
          intakeSource,
        });

        if (isBeforeToday(client.createdAt)) {
          items.overdue.push({
            id: `${client.id}:new-overdue`,
            clientId: client.id,
            clientName,
            responsibleId: responsible.id,
            responsibleName: responsible.name,
            responsibleRole: responsible.role,
            kind: "new_client",
            title: "Cliente nuevo sin gestión",
            action:
              "Hacer el primer contacto: es un cliente nuevo de un día anterior sin ninguna gestión.",
            whenIso: client.createdAt,
            whenLabel: enteredLabel ? `Ingresó el ${enteredLabel}` : null,
            bucket: "overdue",
            intakeSource,
          });
        }
      }
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
