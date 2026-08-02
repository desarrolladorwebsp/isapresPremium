/**
 * Temporal: marca todos los planes existentes como Preferente (`preferred`).
 * Los tres tipos de plan siguen existiendo en el sistema; este script solo
 * homogeniza el dato actual por Isapre.
 *
 * Uso: npx tsx scripts/set-all-plans-preferred.ts
 */
import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.plan.groupBy({
    by: ["isapreId", "planType"],
    _count: { _all: true },
    orderBy: [{ isapreId: "asc" }, { planType: "asc" }],
  });

  console.log("Estado actual (por Isapre / tipo):");
  for (const row of before) {
    console.log(
      `  ${row.isapreId.padEnd(16)} ${row.planType.padEnd(12)} ${row._count._all}`,
    );
  }

  const result = await prisma.plan.updateMany({
    data: {
      planType: "preferred",
      hasTop: true,
    },
  });

  const after = await prisma.plan.groupBy({
    by: ["isapreId", "planType"],
    _count: { _all: true },
    orderBy: [{ isapreId: "asc" }, { planType: "asc" }],
  });

  console.log(`\nActualizados: ${result.count} planes → preferred (has_top=true)`);
  console.log("Estado final (por Isapre / tipo):");
  for (const row of after) {
    console.log(
      `  ${row.isapreId.padEnd(16)} ${row.planType.padEnd(12)} ${row._count._all}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
