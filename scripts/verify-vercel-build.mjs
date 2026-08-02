import { execSync } from "node:child_process";

console.log("\n[verify:vercel] Build de producción (mismo comando que Vercel)…");
execSync("npm run build", { stdio: "inherit" });

console.log("\n[verify:vercel] OK — listo para commit y push a Vercel.");
