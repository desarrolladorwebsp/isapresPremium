import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const consaludDir = path.join(rootDir, "storage", "planes-pdf", "consalud");
const parsedJson = path.join(rootDir, "scripts", ".consalud-plans-parsed.json");

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: rootDir, stdio: "inherit" });
}

run(`python3 scripts/parse-consalud-excel.py "${consaludDir}" "${parsedJson}"`);
run(`npx tsx scripts/sync-consalud-plans.ts "${parsedJson}" Consalud`);
run(`npx tsx scripts/upload-plan-pdfs.ts "${consaludDir}"`);

console.log("\nImportación Consalud finalizada.");
