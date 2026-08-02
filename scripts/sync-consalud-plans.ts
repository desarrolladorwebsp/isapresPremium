import { readFile } from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { resolveCanonicalClinicId } from "../lib/clinic-canonical-ids";
import { resolveIsapreIdFromName } from "../lib/isapre-catalog";
import { dedupeCoverageEntries, normalizePlan } from "../lib/api/plan-validation";
import { resolveClinicZoneIds } from "../lib/clinic-zones";
import { resolvePlanZoneIds } from "../lib/plan-zones";
import type { HealthPlan } from "../types/plan";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function ensureClinics(plans: HealthPlan[]) {
  const clinicMap = new Map<string, string>();

  for (const plan of plans) {
    for (const entry of plan.coverage) {
      const clinicId = resolveCanonicalClinicId(entry.clinic_id);
      clinicMap.set(clinicId, entry.clinic_name);
    }
  }

  for (const [id, name] of clinicMap) {
    const zones = resolveClinicZoneIds(id);
    await prisma.clinic.upsert({
      where: { id },
      create: { id, name, zones },
      update: { name, zones },
    });
  }

  return clinicMap.size;
}

async function syncPlans(plans: HealthPlan[]) {
  let created = 0;
  let coverageUpdated = 0;
  let skipped = 0;

  for (const rawPlan of plans) {
    const plan: HealthPlan = normalizePlan({
      ...rawPlan,
      zones: rawPlan.zones ?? [],
      coverage: dedupeCoverageEntries(rawPlan.coverage),
    });

    const resolvedZones = resolvePlanZoneIds(plan);

    const existing = await prisma.plan.findUnique({
      where: { uniqueCode: plan.unique_code },
      include: { _count: { select: { coverages: true } } },
    });

    if (!existing) {
      const isapreId = resolveIsapreIdFromName(plan.isapre);

      await prisma.isapre.upsert({
        where: { id: isapreId },
        create: { id: isapreId, name: plan.isapre },
        update: { name: plan.isapre },
      });

      await prisma.plan.create({
        data: {
          uniqueCode: plan.unique_code,
          isapreId,
          planName: plan.plan_name,
          basePriceUf: plan.base_price_uf,
          // Temporal: homogenizar modalidad como Preferente en imports Isapre.
          planType: "preferred",
          hasTop: true,
          additionalNotes: plan.additional_notes,
          pdfUrl: plan.pdf_url,
          pdfPublicId: plan.pdf_public_id,
          zones: resolvedZones,
          coverages: {
            create: plan.coverage.map((entry) => ({
              clinicId: entry.clinic_id,
              clinicName: entry.clinic_name,
              percentage: entry.percentage,
              type: entry.type,
            })),
          },
        },
      });

      created += 1;
      continue;
    }

    if (plan.coverage.length === 0) {
      await prisma.plan.update({
        where: { uniqueCode: plan.unique_code },
        data: { zones: resolvedZones, basePriceUf: plan.base_price_uf },
      });
      skipped += 1;
      continue;
    }

    if (existing._count.coverages > 0) {
      const unchanged = await prisma.coverageEntry.count({
        where: { planCode: plan.unique_code },
      });
      if (unchanged === plan.coverage.length) {
        await prisma.plan.update({
          where: { uniqueCode: plan.unique_code },
          data: { zones: resolvedZones, basePriceUf: plan.base_price_uf },
        });
        skipped += 1;
        continue;
      }
    }

    await prisma.plan.update({
      where: { uniqueCode: plan.unique_code },
      data: { zones: resolvedZones, basePriceUf: plan.base_price_uf },
    });

    await prisma.coverageEntry.deleteMany({
      where: { planCode: plan.unique_code },
    });

    await prisma.coverageEntry.createMany({
      data: plan.coverage.map((entry) => ({
        planCode: plan.unique_code,
        clinicId: entry.clinic_id,
        clinicName: entry.clinic_name,
        percentage: entry.percentage,
        type: entry.type,
      })),
    });

    coverageUpdated += 1;
  }

  return { created, coverageUpdated, skipped };
}

async function main() {
  const parsedPath = process.argv[2];
  const sourceLabel = process.argv[3] ?? "Consalud";

  if (!parsedPath) {
    console.error(
      "Uso: npx tsx scripts/sync-consalud-plans.ts <ruta-json> [etiqueta]",
    );
    process.exit(1);
  }

  const raw = await readFile(path.resolve(parsedPath), "utf-8");
  const plans = JSON.parse(raw) as HealthPlan[];

  const clinicCount = await ensureClinics(plans);
  const { created, coverageUpdated, skipped } = await syncPlans(plans);

  const [total, withCoverage, withoutCoverage] = await Promise.all([
    prisma.plan.count(),
    prisma.plan.count({ where: { coverages: { some: {} } } }),
    prisma.plan.count({ where: { coverages: { none: {} } } }),
  ]);

  console.log(`Sincronización ${sourceLabel} completada:`);
  console.log(`  - ${plans.length} planes en archivo`);
  console.log(`  - ${created} planes creados`);
  console.log(`  - ${coverageUpdated} planes con coberturas actualizadas`);
  console.log(`  - ${skipped} planes sin cambios`);
  console.log(`  - ${clinicCount} clínicas aseguradas en este lote`);
  console.log(`  - ${withCoverage}/${total} planes con cobertura en BD`);
  console.log(`  - ${withoutCoverage} planes aún sin cobertura`);
}

main()
  .catch((error) => {
    console.error("Error en sincronización:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
