import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { config } from "dotenv";
import {
  COLMENA_HOLDING_AGREEMENT_ISAPRE_ID,
  resolveCompanyAgreementDiscountPercent,
} from "../lib/company-agreements/constants";
import { importCompanyAgreementsFromWorkbook } from "../lib/api/company-agreements-admin";
import { prisma } from "../lib/prisma";

config({ path: path.join(process.cwd(), ".env.local") });

const DEFAULT_FILE = path.join(
  process.cwd(),
  "storage",
  "convenios",
  "colmena-holding-filiales.xls",
);
const DEFAULT_ISAPRE_ID = COLMENA_HOLDING_AGREEMENT_ISAPRE_ID;

function parseCliArgs(argv: string[]) {
  let filePath: string | undefined;
  let isapreId = DEFAULT_ISAPRE_ID;
  let discountPercent: number | undefined;

  for (const arg of argv) {
    if (arg.startsWith("--isapre=")) {
      isapreId = arg.slice("--isapre=".length).trim() || DEFAULT_ISAPRE_ID;
      continue;
    }
    if (arg.startsWith("--discount=")) {
      const parsed = Number(arg.slice("--discount=".length));
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
        throw new Error("El parámetro --discount debe ser un número entre 1 y 100.");
      }
      discountPercent = parsed;
      continue;
    }
    if (!arg.startsWith("-")) {
      filePath = arg;
    }
  }

  return {
    filePath: path.resolve(filePath ?? DEFAULT_FILE),
    isapreId,
    discountPercent:
      discountPercent ?? resolveCompanyAgreementDiscountPercent(isapreId),
  };
}

async function main() {
  const { filePath, isapreId, discountPercent } = parseCliArgs(
    process.argv.slice(2),
  );

  if (!existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  const result = await importCompanyAgreementsFromWorkbook({
    fileBuffer: readFileSync(filePath),
    fileName: path.basename(filePath),
    isapreId,
    discountPercent,
  });

  console.log(
    `Convenios importados: ${result.imported} (${result.created} nuevos, ${result.updated} actualizados) desde ${path.relative(
      process.cwd(),
      filePath,
    )}`,
  );
  console.log(
    `Isapre: ${result.isapreName} (${result.isapreId}) · Descuento: ${result.discountPercent}%`,
  );
}

main()
  .catch((error) => {
    console.error("Error al importar convenios:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
