import { findHealthPlanByCode, findManyHealthPlans } from "../lib/api/plan-query";
import { readPlanCatalogBounds } from "../lib/api/plan-search";

async function main() {
  const bounds = await readPlanCatalogBounds();
  console.log("Bounds:", bounds);

  const plans = await findManyHealthPlans();
  console.log(`Planes cargados: ${plans.length}`);

  if (plans[0]) {
    console.log(
      `Primer plan: ${plans[0].plan_name} (${plans[0].isapre}) — ${plans[0].unique_code}`,
    );

    const byCode = await findHealthPlanByCode(plans[0].unique_code);
    console.log(
      byCode
        ? `findHealthPlanByCode OK: ${byCode.plan_name}`
        : "findHealthPlanByCode devolvió null",
    );
  }
}

main()
  .catch((error) => {
    console.error("test-plan-query falló:", error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
  });
