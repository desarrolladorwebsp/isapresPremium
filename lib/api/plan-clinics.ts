import { prisma } from "@/lib/prisma";

export interface PlanCatalogClinicOption {
  id: string;
  name: string;
}

const CLINICS_CACHE_TTL_MS = 30 * 60 * 1000;

let clinicsCache: { items: PlanCatalogClinicOption[]; loadedAt: number } | null =
  null;
let clinicsInflight: Promise<PlanCatalogClinicOption[]> | null = null;

/**
 * Clínicas del catálogo canónico (tabla clinics) que aparecen en coberturas.
 * Usa el nombre oficial de la clínica — no los alias sucios de import (A.3, etc.).
 */
export async function readPlanCatalogClinics(): Promise<PlanCatalogClinicOption[]> {
  const now = Date.now();

  if (clinicsCache && now - clinicsCache.loadedAt < CLINICS_CACHE_TTL_MS) {
    return clinicsCache.items;
  }

  if (clinicsInflight) {
    return clinicsInflight;
  }

  clinicsInflight = prisma
    .$queryRaw<Array<{ clinic_id: string; clinic_name: string }>>`
      SELECT c.id AS clinic_id, c.name AS clinic_name
      FROM clinics c
      WHERE EXISTS (
        SELECT 1
        FROM coverage_entries ce
        WHERE ce.clinic_id = c.id
      )
      ORDER BY c.name ASC
    `
    .then((rows) =>
      rows
        .map((row) => ({
          id: row.clinic_id.trim(),
          name: row.clinic_name.trim(),
        }))
        .filter((row) => row.id && row.name),
    )
    .then((items) => {
      clinicsCache = { items, loadedAt: Date.now() };
      return items;
    })
    .finally(() => {
      clinicsInflight = null;
    });

  return clinicsInflight;
}

export function invalidatePlanCatalogClinicsCache(): void {
  clinicsCache = null;
  clinicsInflight = null;
}
