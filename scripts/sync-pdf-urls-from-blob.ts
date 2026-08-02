import path from "path";
import { config } from "dotenv";
import { getDownloadUrl, list } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import {
  assertBlobConfigured,
  getBlobClientConfig,
} from "../lib/plan-pdf-storage/provider";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  assertBlobConfigured();
  const blobOptions = getBlobClientConfig()!;

  console.log("Sincronizando pdf_url desde Vercel Blob…");

  let cursor: string | undefined;
  let updated = 0;
  let scanned = 0;

  do {
    const page = await list({
      limit: 1000,
      cursor,
      prefix: "consalud/",
      ...blobOptions,
    });

    for (const blob of page.blobs) {
      scanned += 1;
      const storageKey = blob.pathname;
      const uniqueCode = path.basename(storageKey, ".pdf");

      const plan = await prisma.plan.findFirst({
        where: {
          uniqueCode: { equals: uniqueCode, mode: "insensitive" },
        },
      });

      if (!plan) continue;

      const downloadUrl = blob.downloadUrl ?? getDownloadUrl(blob.url);
      const needsUpdate =
        plan.pdfPublicId !== storageKey || plan.pdfUrl !== downloadUrl;

      if (!needsUpdate) continue;

      await prisma.plan.update({
        where: { uniqueCode: plan.uniqueCode },
        data: {
          pdfPublicId: storageKey,
          pdfUrl: downloadUrl,
        },
      });

      updated += 1;
      console.log(`  [ok] ${plan.uniqueCode}`);
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  console.log(`\nBlobs revisados: ${scanned}`);
  console.log(`Planes actualizados en BD: ${updated}`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
