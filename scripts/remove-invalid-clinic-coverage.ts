import { readFile, writeFile } from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { mapDbPlanToHealthPlan } from "../lib/api/plan-mapper";
import { updatePlanRecord } from "../lib/api/data-store";
import { invalidatePlanCatalogCache } from "../lib/api/plan-catalog-cache";
import { prisma } from "../lib/prisma";
import type { HealthPlan } from "../types/plan";

config({ path: path.join(process.cwd(), ".env.local") });

const INVALID_CLINIC_ID = "cl-desconocida";
const INVALID_CLINIC_NAME = ")";
const TARGET_PLAN_CODES = ["VPCFB260466", "VPNFB260466", "VPNFB260468"] as const;
const PARSED_PATH = path.join(
  process.cwd(),
  "scripts/.vidatres-plans-parsed.json",
);

const planInclude = { coverages: true, isapreRef: true } as const;

function isInvalidCoverageEntry(entry: {
  clinic_id: string;
  clinic_name: string;
}): boolean {
  return (
    entry.clinic_id === INVALID_CLINIC_ID ||
    entry.clinic_name.trim() === INVALID_CLINIC_NAME
  );
}

function stripInvalidCoverage(plan: HealthPlan): HealthPlan {
  return {
    ...plan,
    coverage: plan.coverage.filter((entry) => !isInvalidCoverageEntry(entry)),
  };
}

async function patchParsedJson() {
  const raw = await readFile(PARSED_PATH, "utf-8");
  const plans = JSON.parse(raw) as HealthPlan[];
  let removed = 0;

  const nextPlans = plans.map((plan) => {
    if (!TARGET_PLAN_CODES.includes(plan.unique_code as (typeof TARGET_PLAN_CODES)[number])) {
      return plan;
    }

    const before = plan.coverage.length;
    const cleaned = stripInvalidCoverage(plan);
    removed += before - cleaned.coverage.length;
    return cleaned;
  });

  await writeFile(PARSED_PATH, `${JSON.stringify(nextPlans, null, 2)}\n`, "utf-8");
  return removed;
}

async function patchDatabasePlans() {
  const results: string[] = [];

  for (const planCode of TARGET_PLAN_CODES) {
    const dbPlan = await prisma.plan.findUnique({
      where: { uniqueCode: planCode },
      include: planInclude,
    });

    if (!dbPlan) {
      results.push(`${planCode}: no encontrado en BD`);
      continue;
    }

    const healthPlan = mapDbPlanToHealthPlan(dbPlan);
    const before = healthPlan.coverage.length;
    const cleaned = stripInvalidCoverage(healthPlan);
    const removed = before - cleaned.coverage.length;

    if (removed === 0) {
      results.push(`${planCode}: sin coberturas inválidas`);
      continue;
    }

    await updatePlanRecord(cleaned);
    results.push(`${planCode}: ${removed} cobertura(s) eliminada(s)`);
  }

  return results;
}

async function deleteOrphanClinic() {
  const remaining = await prisma.coverageEntry.count({
    where: { clinicId: INVALID_CLINIC_ID },
  });

  if (remaining > 0) {
    return `Clínica ${INVALID_CLINIC_ID} conservada (${remaining} referencias restantes).`;
  }

  const deleted = await prisma.clinic.deleteMany({
    where: { id: INVALID_CLINIC_ID },
  });

  return deleted.count > 0
    ? `Clínica ${INVALID_CLINIC_ID} eliminada del catálogo.`
    : `Clínica ${INVALID_CLINIC_ID} no existía en catálogo.`;
}

async function main() {
  console.log("Eliminando clínica inválida ')' (cl-desconocida)…");
  console.log(`Planes objetivo: ${TARGET_PLAN_CODES.join(", ")}`);

  const jsonRemoved = await patchParsedJson();
  console.log(`JSON Vida Tres: ${jsonRemoved} cobertura(s) eliminada(s).`);

  const dbResults = await patchDatabasePlans();
  for (const line of dbResults) {
    console.log(`BD: ${line}`);
  }

  const clinicResult = await deleteOrphanClinic();
  console.log(clinicResult);

  invalidatePlanCatalogCache();
  console.log("Caché de planes invalidada.");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
