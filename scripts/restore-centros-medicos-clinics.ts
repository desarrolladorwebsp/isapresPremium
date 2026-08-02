/**
 * Restaura coberturas de Centros Médicos (Santa María / Red Dávila) desde
 * los JSON parseados de Excel, y asegura clínicas canónicas faltantes.
 *
 *   npx tsx scripts/restore-centros-medicos-clinics.ts
 *   npx tsx scripts/restore-centros-medicos-clinics.ts --apply
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

const CENTROS_TARGET_IDS = new Set(["cm-santa-maria", "cm-red-davila"]);

const CLINIC_SEED: Record<string, { name: string; address: string }> = {
  "cm-santa-maria": {
    name: "Centros Médicos Clínica Santa María",
    address: "Av. Santa María 0500, Providencia, Santiago",
  },
  "cm-red-davila": {
    name: "Centros Médicos Red Dávila",
    address: "Av. Recoleta 464, Recoleta, Santiago",
  },
};

function mapLegacyCentrosId(rawId: string): string | null {
  const id = resolveCanonicalClinicId(rawId.trim());
  if (CENTROS_TARGET_IDS.has(id)) return id;

  // IDs históricos antes del mapa canónico actual
  if (
    rawId === "cm-santa-maria" ||
    rawId === "cl-centros-medicos-santa-maria" ||
    rawId === "centros-medicos-clinica-santa-maria"
  ) {
    return "cm-santa-maria";
  }
  if (
    rawId === "cm-red-davila" ||
    rawId === "cm-davila" ||
    rawId === "cl-centros-medicos-davila"
  ) {
    return "cm-red-davila";
  }
  return null;
}

async function ensureClinic(id: string) {
  const seed = CLINIC_SEED[id];
  if (!seed) return;
  const zones = resolveClinicZoneIds(id);
  await prisma.clinic.upsert({
    where: { id },
    create: {
      id,
      name: seed.name,
      address: seed.address,
      zones,
    },
    update: {
      name: seed.name,
      address: seed.address,
      zones,
    },
  });
}

async function main() {
  let restored = 0;
  let skippedExisting = 0;
  let missingPlans = 0;

  if (APPLY) {
    await ensureClinic("cm-santa-maria");
    await ensureClinic("cm-red-davila");
  }

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
        const targetId = mapLegacyCentrosId(entry.clinic_id);
        if (!targetId) continue;

        const planExists = await prisma.plan.findUnique({
          where: { uniqueCode: plan.unique_code },
          select: { uniqueCode: true },
        });
        if (!planExists) {
          missingPlans += 1;
          continue;
        }

        const existing = await prisma.coverageEntry.findFirst({
          where: {
            planCode: plan.unique_code,
            clinicId: targetId,
            type: entry.type,
          },
        });

        if (existing) {
          skippedExisting += 1;
          if (APPLY && entry.percentage > existing.percentage) {
            await prisma.coverageEntry.update({
              where: { id: existing.id },
              data: {
                percentage: entry.percentage,
                clinicName: CLINIC_SEED[targetId]?.name ?? entry.clinic_name,
              },
            });
          }
          continue;
        }

        restored += 1;
        if (APPLY) {
          await prisma.coverageEntry.create({
            data: {
              planCode: plan.unique_code,
              clinicId: targetId,
              clinicName: CLINIC_SEED[targetId]?.name ?? entry.clinic_name,
              percentage: entry.percentage,
              type: entry.type,
            },
          });
        }
      }
    }
  }

  // Rename Los Andes Los Ángeles to reference label
  if (APPLY) {
    await prisma.clinic.updateMany({
      where: { id: "cl-los-andes-la" },
      data: { name: "Clínica Los Andes Achs Salud" },
    });
  }

  if (APPLY) {
    invalidatePlanCatalogCache();
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        restoredCoverages: restored,
        skippedExisting,
        missingPlans,
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
