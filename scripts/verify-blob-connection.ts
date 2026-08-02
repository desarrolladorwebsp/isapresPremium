import path from "path";
import { config } from "dotenv";
import { list } from "@vercel/blob";
import {
  assertBlobConfigured,
  getBlobClientConfig,
  resolvePlanPdfStorageBackend,
} from "../lib/plan-pdf-storage/provider";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const backend = resolvePlanPdfStorageBackend();
  console.log("Backend PDF:", backend);

  if (backend !== "blob") {
    console.error(
      "Blob no activo. Agrega BLOB_READ_WRITE_TOKEN en cotizador-web/.env.local",
    );
    process.exit(1);
  }

  assertBlobConfigured();

  const result = await list({
    limit: 5,
    prefix: "consalud/",
    ...getBlobClientConfig(),
  });

  console.log("Conexión OK ✓");
  console.log(`PDFs en consalud/: ${result.blobs.length} (muestra de 5)`);
  for (const blob of result.blobs) {
    console.log(`  - ${blob.pathname}`);
  }
}

main().catch((error) => {
  console.error("Error de conexión:", error.message);
  process.exit(1);
});
