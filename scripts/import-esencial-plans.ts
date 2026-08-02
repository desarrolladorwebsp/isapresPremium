import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const esencialDir = path.join(rootDir, "storage", "planes-pdf", "esencial");
const parsedJson = path.join(rootDir, "scripts", ".esencial-plans-parsed.json");

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: rootDir, stdio: "inherit" });
}

run(`python3 scripts/parse-esencial-excel.py "${esencialDir}" "${parsedJson}"`);
run(`npx tsx scripts/sync-consalud-plans.ts "${parsedJson}" Esencial`);
run(`npx tsx scripts/upload-plan-pdfs.ts "${esencialDir}"`);

console.log("\nImportación Esencial finalizada.");
