import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const colmenaDir = path.join(rootDir, "storage", "planes-pdf", "colmena");
const parsedJson = path.join(rootDir, "scripts", ".colmena-plans-parsed.json");

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: rootDir, stdio: "inherit" });
}

run(`python3 scripts/parse-colmena-excel.py "${colmenaDir}" "${parsedJson}"`);
run(`npx tsx scripts/sync-consalud-plans.ts "${parsedJson}" Colmena`);
run(`npx tsx scripts/upload-plan-pdfs.ts "${colmenaDir}"`);

console.log("\nImportación Colmena finalizada.");
