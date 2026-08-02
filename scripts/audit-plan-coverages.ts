import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

type ParsedPlan = {
  unique_code: string;
  isapre: string;
  coverage: Array<{ type: string; clinic_name: string; percentage: number }>;
};

type AuditRow = {
  isapre: string;
  uniqueCode: string;
  issue: string;
  hospitalCount: number;
  ambulatoryCount: number;
  dbHospitalCount: number;
  dbAmbulatoryCount: number;
  source: string;
  action: string;
};

function countByType(coverage: ParsedPlan["coverage"]) {
  return {
    hospital: coverage.filter((entry) => entry.type === "hospitalaria").length,
    ambulatory: coverage.filter((entry) => entry.type === "ambulatoria").length,
  };
}

async function loadParsedPlans(relativePath: string): Promise<ParsedPlan[]> {
  const filePath = path.join(process.cwd(), relativePath);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as ParsedPlan[];
  } catch {
    return [];
  }
}

async function main() {
  const parsedSources = [
    { label: "Consalud", file: "scripts/.consalud-plans-parsed.json" },
    { label: "Colmena", file: "scripts/.colmena-plans-parsed.json" },
  ];

  const parsedIssues: AuditRow[] = [];
  for (const source of parsedSources) {
    const plans = await loadParsedPlans(source.file);
    for (const plan of plans) {
      const counts = countByType(plan.coverage);
      if (counts.hospital > 0 && counts.ambulatory === 0) {
        parsedIssues.push({
          isapre: plan.isapre,
          uniqueCode: plan.unique_code,
          issue: "Sin cobertura ambulatoria en JSON parseado",
          hospitalCount: counts.hospital,
          ambulatoryCount: counts.ambulatory,
          dbHospitalCount: 0,
          dbAmbulatoryCount: 0,
          source: source.file,
          action: "Revisar parser / Excel / PDF",
        });
      }
    }
  }

  const dbPlans = await prisma.plan.findMany({
    include: {
      isapreRef: true,
      coverages: { select: { type: true } },
    },
  });

  const dbIssues: AuditRow[] = [];
  for (const plan of dbPlans) {
    const dbHospital = plan.coverages.filter((entry) => entry.type === "hospitalaria").length;
    const dbAmbulatory = plan.coverages.filter((entry) => entry.type === "ambulatoria").length;
    if (dbHospital > 0 && dbAmbulatory === 0) {
      dbIssues.push({
        isapre: plan.isapreRef.name,
        uniqueCode: plan.uniqueCode,
        issue: "Sin cobertura ambulatoria en BD",
        hospitalCount: 0,
        ambulatoryCount: 0,
        dbHospitalCount: dbHospital,
        dbAmbulatoryCount: dbAmbulatory,
        source: "database",
        action: "Re-sincronizar coberturas",
      });
    }
  }

  const reportDir = path.join(process.cwd(), "storage", "reportes");
  await mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const jsonPath = path.join(reportDir, `auditoria-coberturas-${timestamp}.json`);
  const xlsxPath = path.join(reportDir, `auditoria-coberturas-${timestamp}.xlsx`);

  const summary = {
    generatedAt: new Date().toISOString(),
    parsedIssuesCount: parsedIssues.length,
    dbIssuesCount: dbIssues.length,
    parsedByIsapre: Object.fromEntries(
      Object.entries(
        parsedIssues.reduce<Record<string, number>>((acc, row) => {
          acc[row.isapre] = (acc[row.isapre] ?? 0) + 1;
          return acc;
        }, {}),
      ),
    ),
    dbByIsapre: Object.fromEntries(
      Object.entries(
        dbIssues.reduce<Record<string, number>>((acc, row) => {
          acc[row.isapre] = (acc[row.isapre] ?? 0) + 1;
          return acc;
        }, {}),
      ),
    ),
    parsedIssues,
    dbIssues,
  };

  await writeFile(jsonPath, JSON.stringify(summary, null, 2), "utf-8");

  const sheetRows = [
    [
      "Isapre",
      "Código plan",
      "Problema",
      "Hospital (JSON)",
      "Ambulatoria (JSON)",
      "Hospital (BD)",
      "Ambulatoria (BD)",
      "Fuente",
      "Acción sugerida",
    ],
    ...parsedIssues.map((row) => [
      row.isapre,
      row.uniqueCode,
      row.issue,
      row.hospitalCount,
      row.ambulatoryCount,
      row.dbHospitalCount,
      row.dbAmbulatoryCount,
      row.source,
      row.action,
    ]),
    ...dbIssues.map((row) => [
      row.isapre,
      row.uniqueCode,
      row.issue,
      row.hospitalCount,
      row.ambulatoryCount,
      row.dbHospitalCount,
      row.dbAmbulatoryCount,
      row.source,
      row.action,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Coberturas");
  XLSX.writeFile(workbook, xlsxPath);

  console.log("Auditoría de coberturas:");
  console.log(`  - Problemas en JSON parseado: ${parsedIssues.length}`);
  console.log(`  - Problemas en BD: ${dbIssues.length}`);
  console.log(`  - JSON: ${jsonPath}`);
  console.log(`  - Excel: ${xlsxPath}`);
}

main()
  .catch((error) => {
    console.error("Error en auditoría:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
