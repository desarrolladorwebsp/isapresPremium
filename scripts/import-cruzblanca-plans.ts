import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cruzBlancaDir = path.join(rootDir, "storage", "planes-pdf", "cruz blanca");
const parsedJson = path.join(rootDir, "scripts", ".cruzblanca-plans-parsed.json");

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: rootDir, stdio: "inherit" });
}

run(`python3 scripts/parse-cruzblanca-excel.py "${cruzBlancaDir}" "${parsedJson}"`);
run(`npx tsx scripts/sync-consalud-plans.ts "${parsedJson}" "Cruz Blanca"`);
run(`npx tsx scripts/upload-plan-pdfs.ts "${cruzBlancaDir}" || PLAN_PDF_STORAGE=local npx tsx scripts/upload-plan-pdfs.ts "${cruzBlancaDir}"`);

console.log("\nImportación Cruz Blanca finalizada.");
