import { Prisma } from "@prisma/client";
import { getPrismaClient, prisma } from "@/lib/prisma";
import {
  normalizeCompanyAgreementName,
  normalizeCompanyAgreementRut,
} from "@/lib/company-agreements/normalize";
import { resolveIsapreNameFromId } from "@/lib/isapre-catalog";
import type {
  CompanyAgreementLookupResult,
  CompanyAgreementRecord,
} from "@/types/company-agreement";

const AGREEMENT_LOOKUP_LIMIT = 10;

function hasCompanyAgreementDelegate(): boolean {
  const client = getPrismaClient();
  return Boolean(client.companyAgreement);
}

function toAgreementRecord(row: {
  id: string;
  companyRut: string;
  companyRutRaw: string | null;
  companyName: string;
  discountPercent: number | null;
  isapreId: string | null;
  isapre?: { name: string } | null;
}): CompanyAgreementRecord {
  return {
    id: row.id,
    companyRut: row.companyRut,
    companyRutRaw: row.companyRutRaw,
    companyName: row.companyName,
    discountPercent: row.discountPercent,
    isapreId: row.isapreId,
    isapreName:
      row.isapre?.name ??
      (row.isapreId ? resolveIsapreNameFromId(row.isapreId) : null),
  };
}

export async function lookupCompanyAgreements(input: {
  companyRut?: string | null;
  companyName?: string | null;
}): Promise<CompanyAgreementLookupResult> {
  const normalizedRut = input.companyRut
    ? normalizeCompanyAgreementRut(input.companyRut)
    : "";
  const normalizedName = input.companyName
    ? normalizeCompanyAgreementName(input.companyName)
    : "";

  if (!normalizedRut && normalizedName.length < 3) {
    return { matches: [] };
  }

  if (!hasCompanyAgreementDelegate()) {
    console.warn(
      "lookupCompanyAgreements: prisma.companyAgreement no disponible. Ejecuta `npx prisma generate` y aplica el esquema.",
    );
    return { matches: [] };
  }

  const where =
    normalizedRut.length > 0
      ? { active: true, companyRut: normalizedRut }
      : {
          active: true,
          normalizedName: { contains: normalizedName },
        };

  try {
    const matches = await prisma.companyAgreement.findMany({
      where,
      select: {
        id: true,
        companyRut: true,
        companyRutRaw: true,
        companyName: true,
        discountPercent: true,
        isapreId: true,
        isapre: { select: { name: true } },
      },
      orderBy: { companyName: "asc" },
      take: AGREEMENT_LOOKUP_LIMIT,
    });

    return { matches: matches.map(toAgreementRecord) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      console.warn(
        "lookupCompanyAgreements: tabla company_agreements no disponible.",
        error.message,
      );
      return { matches: [] };
    }

    throw error;
  }
}
