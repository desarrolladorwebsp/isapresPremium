import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { buildPlanPdfReport } from "../lib/api/plan-pdf-report";
import { getPrismaClient } from "../lib/prisma";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const report = await buildPlanPdfReport();

  const summaryAllIsapres = report.summary.map((row) => ({
    isapre_id: row.isapreId,
    isapre: row.isapre,
    total_planes: row.totalPlanes,
    con_pdf: row.conPdf,
    sin_pdf: row.sinPdf,
    pct_pdf: row.pctPdf,
    con_cobertura: row.conCobertura,
    sin_cobertura: row.sinCobertura,
    codigos_sin_pdf: row.codigosSinPdf.join(", "),
  }));

  const missingPlans = report.missingPlans.map((row) => ({
    isapre_id: row.isapreId,
    isapre: row.isapre,
    unique_code: row.uniqueCode,
    plan_name: row.planName,
    base_price_uf: row.basePriceUf,
    coverage_count: row.coverageCount,
    zones: row.zones,
    has_top: row.hasTop,
  }));

  const reportDir = path.join(process.cwd(), "storage", "reportes");
  await mkdir(reportDir, { recursive: true });

  const statusJson = path.join(reportDir, ".all-isapres-status.json");
  const missingJson = path.join(reportDir, ".missing-plan-pdfs.json");
  const statusXlsx = path.join(reportDir, "planes-estado-por-isapre.xlsx");
  const missingXlsx = path.join(reportDir, "planes-sin-pdf-por-isapre.xlsx");
  const reportXlsx = path.join(reportDir, "reporte-planes-completo.xlsx");

  await writeFile(statusJson, JSON.stringify(summaryAllIsapres, null, 2), "utf-8");
  await writeFile(missingJson, JSON.stringify(missingPlans, null, 2), "utf-8");

  execSync(
    `python3 scripts/build-all-isapres-status-xlsx.py "${statusJson}" "${statusXlsx}"`,
    { cwd: process.cwd(), stdio: "inherit" },
  );
  execSync(
    `python3 scripts/build-missing-pdfs-xlsx.py "${missingJson}" "${missingXlsx}" "${statusJson}"`,
    { cwd: process.cwd(), stdio: "inherit" },
  );
  execSync(
    `python3 scripts/build-plan-report-xlsx.py "${statusJson}" "${missingJson}" "${reportXlsx}"`,
    { cwd: process.cwd(), stdio: "inherit" },
  );

  console.log("\nReportes generados:");
  console.log("  1.", reportXlsx);
  console.log("  2.", statusXlsx);
  console.log("  3.", missingXlsx);
  console.log("\nTotales:", report.totals);
  console.log("\nPor isapre:");
  for (const row of report.summary) {
    console.log(
      `  - ${row.isapre}: ${row.totalPlanes} planes | ${row.conPdf} PDF | ${row.sinPdf} faltantes`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Error al exportar reportes:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrismaClient().$disconnect().catch(() => undefined);
  });
