import type { CoverageEntry } from "@/types/plan";

export interface ClinicCoverageRow {
  clinicId: string;
  clinicName: string;
  hospitalaria: number | null;
  ambulatoria: number | null;
}

export function buildClinicCoverageRows(
  coverage: CoverageEntry[],
): ClinicCoverageRow[] {
  const byClinic = new Map<string, ClinicCoverageRow>();

  for (const entry of coverage) {
    const existing = byClinic.get(entry.clinic_id) ?? {
      clinicId: entry.clinic_id,
      clinicName: entry.clinic_name,
      hospitalaria: null,
      ambulatoria: null,
    };

    if (entry.type === "hospitalaria") {
      existing.hospitalaria = entry.percentage;
    } else {
      existing.ambulatoria = entry.percentage;
    }

    byClinic.set(entry.clinic_id, existing);
  }

  return Array.from(byClinic.values()).sort((a, b) =>
    a.clinicName.localeCompare(b.clinicName, "es"),
  );
}

export function formatCoverageCell(value: number | null): string {
  if (value === null) return "No aplica";
  return `${value}%`;
}

/** Urgencia no está modelada; se usa ambulatoria como referencia en red preferente. */
export function resolveUrgenciaDisplay(row: ClinicCoverageRow): string {
  if (row.ambulatoria !== null) return `${row.ambulatoria}%`;
  if (row.hospitalaria !== null) return `${row.hospitalaria}%`;
  return "No aplica";
}
