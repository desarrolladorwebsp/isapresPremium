import { dedupeCoverageEntries } from "@/lib/api/plan-validation";
import { prisma } from "@/lib/prisma";
import type { CoverageEntry } from "@/types/plan";

type RawCoverageRow = {
  plan_code: string;
  clinic_id: string;
  clinic_name: string;
  percentage: number;
  type: string;
};

const COVERAGE_CACHE_TTL_MS = 30 * 60 * 1000;

interface CoverageCacheEntry {
  map: Map<string, CoverageEntry[]>;
  loadedAt: number;
}

let coverageCache: CoverageCacheEntry | null = null;
let coverageInflight: Promise<Map<string, CoverageEntry[]>> | null = null;

function mapCoverageRow(row: RawCoverageRow): CoverageEntry {
  return {
    clinic_id: row.clinic_id,
    clinic_name: row.clinic_name,
    percentage: row.percentage,
    type: row.type as CoverageEntry["type"],
  };
}

function buildCoverageMap(rows: RawCoverageRow[]): Map<string, CoverageEntry[]> {
  const map = new Map<string, CoverageEntry[]>();

  for (const row of rows) {
    const entries = map.get(row.plan_code) ?? [];
    entries.push(mapCoverageRow(row));
    map.set(row.plan_code, entries);
  }

  for (const [planCode, entries] of map) {
    map.set(planCode, dedupeCoverageEntries(entries));
  }

  return map;
}

async function loadAllCoveragesFromDb(): Promise<Map<string, CoverageEntry[]>> {
  const rows = await prisma.$queryRaw<RawCoverageRow[]>`
    SELECT plan_code, clinic_id, clinic_name, percentage, type
    FROM coverage_entries
  `;

  return buildCoverageMap(rows);
}

/** Mapa plan_code → coberturas, cacheado en memoria del servidor. */
export async function getCachedCoverageMap(): Promise<Map<string, CoverageEntry[]>> {
  const now = Date.now();

  if (coverageCache && now - coverageCache.loadedAt < COVERAGE_CACHE_TTL_MS) {
    return coverageCache.map;
  }

  if (coverageInflight) {
    return coverageInflight;
  }

  coverageInflight = loadAllCoveragesFromDb()
    .then((map) => {
      coverageCache = { map, loadedAt: Date.now() };
      return map;
    })
    .finally(() => {
      coverageInflight = null;
    });

  return coverageInflight;
}

/** Coberturas de un solo plan (sin cargar toda la tabla). */
export async function loadCoveragesForPlanCode(
  planCode: string,
): Promise<CoverageEntry[]> {
  const rows = await prisma.$queryRaw<RawCoverageRow[]>`
    SELECT plan_code, clinic_id, clinic_name, percentage, type
    FROM coverage_entries
    WHERE plan_code = ${planCode}
  `;

  return dedupeCoverageEntries(rows.map(mapCoverageRow));
}

export function invalidateCoverageCache(): void {
  coverageCache = null;
  coverageInflight = null;
}
