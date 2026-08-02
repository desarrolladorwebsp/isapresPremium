import { mapDbPlanToHealthPlan } from "../lib/api/plan-mapper";
import { updatePlanRecord } from "../lib/api/data-store";
import { prisma } from "../lib/prisma";

const planInclude = { coverages: true, isapreRef: true } as const;

async function main() {
  const plans = await prisma.plan.findMany({ include: planInclude });
  let fixed = 0;

  for (const plan of plans) {
    const healthPlan = mapDbPlanToHealthPlan(plan);
    const rawCount = plan.coverages.length;
    const dedupedCount = healthPlan.coverage.length;

    if (dedupedCount >= rawCount) continue;

    await updatePlanRecord(healthPlan);
    console.log(
      `Plan ${plan.uniqueCode}: ${rawCount} → ${dedupedCount} coberturas`,
    );
    fixed += 1;
  }

  console.log(
    fixed > 0
      ? `Listo: ${fixed} plan(es) corregido(s).`
      : "No se encontraron coberturas duplicadas.",
  );
}

main()
  .catch((error) => {
    console.error("Error al deduplicar coberturas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
