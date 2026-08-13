import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import * as XLSX from "xlsx";
import { getClinicZoneIds, getZoneLabel } from "../lib/clinic-admin";
import {
  isVirtualClinicId,
  resolveClinicLocationJsonKey,
} from "../lib/clinic-location-aliases";

config({ path: path.join(process.cwd(), ".env.local") });

interface LocationRecord {
  address: string;
  lat: number;
  lng: number;
  source?: string;
}

interface ClinicRow {
  id: string;
  name: string;
  zones: string[];
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  locationSource?: string | null;
}

const OUTPUT_PATH = path.join(
  process.cwd(),
  "storage",
  "reportes",
  "clinicas-ubicaciones.xlsx",
);

function loadLocations(): Record<string, LocationRecord> {
  const filePath = path.join(
    process.cwd(),
    "src",
    "assets",
    "clinic-locations.json",
  );
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    locations: Record<string, LocationRecord>;
  };
  return parsed.locations ?? {};
}

async function loadClinics(): Promise<{ clinics: ClinicRow[]; source: string }> {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      let rows: ClinicRow[];
      try {
        rows = (await prisma.clinic.findMany({
          orderBy: { name: "asc" },
        })) as unknown as ClinicRow[];
      } catch {
        // La migración de ubicaciones aún no está aplicada: usa columnas base.
        rows = await prisma.clinic.findMany({
          select: { id: true, name: true, zones: true },
          orderBy: { name: "asc" },
        });
      }
      return { clinics: rows, source: "base de datos" };
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.warn(
      "No se pudo conectar a la base de datos, usando snapshot local (assets/clinics.json).",
      error instanceof Error ? `(${error.message})` : "",
    );
    const filePath = path.join(
      process.cwd(),
      "assets",
      "clinics.json",
    );
    const rows = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      id: string;
      name: string;
    }[];
    return {
      clinics: rows.map((row) => ({ ...row, zones: [] })),
      source: "snapshot local",
    };
  }
}

async function main() {
  const locations = loadLocations();
  const { clinics, source } = await loadClinics();

  const rows = clinics
    .map((clinic) => {
      const jsonKey = resolveClinicLocationJsonKey(clinic.id);
      const fallback = isVirtualClinicId(clinic.id, clinic.name)
        ? undefined
        : locations[jsonKey] ?? locations[clinic.id];
      const address = clinic.address ?? fallback?.address ?? "";
      const lat = clinic.lat ?? fallback?.lat ?? "";
      const lng = clinic.lng ?? fallback?.lng ?? "";
      const locSource = clinic.locationSource ?? fallback?.source ?? "";
      const zoneIds = getClinicZoneIds({
        id: clinic.id,
        name: clinic.name,
        zones: clinic.zones ?? [],
      });

      return {
        ID: clinic.id,
        Nombre: clinic.name,
        "Región / Zonas": zoneIds.map((id) => getZoneLabel(id)).join(", "),
        Dirección: address,
        "Tiene dirección": address ? "Sí" : "No",
        Latitud: lat,
        Longitud: lng,
        Fuente: locSource,
      };
    })
    .sort((a, b) => a.Nombre.localeCompare(b.Nombre, "es"));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 40 },
    { wch: 26 },
    { wch: 60 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clínicas");

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  XLSX.writeFile(workbook, OUTPUT_PATH);

  const withAddress = rows.filter((row) => row["Tiene dirección"] === "Sí").length;
  console.log(`Fuente de clínicas: ${source}`);
  console.log(`Clínicas exportadas: ${rows.length}`);
  console.log(`Con dirección: ${withAddress}`);
  console.log(`Sin dirección: ${rows.length - withAddress}`);
  console.log(`Excel: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Error al exportar clínicas y ubicaciones:", error);
  process.exit(1);
});
