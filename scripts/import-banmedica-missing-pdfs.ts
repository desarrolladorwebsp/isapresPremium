import { execSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

config({ path: path.join(process.cwd(), ".env.local") });

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const missingPdfDir = path.join(
  rootDir,
  "storage",
  "planes-pdf",
  "banmedica",
  "PLANES FALTANTES PDF",
);
const prisma = new PrismaClient();

function extractCleanCode(filename: string): string {
  return filename.replace(/\.pdf$/i, "").trim().toUpperCase();
}

async function listPdfCodes(): Promise<string[]> {
  const entries = await readdir(missingPdfDir);
  return entries
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .map(extractCleanCode)
    .sort();
}

async function renameMalformedPlan(fromCode: string, toCode: string) {
  const existingTarget = await prisma.plan.findUnique({
    where: { uniqueCode: toCode },
  });
  if (existingTarget) return false;

  await prisma.plan.update({
    where: { uniqueCode: fromCode },
    data: {
      uniqueCode: toCode,
      planName: `Banmédica ${toCode}`,
    },
  });

  console.log(`  [renombrado] ${fromCode} → ${toCode}`);
  return true;
}

async function dedupeMalformedPlans(codes: string[]) {
  let renamed = 0;
  let deleted = 0;

  for (const code of codes) {
    const clean = await prisma.plan.findFirst({
      where: { isapreId: "banmedica", uniqueCode: { equals: code, mode: "insensitive" } },
    });

    const malformed = await prisma.plan.findMany({
      where: {
        isapreId: "banmedica",
        uniqueCode: { contains: code, mode: "insensitive" },
        NOT: { uniqueCode: { equals: code, mode: "insensitive" } },
      },
      select: { uniqueCode: true },
    });

    if (!clean && malformed.length === 1) {
      if (await renameMalformedPlan(malformed[0].uniqueCode, code)) {
        renamed += 1;
      }
      continue;
    }

    for (const plan of malformed) {
      if (clean) {
        await prisma.coverageEntry.deleteMany({
          where: { planCode: plan.uniqueCode },
        });
        await prisma.plan.delete({ where: { uniqueCode: plan.uniqueCode } });
        console.log(`  [eliminado duplicado] ${plan.uniqueCode}`);
        deleted += 1;
      }
    }
  }

  return { renamed, deleted };
}

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: rootDir, stdio: "inherit" });
}

async function main() {
  const codes = await listPdfCodes();
  console.log(`PDFs en PLANES FALTANTES PDF: ${codes.length}`);

  const { renamed, deleted } = await dedupeMalformedPlans(codes);
  console.log(`Duplicados eliminados: ${deleted} | Renombrados: ${renamed}`);

  try {
    run(`npx tsx scripts/upload-plan-pdfs.ts "${missingPdfDir}"`);
  } catch {
    console.warn("\nBlob falló o sin cuota; reintentando con almacenamiento local...");
    run(`PLAN_PDF_STORAGE=local npx tsx scripts/upload-plan-pdfs.ts "${missingPdfDir}"`);
  }

  const [total, withPdf, withoutPdf] = await Promise.all([
    prisma.plan.count({ where: { isapreId: "banmedica" } }),
    prisma.plan.count({
      where: { isapreId: "banmedica", pdfUrl: { not: null } },
    }),
    prisma.plan.count({
      where: { isapreId: "banmedica", pdfUrl: null },
    }),
  ]);

  console.log("\nBanmédica tras importar PDFs faltantes:");
  console.log(`  - ${total} planes total`);
  console.log(`  - ${withPdf} con PDF`);
  console.log(`  - ${withoutPdf} sin PDF`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
