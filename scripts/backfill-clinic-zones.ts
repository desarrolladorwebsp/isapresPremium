import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { resolveClinicZoneIdsComplete } from "../lib/clinic-zone-inference";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const allClinics = process.argv.includes("--all");

  const clinics = await prisma.clinic.findMany({
    select: { id: true, name: true, zones: true },
    orderBy: { name: "asc" },
  });

  const targets = allClinics
    ? clinics
    : clinics.filter((clinic) => !clinic.zones || clinic.zones.length === 0);

  let updated = 0;
  let unchanged = 0;
  const stillMissing: Array<{ id: string; name: string }> = [];

  for (const clinic of targets) {
    const zones = resolveClinicZoneIdsComplete(clinic.id, clinic.name);

    if (zones.length === 0) {
      stillMissing.push({ id: clinic.id, name: clinic.name });
      continue;
    }

    const sameZones =
      clinic.zones.length === zones.length &&
      clinic.zones.every((zoneId, index) => zoneId === zones[index]);

    if (sameZones) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.clinic.update({
        where: { id: clinic.id },
        data: { zones },
      });
    }

    updated += 1;
    console.log(
      `${dryRun ? "[dry-run] " : ""}${clinic.name} (${clinic.id}) → ${zones.join(", ")}`,
    );
  }

  const remaining = await prisma.clinic.count({
    where: { zones: { equals: [] } },
  });

  console.log("\nResumen:");
  console.log(`  Objetivo: ${targets.length} clínicas`);
  console.log(`  Actualizadas: ${updated}`);
  console.log(`  Sin cambios: ${unchanged}`);
  console.log(`  Sin zona inferida: ${stillMissing.length}`);
  console.log(`  Sin zona en BD (total): ${remaining}`);

  if (stillMissing.length > 0) {
    console.log("\nPendientes:");
    for (const clinic of stillMissing) {
      console.log(`  - ${clinic.name} (${clinic.id})`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Error en backfill de zonas de clínicas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
