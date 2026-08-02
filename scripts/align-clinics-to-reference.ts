/**
 * Alinea el catálogo de clínicas con el cotizador de referencia.
 *
 *   npx tsx scripts/align-clinics-to-reference.ts
 *   npx tsx scripts/align-clinics-to-reference.ts --apply
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { resolveCanonicalClinicId } from "../lib/clinic-canonical-ids";
import { resolveClinicZoneIds } from "../lib/clinic-zones";
import { prisma } from "../lib/prisma";
import { invalidatePlanCatalogCache } from "../lib/api/plan-catalog-cache";
import type { HealthPlan } from "../types/plan";

config({ path: path.join(process.cwd(), ".env.local") });

const APPLY = process.argv.includes("--apply");

const PARSED_FILES = [
  ".banmedica-plans-parsed.json",
  ".colmena-plans-parsed.json",
  ".esencial-plans-parsed.json",
  ".vidatres-plans-parsed.json",
  ".consalud-plans-parsed.json",
  ".cruzblanca-plans-parsed.json",
  ".masvida-plans-parsed.json",
];

const CLINIC_SEED: Record<string, { name: string; address: string }> = {
  "cm-santa-maria": {
    name: "Centros Médicos Clínica Santa María",
    address: "Av. Santa María 0500, Providencia, Santiago",
  },
  "cm-red-davila": {
    name: "Centros Médicos Red Dávila",
    address: "Av. Recoleta 464, Recoleta, Santiago",
  },
  "cl-los-carrera-interclinica": {
    name: "Clínica Los Carrera InterClínica",
    address: "Caupolicán 958, Quilpué",
  },
  "clinica-lircay-achs-salud": {
    name: "Clínica Lircay Achs Salud",
    address: "2 Poniente 1372, Talca",
  },
  "clinica-los-andes-achs-salud": {
    name: "Clínica Los Andes Achs Salud",
    address: "Av. Alemania 821, Los Ángeles",
  },
  "cl-los-carrera": {
    name: "Clínica Los Carrera",
    address: "Caupolicán 958, Quilpué",
  },
};

function mapRestoreClinicId(rawId: string, clinicName?: string): string | null {
  const name = (clinicName ?? "").toLowerCase();
  const id = rawId.trim();

  if (
    /lircay/i.test(name) ||
    id === "clinica-lircay-achs-salud" ||
    id === "cl-lircay-de-talca"
  ) {
    return "clinica-lircay-achs-salud";
  }

  if (
    id === "cl-andes-salud-talca" ||
    id === "cm-andes-salud-talca" ||
    id === "centro-medico-andes-salud-talca"
  ) {
    if (/lircay/i.test(name)) return "clinica-lircay-achs-salud";
    return "centro-medico-andes-salud-talca";
  }

  if (
    /los carrera.*inter|intercl[ií]nica.*carrera/i.test(name) ||
    id === "clinica-los-carrera-interclinica" ||
    id === "cl-clinica-los-carrera-inter" ||
    id === "cl-los-carrera-inter"
  ) {
    return "cl-los-carrera-interclinica";
  }
  if (id === "clinica-los-carrera" || id === "cl-los-carrera") {
    if (/inter/i.test(name)) return "cl-los-carrera-interclinica";
    return "cl-los-carrera";
  }

  const canonical = resolveCanonicalClinicId(id);
  const restoreTargets = new Set([
    "cm-santa-maria",
    "cm-red-davila",
    "clinica-lircay-achs-salud",
    "cl-los-carrera-interclinica",
    "cl-los-carrera",
    "clinica-los-andes-achs-salud",
    "centro-medico-andes-salud-talca",
  ]);
  if (restoreTargets.has(canonical)) return canonical;

  if (
    id === "cm-santa-maria" ||
    id === "cl-centros-medicos-santa-maria" ||
    id === "centros-medicos-clinica-santa-maria"
  ) {
    return "cm-santa-maria";
  }
  if (
    id === "cm-red-davila" ||
    id === "cm-davila" ||
    id === "cl-centros-medicos-davila"
  ) {
    return "cm-red-davila";
  }

  return null;
}

async function ensureClinic(id: string) {
  const seed = CLINIC_SEED[id];
  if (!seed) return;
  const zones = resolveClinicZoneIds(id);
  if (!APPLY) return;
  await prisma.clinic.upsert({
    where: { id },
    create: { id, name: seed.name, address: seed.address, zones },
    update: { name: seed.name, address: seed.address, zones },
  });
}

type DesiredCoverage = {
  planCode: string;
  clinicId: string;
  clinicName: string;
  percentage: number;
  type: string;
};

async function applyDesiredCoverages(desired: DesiredCoverage[]) {
  // Deduplicate by plan+clinic+type keeping max percentage
  const best = new Map<string, DesiredCoverage>();
  for (const row of desired) {
    const key = `${row.planCode}::${row.clinicId}::${row.type}`;
    const prev = best.get(key);
    if (!prev || row.percentage > prev.percentage) best.set(key, row);
  }
  const rows = [...best.values()];

  const planCodes = [...new Set(rows.map((r) => r.planCode))];
  const existingPlans = await prisma.plan.findMany({
    where: { uniqueCode: { in: planCodes } },
    select: { uniqueCode: true },
  });
  const planSet = new Set(existingPlans.map((p) => p.uniqueCode));

  const clinicIds = [...new Set(rows.map((r) => r.clinicId))];
  const existingCov = await prisma.coverageEntry.findMany({
    where: {
      clinicId: { in: clinicIds },
      planCode: { in: [...planSet] },
    },
  });
  const covKey = (p: string, c: string, t: string) => `${p}::${c}::${t}`;
  const covMap = new Map(
    existingCov.map((c) => [covKey(c.planCode, c.clinicId, c.type), c]),
  );

  let created = 0;
  let updated = 0;
  let missingPlans = 0;
  const toCreate: DesiredCoverage[] = [];

  for (const row of rows) {
    if (!planSet.has(row.planCode)) {
      missingPlans += 1;
      continue;
    }
    const existing = covMap.get(covKey(row.planCode, row.clinicId, row.type));
    if (!existing) {
      created += 1;
      toCreate.push(row);
      continue;
    }
    if (row.percentage > existing.percentage) {
      updated += 1;
      if (APPLY) {
        await prisma.coverageEntry.update({
          where: { id: existing.id },
          data: {
            percentage: row.percentage,
            clinicName: row.clinicName,
          },
        });
      }
    }
  }

  if (APPLY && toCreate.length) {
    // Batch create in chunks
    for (let i = 0; i < toCreate.length; i += 200) {
      const chunk = toCreate.slice(i, i + 200);
      await prisma.coverageEntry.createMany({
        data: chunk.map((r) => ({
          planCode: r.planCode,
          clinicId: r.clinicId,
          clinicName: r.clinicName,
          percentage: r.percentage,
          type: r.type,
        })),
      });
    }
  }

  return { created, updated, missingPlans };
}

async function splitLosCarreraByName() {
  const interName = "Clínica Los Carrera InterClínica";
  const rows = await prisma.coverageEntry.findMany({
    where: {
      clinicId: "cl-los-carrera",
      clinicName: { contains: "Inter", mode: "insensitive" },
    },
  });

  let moved = 0;
  let deletedDup = 0;

  if (!APPLY) return { moved: rows.length, deletedDup: 0 };

  for (const row of rows) {
    moved += 1;
    const existing = await prisma.coverageEntry.findFirst({
      where: {
        planCode: row.planCode,
        clinicId: "cl-los-carrera-interclinica",
        type: row.type,
      },
    });

    if (existing) {
      if (row.percentage > existing.percentage) {
        await prisma.coverageEntry.update({
          where: { id: existing.id },
          data: { percentage: row.percentage, clinicName: interName },
        });
      }
      await prisma.coverageEntry.delete({ where: { id: row.id } });
      deletedDup += 1;
    } else {
      await prisma.coverageEntry.update({
        where: { id: row.id },
        data: {
          clinicId: "cl-los-carrera-interclinica",
          clinicName: interName,
        },
      });
    }
  }

  return { moved, deletedDup };
}

async function mergeClinic(fromId: string, toId: string) {
  const from = await prisma.clinic.findUnique({ where: { id: fromId } });
  const to = await prisma.clinic.findUnique({ where: { id: toId } });
  if (!from || !to) {
    return { moved: 0, deletedDup: 0, deletedClinic: false };
  }

  const coverages = await prisma.coverageEntry.findMany({
    where: { clinicId: fromId },
  });
  let moved = 0;
  let deletedDup = 0;

  if (!APPLY) {
    return { moved: coverages.length, deletedDup: 0, deletedClinic: true };
  }

  for (const coverage of coverages) {
    moved += 1;
    const existing = await prisma.coverageEntry.findFirst({
      where: {
        planCode: coverage.planCode,
        clinicId: toId,
        type: coverage.type,
      },
    });

    if (existing) {
      if (coverage.percentage > existing.percentage) {
        await prisma.coverageEntry.update({
          where: { id: existing.id },
          data: {
            percentage: coverage.percentage,
            clinicName: to.name,
          },
        });
      }
      await prisma.coverageEntry.delete({ where: { id: coverage.id } });
      deletedDup += 1;
    } else {
      await prisma.coverageEntry.update({
        where: { id: coverage.id },
        data: { clinicId: toId, clinicName: to.name },
      });
    }
  }

  await prisma.clinic.delete({ where: { id: fromId } });
  return { moved, deletedDup, deletedClinic: true };
}

async function deleteGarbageClinic(id: string) {
  const clinic = await prisma.clinic.findUnique({ where: { id } });
  if (!clinic) return { coverages: 0, deleted: false };
  const coverages = await prisma.coverageEntry.count({ where: { clinicId: id } });
  if (APPLY) {
    await prisma.coverageEntry.deleteMany({ where: { clinicId: id } });
    await prisma.clinic.delete({ where: { id } });
  }
  return { coverages, deleted: true };
}

async function main() {
  console.log(APPLY ? "Applying alignment..." : "Dry-run...");

  for (const id of Object.keys(CLINIC_SEED)) {
    await ensureClinic(id);
  }
  console.log("Clinics ensured:", Object.keys(CLINIC_SEED).join(", "));

  const losCarreraSplit = await splitLosCarreraByName();
  console.log("Los Carrera split:", losCarreraSplit);

  const losAndesMerge = await mergeClinic(
    "cl-los-andes-la",
    "clinica-los-andes-achs-salud",
  );
  console.log("Los Andes merge:", losAndesMerge);

  const desired: DesiredCoverage[] = [];
  for (const fileName of PARSED_FILES) {
    const filePath = path.join(process.cwd(), "scripts", fileName);
    let plans: HealthPlan[] = [];
    try {
      plans = JSON.parse(await readFile(filePath, "utf8")) as HealthPlan[];
    } catch {
      continue;
    }

    for (const plan of plans) {
      for (const entry of plan.coverage ?? []) {
        const targetId = mapRestoreClinicId(entry.clinic_id, entry.clinic_name);
        if (!targetId) continue;
        desired.push({
          planCode: plan.unique_code,
          clinicId: targetId,
          clinicName: CLINIC_SEED[targetId]?.name ?? entry.clinic_name,
          percentage: entry.percentage,
          type: entry.type,
        });
      }
    }
  }

  console.log("Desired coverage rows (raw):", desired.length);
  const restore = await applyDesiredCoverages(desired);
  console.log("Restore:", restore);

  const garbage: Record<string, { coverages: number; deleted: boolean }> = {};
  for (const garbageId of ["cl-clinica", "cl-centros-medicos"]) {
    garbage[garbageId] = await deleteGarbageClinic(garbageId);
  }
  console.log("Garbage:", garbage);

  if (APPLY) {
    invalidatePlanCatalogCache();
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        losCarreraSplit,
        losAndesMerge,
        restore,
        garbage,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
