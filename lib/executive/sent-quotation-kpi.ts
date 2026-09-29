import { isoInPeriod, isValidReportPeriod, type AdminReportPeriod } from "@/lib/executive/admin-reports";
import { ISAPRE_CATALOG, resolveIsapreIdFromName } from "@/lib/isapre-catalog";

/** Documentos que ya salieron al cliente. Borrador y anulada quedan fuera. */
export const SENT_QUOTATION_KPI_STATUSES = [
  "SENT",
  "RECEIVED",
  "ACCEPTED",
  "REJECTED",
] as const;

export type SentQuotationKpiStatus = (typeof SENT_QUOTATION_KPI_STATUSES)[number];

export interface SentQuotationKpiRow {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  executiveId: string;
  executiveName: string;
  status: SentQuotationKpiStatus;
  sentAt: string;
  receivedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  isapres: string[];
}

export interface SentQuotationIsapreOption {
  id: string;
  label: string;
}

export interface SentQuotationReportRow {
  executiveId: string;
  executiveName: string;
  sentCount: number;
  receivedCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface SentQuotationReport {
  rows: SentQuotationReportRow[];
  total: number;
  receivedTotal: number;
  acceptedTotal: number;
  rejectedTotal: number;
}

export function sentQuotationIsapreIds(isapres: readonly string[]): string[] {
  return [...new Set(isapres.map((name) => resolveIsapreIdFromName(name)).filter(Boolean))];
}

/** Catálogo fijo, más nombres que aparezcan en documentos y no estén en el catálogo. */
export function sentQuotationIsapreOptions(
  quotations: readonly SentQuotationKpiRow[],
): SentQuotationIsapreOption[] {
  const extras = new Map<string, string>();
  for (const row of quotations) {
    for (const name of row.isapres) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const id = resolveIsapreIdFromName(trimmed);
      if (!id || ISAPRE_CATALOG.some((item) => item.id === id)) continue;
      if (!extras.has(id)) extras.set(id, trimmed);
    }
  }
  const extraOptions = [...extras.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "es"));
  return [
    ...ISAPRE_CATALOG.map((item) => ({ id: item.id, label: item.name })),
    ...extraOptions,
  ];
}

interface QuotationKpiFilter {
  quotations: readonly SentQuotationKpiRow[];
  period: AdminReportPeriod;
  /** Vacío = todos los ejecutivos. */
  selectedExecutiveIds: readonly string[];
  /** Vacío = todas las isapres. El documento cuenta si incluye al menos una. */
  selectedIsapreIds: readonly string[];
}

function matchesQuotationScope(
  row: SentQuotationKpiRow,
  input: QuotationKpiFilter,
): boolean {
  if (
    input.selectedExecutiveIds.length > 0 &&
    !input.selectedExecutiveIds.includes(row.executiveId)
  ) {
    return false;
  }
  if (input.selectedIsapreIds.length === 0) return true;
  const selected = new Set(input.selectedIsapreIds);
  return sentQuotationIsapreIds(row.isapres).some((id) => selected.has(id));
}

export function filterSentQuotations(input: QuotationKpiFilter): SentQuotationKpiRow[] {
  if (!isValidReportPeriod(input.period)) return [];
  return input.quotations.filter((row) => {
    if (!isoInPeriod(row.sentAt, input.period)) return false;
    return matchesQuotationScope(row, input);
  });
}

export type QuotationOutcomeStatus = "RECEIVED" | "ACCEPTED" | "REJECTED";

const OUTCOME_DATE: Record<
  QuotationOutcomeStatus,
  "receivedAt" | "acceptedAt" | "rejectedAt"
> = {
  RECEIVED: "receivedAt",
  ACCEPTED: "acceptedAt",
  REJECTED: "rejectedAt",
};

/** Estado actual en el período de ese cambio, con el mismo ejecutivo e isapre. */
export function filterOutcomeQuotations(
  input: QuotationKpiFilter & { status: QuotationOutcomeStatus },
): SentQuotationKpiRow[] {
  if (!isValidReportPeriod(input.period)) return [];
  const dateKey = OUTCOME_DATE[input.status];
  return input.quotations.filter((row) => {
    const at = row[dateKey];
    if (row.status !== input.status || !at) return false;
    if (!isoInPeriod(at, input.period)) return false;
    return matchesQuotationScope(row, input);
  });
}

export function groupSentQuotationsByExecutive(
  quotations: readonly SentQuotationKpiRow[],
): Array<{
  executiveId: string;
  executiveName: string;
  items: SentQuotationKpiRow[];
}> {
  const groups = new Map<
    string,
    { executiveId: string; executiveName: string; items: SentQuotationKpiRow[] }
  >();
  for (const row of quotations) {
    const existing = groups.get(row.executiveId);
    if (existing) existing.items.push(row);
    else {
      groups.set(row.executiveId, {
        executiveId: row.executiveId,
        executiveName: row.executiveName,
        items: [row],
      });
    }
  }
  return [...groups.values()].sort((left, right) =>
    left.executiveName.localeCompare(right.executiveName, "es", {
      sensitivity: "base",
    }),
  );
}

/**
 * Tabla de reportes. Con ejecutivos elegidos, muestra también los que van en cero.
 * Sin selección, solo quienes tienen algún documento en el filtro.
 */
export function buildSentQuotationReport(input: {
  quotations: readonly SentQuotationKpiRow[];
  period: AdminReportPeriod;
  selectedExecutiveIds: readonly string[];
  selectedIsapreIds: readonly string[];
  executiveNames?: Map<string, string>;
}): SentQuotationReport {
  const sent = filterSentQuotations(input);
  const received = filterOutcomeQuotations({ ...input, status: "RECEIVED" });
  const accepted = filterOutcomeQuotations({ ...input, status: "ACCEPTED" });
  const rejected = filterOutcomeQuotations({ ...input, status: "REJECTED" });
  const counts = new Map<string, SentQuotationReportRow>();

  function ensure(row: SentQuotationKpiRow): SentQuotationReportRow {
    const existing = counts.get(row.executiveId);
    if (existing) return existing;
    const created: SentQuotationReportRow = {
      executiveId: row.executiveId,
      executiveName: row.executiveName,
      sentCount: 0,
      receivedCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
    };
    counts.set(row.executiveId, created);
    return created;
  }

  for (const row of sent) ensure(row).sentCount += 1;
  for (const row of received) ensure(row).receivedCount += 1;
  for (const row of accepted) ensure(row).acceptedCount += 1;
  for (const row of rejected) ensure(row).rejectedCount += 1;

  if (input.selectedExecutiveIds.length > 0) {
    for (const id of input.selectedExecutiveIds) {
      if (counts.has(id)) continue;
      counts.set(id, {
        executiveId: id,
        executiveName: input.executiveNames?.get(id) || "Ejecutivo",
        sentCount: 0,
        receivedCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
      });
    }
  }

  const rows = [...counts.values()].sort((left, right) =>
    left.executiveName.localeCompare(right.executiveName, "es", {
      sensitivity: "base",
    }),
  );
  return {
    rows,
    total: sent.length,
    receivedTotal: received.length,
    acceptedTotal: accepted.length,
    rejectedTotal: rejected.length,
  };
}
