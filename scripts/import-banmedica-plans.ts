import { execSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const banmedicaDir = path.join(rootDir, "storage", "planes-pdf", "banmedica");
const parsedJson = path.join(rootDir, "scripts", ".banmedica-plans-parsed.json");

async function findLatestFile(
  directory: string,
  pattern: RegExp,
): Promise<string | null> {
  const entries = await readdir(directory);
  const matches = entries.filter((name) => pattern.test(name)).sort();
  if (matches.length === 0) return null;
  return path.join(directory, matches.at(-1)!);
}

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: rootDir, stdio: "inherit" });
}

async function main() {
  const santiagoXlsx =
    (await findLatestFile(banmedicaDir, /^Planes Banmedica Santiago.*\.xlsx$/i)) ??
    path.join(banmedicaDir, "Planes Banmedica Santiago.xlsx");
  const regionesXlsx =
    (await findLatestFile(banmedicaDir, /^Planes Banmedica Regiones.*\.xlsx$/i)) ??
    path.join(banmedicaDir, "Planes Banmedica Regiones.xlsx");

  console.log("Excel Santiago:", santiagoXlsx);
  console.log("Excel Regiones:", regionesXlsx);

  run(
    `python3 scripts/parse-banmedica-excel.py "${santiagoXlsx}" "${regionesXlsx}" "${parsedJson}"`,
  );
  run(`npx tsx scripts/sync-consalud-plans.ts "${parsedJson}" Banmédica`);
  run(`npx tsx scripts/upload-plan-pdfs.ts "${banmedicaDir}"`);
}

main().catch((error) => {
  console.error("Error en importación Banmédica:", error);
  process.exit(1);
});
