import {
  agendaUrgencyFromIso,
  santiagoDateKey,
} from "@/lib/client-pipeline/agenda-urgency";
import { isZoomScheduledMeeting } from "@/lib/client-pipeline/agenda-stats";
import {
  CLIENT_PIPELINE_STATUS_OPTIONS,
} from "@/lib/client-pipeline/constants";
import { ADMIN_EXECUTIVE_FILTER_UNASSIGNED } from "@/lib/executive/dashboard-executive-filter";
import type { ClientPipelineStatus } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";

export type AdminReportPeriod =
  | { kind: "month"; monthKey: string }
  | { kind: "range"; fromDay: string; toDay: string };

export type PipelineStatusCounts = Record<ClientPipelineStatus, number>;

export interface AdminReportExecutiveRow {
  executiveId: string | null;
  executiveName: string;
  pipeline: PipelineStatusCounts;
  pipelineTotal: number;
  firstContactTotal: number;
  firstContactDone: number;
  firstContactPending: number;
  firstContactRate: number;
  zoomOverdue: number;
  zoomToday: number;
  zoomUpcoming: number;
  confirmOverdue: number;
  confirmToday: number;
  confirmUpcoming: number;
  newWithoutGestion: number;
}

export interface AdminReportsResult {
  rows: AdminReportExecutiveRow[];
  totals: AdminReportExecutiveRow;
}

function emptyStatusCounts(): PipelineStatusCounts {
  return {
    NUEVO: 0,
    CONTACTADO: 0,
    NO_CONTESTA: 0,
    EN_SEGUIMIENTO: 0,
    ENVIADO_ISAPRE: 0,
    CERRADO: 0,
    RECEPCIONADO: 0,
    PERDIDO: 0,
  };
}

export function dateKeyInPeriod(
  day: string | null,
  period: AdminReportPeriod,
): boolean {
  if (!day) return false;
  if (period.kind === "month") return day.startsWith(period.monthKey);
  return day >= period.fromDay && day <= period.toDay;
}

export function isoInPeriod(
  iso: string | null | undefined,
  period: AdminReportPeriod,
): boolean {
  return dateKeyInPeriod(santiagoDateKey(iso ?? ""), period);
}

export function isValidReportPeriod(period: AdminReportPeriod): boolean {
  if (period.kind === "month") {
    return /^\d{4}-\d{2}$/.test(period.monthKey);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.fromDay)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.toDay)) return false;
  return period.fromDay <= period.toDay;
}

function isNewWithoutGestion(client: UserRecord): boolean {
  const status = client.pipelineStatus ?? "NUEVO";
  return (
    status === "NUEVO" && !client.nextCallAt && !client.confirmationCallAt
  );
}

export function clientMatchesReportExecutives(
  client: UserRecord,
  selectedExecutiveIds: readonly string[],
): boolean {
  if (selectedExecutiveIds.length === 0) return true;
  const assignedId = client.assignedExecutiveId?.trim() || "";
  if (!assignedId) {
    return selectedExecutiveIds.includes(ADMIN_EXECUTIVE_FILTER_UNASSIGNED);
  }
  return selectedExecutiveIds.includes(assignedId);
}

function executiveKey(client: UserRecord): string {
  return client.assignedExecutiveId?.trim() || ADMIN_EXECUTIVE_FILTER_UNASSIGNED;
}

function emptyRow(
  executiveId: string | null,
  executiveName: string,
): AdminReportExecutiveRow {
  return {
    executiveId,
    executiveName,
    pipeline: emptyStatusCounts(),
    pipelineTotal: 0,
    firstContactTotal: 0,
    firstContactDone: 0,
    firstContactPending: 0,
    firstContactRate: 0,
    zoomOverdue: 0,
    zoomToday: 0,
    zoomUpcoming: 0,
    confirmOverdue: 0,
    confirmToday: 0,
    confirmUpcoming: 0,
    newWithoutGestion: 0,
  };
}

function bumpUrgency(
  row: AdminReportExecutiveRow,
  kind: "zoom" | "confirm",
  urgency: "overdue" | "due_today" | "upcoming",
) {
  if (kind === "zoom") {
    if (urgency === "overdue") row.zoomOverdue += 1;
    else if (urgency === "due_today") row.zoomToday += 1;
    else row.zoomUpcoming += 1;
    return;
  }
  if (urgency === "overdue") row.confirmOverdue += 1;
  else if (urgency === "due_today") row.confirmToday += 1;
  else row.confirmUpcoming += 1;
}

function finalizeRate(row: AdminReportExecutiveRow) {
  row.firstContactRate =
    row.firstContactTotal === 0
      ? 0
      : Math.round((row.firstContactDone / row.firstContactTotal) * 100);
}

