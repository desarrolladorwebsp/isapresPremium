import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { getZoneLabel, getClinicZoneIds } from "../lib/clinic-admin";
import { ZONE_FILTER_DEFINITIONS } from "../lib/zone-filter-definitions";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

interface ClinicZoneRow {
  clinic_id: string;
  clinic_name: string;
  zone_ids: string[];
  zone_labels: string;
  estado: "Asignada" | "Sin zona";
  planes_vinculados: number;
  coberturas: number;
  isapres: string;
  en_tabla_clinics: boolean;
  notas: string;
}

interface ClinicZonesReportPayload {
  generated_at: string;
  summary: {
    total_clinicas: number;
    con_zona: number;
    sin_zona: number;
    total_coberturas: number;
    zonas_definidas: number;
  };
  zone_definitions: Array<{
    id: string;
    label: string;
    group: string;
    description: string;
    areas: string;
    parent_zone_id: string | null;
    example_providers: string;
  }>;
  clinics: ClinicZoneRow[];
  missing: ClinicZoneRow[];
}

async function main() {
  const [clinics, coverageGroups, planIsapres] = await Promise.all([
    prisma.clinic.findMany({
      select: { id: true, name: true, zones: true },
      orderBy: { name: "asc" },
    }),
    prisma.coverageEntry.groupBy({
      by: ["clinicId", "clinicName"],
      _count: { _all: true },
    }),
    prisma.coverageEntry.findMany({
      select: {
        clinicId: true,
        plan: { select: { isapreRef: { select: { name: true } } } },
      },
    }),
  ]);

  const clinicById = new Map(clinics.map((clinic) => [clinic.id, clinic]));
  const isapresByClinic = new Map<string, Set<string>>();

  for (const entry of planIsapres) {
    const set = isapresByClinic.get(entry.clinicId) ?? new Set<string>();
    set.add(entry.plan.isapreRef.name);
    isapresByClinic.set(entry.clinicId, set);
  }

  const planCountByClinic = new Map<string, number>();
  const distinctPlans = await prisma.coverageEntry.findMany({
    select: { clinicId: true, planCode: true },
    distinct: ["clinicId", "planCode"],
  });
  for (const row of distinctPlans) {
    planCountByClinic.set(
      row.clinicId,
      (planCountByClinic.get(row.clinicId) ?? 0) + 1,
    );
  }

  const allClinicIds = new Set<string>([
    ...clinics.map((clinic) => clinic.id),
    ...coverageGroups.map((group) => group.clinicId),
  ]);

  const rows: ClinicZoneRow[] = [...allClinicIds]
    .map((clinicId) => {
      const clinicRecord = clinicById.get(clinicId);
      const coverage = coverageGroups.find((group) => group.clinicId === clinicId);
      const clinicName =
        clinicRecord?.name ?? coverage?.clinicName ?? clinicId;

      const zoneIds = getClinicZoneIds({
        id: clinicId,
        name: clinicName,
        zones: clinicRecord?.zones ?? [],
      });

      const isLibreEleccion = clinicId.includes("libre-eleccion");
      const notas = isLibreEleccion
        ? "Cobertura libre elección — asignada a todas las zonas del filtro"
        : zoneIds.length === 0
          ? "Revisar y agregar en src/lib/clinic-zones.ts"
          : "";

      return {
        clinic_id: clinicId,
        clinic_name: clinicName,
        zone_ids: zoneIds,
        zone_labels: zoneIds.map((zoneId) => getZoneLabel(zoneId)).join(", "),
        estado: zoneIds.length > 0 ? "Asignada" : "Sin zona",
        planes_vinculados: planCountByClinic.get(clinicId) ?? 0,
        coberturas: coverage?._count._all ?? 0,
        isapres: [...(isapresByClinic.get(clinicId) ?? [])].sort().join(", "),
        en_tabla_clinics: Boolean(clinicRecord),
        notas,
      } satisfies ClinicZoneRow;
    })
    .sort((a, b) => a.clinic_name.localeCompare(b.clinic_name, "es"));

  const missing = rows.filter((row) => row.estado === "Sin zona");

  const payload: ClinicZonesReportPayload = {
    generated_at: new Date().toISOString(),
    summary: {
      total_clinicas: rows.length,
      con_zona: rows.length - missing.length,
      sin_zona: missing.length,
      total_coberturas: coverageGroups.reduce(
        (total, group) => total + group._count._all,
        0,
      ),
      zonas_definidas: ZONE_FILTER_DEFINITIONS.length,
    },
    zone_definitions: ZONE_FILTER_DEFINITIONS.map((zone) => ({
      id: zone.id,
      label: zone.label,
      group: zone.group,
      description: zone.description,
      areas: zone.areas,
      parent_zone_id: zone.parent_zone_id ?? null,
      example_providers: zone.example_providers.join(", "),
    })),
    clinics: rows,
    missing,
  };

  const reportDir = path.join(process.cwd(), "storage", "reportes");
  await mkdir(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, ".clinic-zones-report.json");
  const xlsxPath = path.join(reportDir, "reporte-clinicas-zonas.xlsx");

  await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf-8");

  execSync(
    `python3 scripts/build-clinic-zones-xlsx.py "${jsonPath}" "${xlsxPath}"`,
    { cwd: process.cwd(), stdio: "inherit" },
  );

  console.log("\nReporte de clínicas y zonas:");
  console.log("  Excel:", xlsxPath);
  console.log("  JSON: ", jsonPath);
  console.log("\nResumen:");
  console.log(`  Clínicas totales: ${payload.summary.total_clinicas}`);
  console.log(`  Con zona:         ${payload.summary.con_zona}`);
  console.log(`  Sin zona:         ${payload.summary.sin_zona}`);

  if (missing.length > 0) {
    console.log("\nClínicas sin zona:");
    for (const row of missing) {
      console.log(`  - ${row.clinic_id} (${row.clinic_name})`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Error al exportar reporte de zonas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
