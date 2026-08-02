import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

interface MissingPlanRow {
  isapre_id: string;
  isapre: string;
  unique_code: string;
  plan_name: string;
  base_price_uf: number;
  coverage_count: number;
  zones: string;
  has_top: boolean;
}

async function main() {
  const plans = await prisma.plan.findMany({
    where: { pdfUrl: null },
    select: {
      uniqueCode: true,
      planName: true,
      basePriceUf: true,
      hasTop: true,
      zones: true,
      isapreId: true,
      isapreRef: { select: { name: true } },
      _count: { select: { coverages: true } },
    },
    orderBy: [{ isapreId: "asc" }, { uniqueCode: "asc" }],
  });

  const rows: MissingPlanRow[] = plans.map((plan) => ({
    isapre_id: plan.isapreId,
    isapre: plan.isapreRef.name,
    unique_code: plan.uniqueCode,
    plan_name: plan.planName,
    base_price_uf: plan.basePriceUf,
    coverage_count: plan._count.coverages,
    zones: plan.zones.join(", "),
    has_top: plan.hasTop,
  }));

  const reportDir = path.join(process.cwd(), "storage", "reportes");
  await mkdir(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, ".missing-plan-pdfs.json");
  const xlsxPath = path.join(reportDir, "planes-sin-pdf-por-isapre.xlsx");

  await writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf-8");

  execSync(
    `python3 scripts/build-missing-pdfs-xlsx.py "${jsonPath}" "${xlsxPath}"`,
    { cwd: process.cwd(), stdio: "inherit" },
  );

  const byIsapre = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.isapre] = (acc[row.isapre] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nReporte generado:", xlsxPath);
  console.log("Total planes sin PDF:", rows.length);
  console.log("Por isapre:");
  for (const [isapre, count] of Object.entries(byIsapre).sort((a, b) =>
    a[0].localeCompare(b[0], "es"),
  )) {
    console.log(`  - ${isapre}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error("Error al exportar planes sin PDF:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
