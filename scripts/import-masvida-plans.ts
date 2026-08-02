import { readFile } from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { resolveIsapreIdFromName } from "../lib/isapre-catalog";
import { dedupeCoverageEntries } from "../lib/api/plan-validation";
import type { HealthPlan } from "../types/plan";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();
const BATCH_SIZE = 15;

const PARSED_PATH = path.join(
  process.cwd(),
  "scripts/.masvida-plans-parsed.json",
);

async function ensureClinics(plans: HealthPlan[]) {
  const clinicMap = new Map<string, string>();

  for (const plan of plans) {
    for (const entry of plan.coverage) {
      clinicMap.set(entry.clinic_id, entry.clinic_name);
    }
  }

  const entries = [...clinicMap.entries()];
  for (let index = 0; index < entries.length; index += 25) {
    const chunk = entries.slice(index, index + 25);
    await Promise.all(
      chunk.map(([id, name]) =>
        prisma.clinic.upsert({
          where: { id },
          create: { id, name },
          update: { name },
        }),
      ),
    );
  }

  return clinicMap.size;
}

async function importPlans(plans: HealthPlan[]) {
  const existing = await prisma.plan.findMany({
    select: { uniqueCode: true },
  });
  const existingCodes = new Set(existing.map((plan) => plan.uniqueCode));

  const pending = plans
    .map((rawPlan) => ({
      ...rawPlan,
      coverage: dedupeCoverageEntries(rawPlan.coverage),
    }))
    .filter((plan) => !existingCodes.has(plan.unique_code));

  const isapreId = resolveIsapreIdFromName("Nueva Masvida");
  await prisma.isapre.upsert({
    where: { id: isapreId },
    create: { id: isapreId, name: "Nueva Masvida" },
    update: { name: "Nueva Masvida" },
  });

  let created = 0;

  for (let index = 0; index < pending.length; index += BATCH_SIZE) {
    const batch = pending.slice(index, index + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((plan) =>
        prisma.plan.create({
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
        }),
      ),
    );

    created += batch.length;
    console.log(`  ... ${created}/${pending.length} planes nuevos`);
  }

  return {
    created,
    skipped: plans.length - pending.length,
  };
}

async function main() {
  const raw = await readFile(PARSED_PATH, "utf-8");
  const plans = JSON.parse(raw) as HealthPlan[];

  console.log(`Importando ${plans.length} planes Nueva Masvida...`);

  const clinicCount = await ensureClinics(plans);
  const { created, skipped } = await importPlans(plans);

  const masvidaCount = await prisma.plan.count({
    where: { isapreId: "nueva-masvida" },
  });

  console.log("Importación Masvida completada:");
  console.log(`  - ${created} planes creados`);
  console.log(`  - ${skipped} planes ya existían`);
  console.log(`  - ${clinicCount} clínicas aseguradas`);
  console.log(`  - ${masvidaCount} planes Masvida en BD`);
}

main()
  .catch((error) => {
    console.error("Error en importación Masvida:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
