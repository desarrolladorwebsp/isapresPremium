import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildPlanPdfStorageKey } from "../lib/plan-pdf-storage/paths";
import { savePlanPdf } from "../lib/plan-pdf-storage/upload";
import {
  assertBlobConfigured,
  resolvePlanPdfStorageBackend,
} from "../lib/plan-pdf-storage/provider";
import { isVercelBlobUrl } from "../lib/plan-pdf-storage/blob";
import {
  assertCpanelConfigured,
  isCpanelPdfUrl,
} from "../lib/plan-pdf-storage/cpanel";
import { resolveIsapreIdFromName, resolveIsapreNameFromId } from "../lib/isapre-catalog";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

interface PdfCandidate {
  absolutePath: string;
  uniqueCode: string;
  /** Carpeta de primer nivel bajo el root (isapre). */
  isapreFolder: string | null;
  /** Carpeta(s) intermedias entre la isapre y el archivo (zona/región). */
  zona: string | null;
}

async function collectPdfFiles(
  rootDir: string,
  isDirectIsapreRoot: boolean,
): Promise<PdfCandidate[]> {
  const results: PdfCandidate[] = [];

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.name.toLowerCase().endsWith(".pdf")) continue;

      const relative = path.relative(rootDir, absolutePath);
      const segments = relative.split(path.sep);
      const uniqueCode = entry.name
        .replace(/\.pdf$/i, "")
        .replace(/\s*\(\d+\)$/, "")
        .trim();

      let isapreFolder: string | null;
      let zona: string | null;

      if (isDirectIsapreRoot) {
        isapreFolder = path.basename(rootDir);
        const zonaSegments = segments.slice(0, -1);
        zona = zonaSegments.length > 0 ? zonaSegments.join(" ") : null;
      } else {
        isapreFolder = segments.length >= 2 ? segments[0] : null;
        const zonaSegments = segments.slice(1, -1);
        zona = zonaSegments.length > 0 ? zonaSegments.join(" ") : null;
      }

      results.push({
        absolutePath,
        uniqueCode,
        isapreFolder,
        zona,
      });
    }
  }

  await walk(rootDir);
  return results;
}

function planPdfAlreadySynced(
  plan: { pdfUrl: string | null; pdfPublicId: string | null },
  storageKey: string,
): boolean {
  if (plan.pdfPublicId !== storageKey) return false;
  if (!plan.pdfUrl) return false;

  const backend = resolvePlanPdfStorageBackend();

  if (backend === "blob") {
    return isVercelBlobUrl(plan.pdfUrl);
  }

  if (backend === "cpanel") {
    return isCpanelPdfUrl(plan.pdfUrl);
  }

  return plan.pdfUrl.includes("/api/plans/");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sourceArg = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"));
  const sourceDir = path.resolve(
    sourceArg ?? path.join(process.cwd(), "storage", "planes-pdf"),
  );
  const backend = resolvePlanPdfStorageBackend();

  if (backend === "blob") {
    assertBlobConfigured();
  }

  if (backend === "cpanel") {
    assertCpanelConfigured();
  }

  const sourceStats = await stat(sourceDir).catch(() => null);
  if (!sourceStats?.isDirectory()) {
    console.error(`Carpeta no encontrada: ${sourceDir}`);
    process.exit(1);
  }

  const planesPdfRoot = path.join(process.cwd(), "storage", "planes-pdf");
  const isDirectIsapreRoot =
    path.resolve(path.dirname(sourceDir)) === path.resolve(planesPdfRoot);

  console.log(`Backend: ${backend}`);
  console.log(`Origen: ${sourceDir}`);
  if (dryRun) console.log("Modo dry-run (sin subir ni escribir BD)");

  const files = await collectPdfFiles(sourceDir, isDirectIsapreRoot);
  const isapreIdFilter = isDirectIsapreRoot
    ? resolveIsapreIdFromName(path.basename(sourceDir))
    : null;

  console.log(`PDFs encontrados: ${files.length}`);
  if (isapreIdFilter) {
    console.log(`Filtro isapre: ${resolveIsapreNameFromId(isapreIdFilter)} (${isapreIdFilter})`);
  }

  let uploaded = 0;
  let skipped = 0;
  let missingPlan = 0;
  let errors = 0;

  for (const file of files) {
    const plan = await prisma.plan.findFirst({
      where: {
        uniqueCode: {
          equals: file.uniqueCode,
          mode: "insensitive",
        },
        ...(isapreIdFilter ? { isapreId: isapreIdFilter } : {}),
      },
    });

    if (!plan) {
      missingPlan += 1;
      console.warn(`  [omitido] Plan no existe en BD: ${file.uniqueCode}`);
      continue;
    }

    const isapreName = resolveIsapreNameFromId(plan.isapreId);
    const storageKey = buildPlanPdfStorageKey(
      isapreName,
      plan.uniqueCode,
      file.zona,
    );

    if (planPdfAlreadySynced(plan, storageKey)) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] ${plan.uniqueCode} → ${storageKey}`);
      uploaded += 1;
      continue;
    }

    try {
      const fileBuffer = await readFile(file.absolutePath);
      const result = await savePlanPdf({
        fileBuffer,
        isapre: isapreName,
        uniqueCode: plan.uniqueCode,
        mimeType: "application/pdf",
        zona: file.zona,
        previousStoragePath: plan.pdfPublicId,
      });

      await prisma.plan.update({
        where: { uniqueCode: plan.uniqueCode },
        data: {
          pdfUrl: result.url,
          pdfPublicId: result.storagePath,
        },
      });

      uploaded += 1;
      console.log(`  [ok] ${plan.uniqueCode} (${result.backend}) → ${result.storagePath}`);
    } catch (error) {
      errors += 1;
      console.error(`  [error] ${file.uniqueCode}:`, error);
    }
  }

  console.log("\nResumen:");
  console.log(`  - Subidos/actualizados: ${uploaded}`);
  console.log(`  - Ya sincronizados: ${skipped}`);
  console.log(`  - Sin plan en BD: ${missingPlan}`);
  console.log(`  - Errores: ${errors}`);

  if (errors > 0 && uploaded === 0) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Error en carga masiva:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
