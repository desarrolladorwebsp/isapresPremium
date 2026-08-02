/**
 * Cruza clínicas en BD con `clinic-locations.json` (misma fuente que el Excel
 * `clinicas-ubicaciones.xlsx`) y persiste ubicaciones verificadas.
 *
 * Uso:
 *   npx tsx scripts/backfill-clinic-locations.ts          # simulación
 *   npx tsx scripts/backfill-clinic-locations.ts --apply  # escribe en BD
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import {
  CLINIC_LOCATION_JSON_ALIASES,
  isVirtualClinicId,
  resolveClinicLocationJsonKey,
} from "../lib/clinic-location-aliases";

config({ path: path.join(process.cwd(), ".env.local") });

const CHILE_BBOX = {
  minLat: -56.6,
  maxLat: -17.3,
  minLng: -76.0,
  maxLng: -66.0,
};

interface LocationRecord {
  address: string;
  lat: number;
  lng: number;
  source?: string;
}

interface BackfillRow {
  clinicId: string;
  clinicName: string;
  action: "applied" | "would_apply" | "skipped_has_db" | "skipped_virtual" | "skipped_no_source" | "skipped_invalid" | "skipped_excel_mismatch";
  jsonKey?: string;
  address?: string;
  reason?: string;
}

function isWithinChile(lat: number, lng: number): boolean {
  return (
    lat >= CHILE_BBOX.minLat &&
    lat <= CHILE_BBOX.maxLat &&
    lng >= CHILE_BBOX.minLng &&
    lng <= CHILE_BBOX.maxLng
  );
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function loadJsonLocations(): Record<string, LocationRecord> {
  const filePath = path.join(process.cwd(), "src/assets/clinic-locations.json");
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    locations: Record<string, LocationRecord>;
  };
  return parsed.locations ?? {};
}

function loadExcelAddresses(): Map<string, string> {
  const xlsxPath = path.join(
    process.cwd(),
    "storage/reportes/clinicas-ubicaciones.xlsx",
  );
  if (!fs.existsSync(xlsxPath)) return new Map();

  const workbook = XLSX.readFile(xlsxPath);
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
    workbook.Sheets["Clínicas"],
  );

  const map = new Map<string, string>();
  for (const row of rows) {
    const id = row.ID?.trim();
    const address = row.Dirección?.trim();
    if (id && address) map.set(id, address);
  }
  return map;
}

function resolveSourceLocation(
  clinicId: string,
  locations: Record<string, LocationRecord>,
): { jsonKey: string; location: LocationRecord } | null {
  const jsonKey = resolveClinicLocationJsonKey(clinicId);
  const direct = locations[jsonKey];
  if (direct) return { jsonKey, location: direct };

  const aliasKey = CLINIC_LOCATION_JSON_ALIASES[clinicId];
  if (aliasKey && locations[aliasKey]) {
    return { jsonKey: aliasKey, location: locations[aliasKey] };
  }

  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  const locations = loadJsonLocations();
  const excelAddresses = loadExcelAddresses();

  const clinics = await prisma.clinic.findMany({ orderBy: { name: "asc" } });
  const report: BackfillRow[] = [];
  let applied = 0;

  for (const clinic of clinics) {
    const hasDb =
      clinic.address != null && clinic.lat != null && clinic.lng != null;

    if (hasDb) {
      report.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        action: "skipped_has_db",
        address: clinic.address ?? undefined,
      });
      continue;
    }

    if (isVirtualClinicId(clinic.id, clinic.name)) {
      report.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        action: "skipped_virtual",
        reason: "Prestador virtual (Libre Elección)",
      });
      continue;
    }

    const resolved = resolveSourceLocation(clinic.id, locations);
    if (!resolved) {
      report.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        action: "skipped_no_source",
        reason: "Sin ubicación en asset ni alias verificado",
      });
      continue;
    }

    const { jsonKey, location } = resolved;
    const address = location.address?.trim() ?? "";
    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (
      address.length < 5 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !isWithinChile(lat, lng)
    ) {
      report.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        action: "skipped_invalid",
        jsonKey,
        address,
        reason: "Dirección o coordenadas inválidas",
      });
      continue;
    }

    const excelAddress = excelAddresses.get(clinic.id);
    if (excelAddress) {
      const excelNorm = normalizeAddress(excelAddress);
      const jsonNorm = normalizeAddress(address);
      if (excelNorm !== jsonNorm && !excelNorm.includes(jsonNorm.slice(0, 20))) {
        report.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          action: "skipped_excel_mismatch",
          jsonKey,
          address,
          reason: `Excel: ${excelAddress}`,
        });
        continue;
      }
    }

    if (apply) {
      await prisma.clinic.update({
        where: { id: clinic.id },
        data: {
          address,
          lat,
          lng,
          locationSource: location.source ?? "asset",
          locationUpdatedAt: new Date(),
        },
      });
      applied += 1;
    }

    report.push({
      clinicId: clinic.id,
      clinicName: clinic.name,
      action: apply ? "applied" : "would_apply",
      jsonKey,
      address,
    });
  }

  const reportDir = path.join(process.cwd(), "storage", "reportes");
  fs.mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const reportPath = path.join(
    reportDir,
    `backfill-clinicas-ubicaciones-${timestamp}.json`,
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    totalClinics: clinics.length,
    applied: apply
      ? applied
      : report.filter((r) => r.action === "would_apply").length,
    skippedHasDb: report.filter((r) => r.action === "skipped_has_db").length,
    skippedVirtual: report.filter((r) => r.action === "skipped_virtual").length,
    skippedNoSource: report.filter((r) => r.action === "skipped_no_source").length,
    skippedInvalid: report.filter((r) => r.action === "skipped_invalid").length,
    skippedExcelMismatch: report.filter(
      (r) => r.action === "skipped_excel_mismatch",
    ).length,
    rows: report,
  };

  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(apply ? "Backfill aplicado:" : "Simulación de backfill:");
  console.log(`  - Clínicas en BD: ${clinics.length}`);
  console.log(`  - A ${apply ? "aplicar" : "aplicarían"}: ${summary.applied}`);
  console.log(`  - Ya con BD: ${summary.skippedHasDb}`);
  console.log(`  - Virtuales (Libre Elección): ${summary.skippedVirtual}`);
  console.log(`  - Sin fuente verificada: ${summary.skippedNoSource}`);
  console.log(`  - Inválidas: ${summary.skippedInvalid}`);
  console.log(`  - Conflicto con Excel: ${summary.skippedExcelMismatch}`);
  console.log(`  - Reporte: ${reportPath}`);

  if (!apply && summary.applied > 0) {
    console.log("\nEjecuta con --apply para persistir en la base de datos.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error en backfill de ubicaciones:", error);
  process.exit(1);
});