function addRowInto(
  target: AdminReportExecutiveRow,
  source: AdminReportExecutiveRow,
) {
  for (const status of CLIENT_PIPELINE_STATUS_OPTIONS) {
    target.pipeline[status] += source.pipeline[status];
  }
  target.pipelineTotal += source.pipelineTotal;
  target.firstContactTotal += source.firstContactTotal;
  target.firstContactDone += source.firstContactDone;
  target.firstContactPending += source.firstContactPending;
  target.zoomOverdue += source.zoomOverdue;
  target.zoomToday += source.zoomToday;
  target.zoomUpcoming += source.zoomUpcoming;
  target.confirmOverdue += source.confirmOverdue;
  target.confirmToday += source.confirmToday;
  target.confirmUpcoming += source.confirmUpcoming;
  target.newWithoutGestion += source.newWithoutGestion;
}

/**
 * Reportes admin sobre la cartera actual.
 * - Pipeline y primer contacto: clientes ingresados (`createdAt`) en el período.
 * - Cumplimiento: gestiones pendientes cuya fecha cae en el período.
 * Cuenta quien tiene el cliente asignado ahora.
 */
export function buildAdminReports(input: {
  clients: UserRecord[];
  period: AdminReportPeriod;
  selectedExecutiveIds: readonly string[];
  executiveNames?: Map<string, string>;
}): AdminReportsResult {
  const totals = emptyRow(null, "Total");
  const rowsById = new Map<string, AdminReportExecutiveRow>();

  if (!isValidReportPeriod(input.period)) {
    return { rows: [], totals };
  }

  const ensureRow = (client: UserRecord): AdminReportExecutiveRow => {
    const key = executiveKey(client);
    const existing = rowsById.get(key);
    if (existing) return existing;
    const id =
      key === ADMIN_EXECUTIVE_FILTER_UNASSIGNED
        ? null
        : client.assignedExecutiveId?.trim() || null;
    const named =
      (id ? input.executiveNames?.get(id) : null) ||
      client.assignedExecutiveName?.trim() ||
      (id ? "Ejecutivo" : "Sin asignar");
    const created = emptyRow(id, named);
    rowsById.set(key, created);
    return created;
  };

  for (const client of input.clients) {
    if (!clientMatchesReportExecutives(client, input.selectedExecutiveIds)) {
      continue;
    }

    const createdInPeriod = isoInPeriod(client.createdAt, input.period);

    if (createdInPeriod) {
      const target = ensureRow(client);
      const status = client.pipelineStatus ?? "NUEVO";
      target.pipeline[status] += 1;
      target.pipelineTotal += 1;
      target.firstContactTotal += 1;
      if (isNewWithoutGestion(client)) {
        target.firstContactPending += 1;
        target.newWithoutGestion += 1;
      } else {
        target.firstContactDone += 1;
      }
    }

    if (client.nextCallAt && isoInPeriod(client.nextCallAt, input.period)) {
      const urgency = agendaUrgencyFromIso(client.nextCallAt);
      const includeMeeting =
        urgency === "due_today" ||
        urgency === "upcoming" ||
        (urgency === "overdue" && isZoomScheduledMeeting(client));
      if (
        includeMeeting &&
        (urgency === "overdue" ||
          urgency === "due_today" ||
          urgency === "upcoming")
      ) {
        bumpUrgency(ensureRow(client), "zoom", urgency);
      }
    }

    if (
      client.confirmationCallAt &&
      isoInPeriod(client.confirmationCallAt, input.period)
    ) {
      const urgency = agendaUrgencyFromIso(client.confirmationCallAt);
      if (
        urgency === "overdue" ||
        urgency === "due_today" ||
        urgency === "upcoming"
      ) {
        bumpUrgency(ensureRow(client), "confirm", urgency);
      }
    }
  }

  const selected = input.selectedExecutiveIds;
  if (selected.length > 0) {
    for (const id of selected) {
      if (rowsById.has(id)) continue;
      const name =
        id === ADMIN_EXECUTIVE_FILTER_UNASSIGNED
          ? "Sin asignar"
          : input.executiveNames?.get(id) || "Ejecutivo";
      rowsById.set(
        id,
        emptyRow(id === ADMIN_EXECUTIVE_FILTER_UNASSIGNED ? null : id, name),
      );
    }
  }

  const rows = Array.from(rowsById.values()).sort((left, right) =>
    left.executiveName.localeCompare(right.executiveName, "es", {
      sensitivity: "base",
    }),
  );

  for (const row of rows) {
    finalizeRate(row);
    addRowInto(totals, row);
  }
  finalizeRate(totals);

  return { rows, totals };
}
