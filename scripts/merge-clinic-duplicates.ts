/**
 * Fusiona clínicas duplicadas en el catálogo canónico.
 *
 *   npx tsx scripts/merge-clinic-duplicates.ts          # simulación
 *   npx tsx scripts/merge-clinic-duplicates.ts --apply  # escribe en BD
 */
import { config } from "dotenv";
import path from "node:path";
import { invalidatePlanCatalogCache } from "../lib/api/plan-catalog-cache";
import { listClinicMergePairs } from "../lib/clinic-canonical-ids";
import { prisma } from "../lib/prisma";

config({ path: path.join(process.cwd(), ".env.local") });

interface MergeResult {
  from: string;
  to: string;
  status: "merged" | "skipped_missing_from" | "skipped_missing_to" | "error";
  movedCoverages: number;
  deletedDuplicateCoverages: number;
  message?: string;
}

async function mergeClinicPair(
  fromId: string,
  toId: string,
  apply: boolean,
): Promise<MergeResult> {
  const base: MergeResult = {
    from: fromId,
    to: toId,
    status: "merged",
    movedCoverages: 0,
    deletedDuplicateCoverages: 0,
  };

  if (fromId === toId) {
    return { ...base, status: "skipped_missing_from", message: "same id" };
  }

  const [from, to] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: fromId } }),
    prisma.clinic.findUnique({ where: { id: toId } }),
  ]);

  if (!from) {
    return { ...base, status: "skipped_missing_from" };
  }

  if (!to) {
    return {
      ...base,
      status: "skipped_missing_to",
      message: `Canónica ${toId} no existe`,
    };
  }

  const coverages = await prisma.coverageEntry.findMany({
    where: { clinicId: fromId },
  });

  if (!apply) {
    return {
      ...base,
      status: "merged",
      movedCoverages: coverages.length,
      message: "dry-run",
    };
  }

  let movedCoverages = 0;
  let deletedDuplicateCoverages = 0;

  for (const coverage of coverages) {
    const existing = await prisma.coverageEntry.findFirst({
      where: {
        planCode: coverage.planCode,
        clinicId: toId,
        type: coverage.type,
      },
    });

    if (existing) {
      if (coverage.percentage > existing.percentage) {
        await prisma.coverageEntry.update({
          where: { id: existing.id },
          data: {
            percentage: coverage.percentage,
            clinicName: to.name,
          },
        });
      }
      await prisma.coverageEntry.delete({ where: { id: coverage.id } });
      deletedDuplicateCoverages += 1;
    } else {
      await prisma.coverageEntry.update({
        where: { id: coverage.id },
        data: {
          clinicId: toId,
          clinicName: to.name,
        },
      });
      movedCoverages += 1;
    }
  }

  const mergedZones = [...new Set([...to.zones, ...from.zones])];

  await prisma.clinic.update({
    where: { id: toId },
    data: {
      zones: mergedZones,
      address: to.address ?? from.address,
      lat: to.lat ?? from.lat,
      lng: to.lng ?? from.lng,
      locationSource: to.locationSource ?? from.locationSource,
      locationUpdatedAt: to.locationUpdatedAt ?? from.locationUpdatedAt,
    },
  });

  await prisma.clinic.delete({ where: { id: fromId } });

  return {
    ...base,
    status: "merged",
    movedCoverages,
    deletedDuplicateCoverages,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const pairs = listClinicMergePairs();

  console.log(
    apply
      ? "Aplicando fusiones de clínicas duplicadas…"
      : "Simulación de fusiones de clínicas duplicadas…",
  );
  console.log(`Pares configurados: ${pairs.length}`);

  const results: MergeResult[] = [];

  for (const pair of pairs) {
    const result = await mergeClinicPair(pair.from, pair.to, apply);
    results.push(result);

    if (result.status === "merged") {
      console.log(
        `  [${apply ? "ok" : "dry"}] ${pair.from} → ${pair.to}` +
          (result.movedCoverages
            ? ` · ${result.movedCoverages} coberturas`
            : "") +
          (result.deletedDuplicateCoverages
            ? ` · ${result.deletedDuplicateCoverages} duplicadas`
            : ""),
      );
    } else if (result.status === "skipped_missing_from") {
      console.log(`  [skip] ${pair.from} → ${pair.to} (origen no existe)`);
    } else {
      console.log(
        `  [warn] ${pair.from} → ${pair.to}: ${result.message ?? result.status}`,
      );
    }
  }

  const merged = results.filter((item) => item.status === "merged").length;
  const moved = results.reduce((sum, item) => sum + item.movedCoverages, 0);
  const deduped = results.reduce(
    (sum, item) => sum + item.deletedDuplicateCoverages,
    0,
  );

  console.log("\nResumen:");
  console.log(`  - Fusiones: ${merged}`);
  console.log(`  - Coberturas reasignadas: ${moved}`);
  console.log(`  - Coberturas duplicadas eliminadas: ${deduped}`);

  if (apply) {
    invalidatePlanCatalogCache();
    console.log("  - Caché de catálogo invalidada");
  }
}

main()
  .catch((error) => {
    console.error("Error al fusionar clínicas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
