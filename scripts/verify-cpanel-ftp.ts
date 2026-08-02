import path from "path";
import { config } from "dotenv";
import { verifyCpanelConnection } from "../lib/plan-pdf-storage/cpanel";
import { resolvePlanPdfStorageBackend } from "../lib/plan-pdf-storage/provider";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const backend = resolvePlanPdfStorageBackend();
  console.log(`Backend configurado: ${backend}`);

  if (backend !== "cpanel") {
    console.error(
      "Configura PLAN_PDF_STORAGE=cpanel y las variables CPANEL_FTP_* en .env.local",
    );
    process.exit(1);
  }

  const result = await verifyCpanelConnection();
  console.log(result.message);
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
