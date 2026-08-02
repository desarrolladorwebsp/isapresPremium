import { readFile } from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { resolveIsapreIdFromName } from "../lib/isapre-catalog";
import { dedupeCoverageEntries } from "../lib/api/plan-validation";
import type { HealthPlan } from "../types/plan";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

const PARSED_PATH = path.join(
  process.cwd(),
  "scripts/.centro-plans-parsed.json",
);

async function ensureClinics(plans: HealthPlan[]) {
  const clinicMap = new Map<string, string>();

  for (const plan of plans) {
    for (const entry of plan.coverage) {
      clinicMap.set(entry.clinic_id, entry.clinic_name);
    }
  }

  for (const [id, name] of clinicMap) {
    await prisma.clinic.upsert({
      where: { id },
      create: { id, name },
      update: { name },
    });
  }

  return clinicMap.size;
}

async function importPlans(plans: HealthPlan[]) {
  const existing = await prisma.plan.findMany({
    select: { uniqueCode: true },
  });
  const existingCodes = new Set(existing.map((plan) => plan.uniqueCode));

  let created = 0;
  let skipped = 0;

  for (const rawPlan of plans) {
    const plan: HealthPlan = {
      ...rawPlan,
      coverage: dedupeCoverageEntries(rawPlan.coverage),
    };

    if (existingCodes.has(plan.unique_code)) {
      skipped += 1;
      continue;
    }

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

    existingCodes.add(plan.unique_code);
    created += 1;
  }

  return { created, skipped };
}

async function main() {
  const raw = await readFile(PARSED_PATH, "utf-8");
  const plans = JSON.parse(raw) as HealthPlan[];

  const clinicCount = await ensureClinics(plans);
  const { created, skipped } = await importPlans(plans);
  const total = await prisma.plan.count();

  console.log("Importación BASE DE DATOS CENTRO completada:");
  console.log(`  - ${plans.length} planes en archivo`);
  console.log(`  - ${created} planes creados`);
  console.log(`  - ${skipped} planes omitidos (ya existían)`);
  console.log(`  - ${clinicCount} clínicas aseguradas`);
  console.log(`  - ${total} planes totales en BD`);
}

main()
  .catch((error) => {
    console.error("Error en importación:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
