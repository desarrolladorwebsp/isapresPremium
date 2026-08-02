import { ApiError } from "@/lib/api/api-error";
import { resolveCompanyAgreementDiscountPercent } from "@/lib/company-agreements/constants";
import {
  parseCompanyAgreementsWorkbook,
  type ParsedCompanyAgreement,
} from "@/lib/company-agreements/parse-workbook";
import { resolveIsapreNameFromId } from "@/lib/isapre-catalog";
import { prisma } from "@/lib/prisma";
import type {
  CompanyAgreementAdminListItem,
  CompanyAgreementAdminListResult,
  CompanyAgreementImportResult,
} from "@/types/company-agreement";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function toListItem(row: {
  id: string;
  companyRut: string;
  companyRutRaw: string | null;
  companyName: string;
  discountPercent: number | null;
  isapreId: string | null;
  sourceFile: string | null;
  active: boolean;
  updatedAt: Date;
  isapre?: { name: string } | null;
}): CompanyAgreementAdminListItem {
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
    sourceFile: row.sourceFile,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCompanyAgreementsAdmin(input: {
  q?: string | null;
  isapreId?: string | null;
  active?: boolean | null;
  page?: number | null;
  pageSize?: number | null;
}): Promise<CompanyAgreementAdminListResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const query = input.q?.trim() ?? "";
  const isapreId = input.isapreId?.trim() || null;

  const where = {
    ...(typeof input.active === "boolean" ? { active: input.active } : {}),
    ...(isapreId ? { isapreId } : {}),
    ...(query
      ? {
          OR: [
            { companyName: { contains: query, mode: "insensitive" as const } },
            { companyRut: { contains: query.replace(/\./g, ""), mode: "insensitive" as const } },
            { companyRutRaw: { contains: query, mode: "insensitive" as const } },
            { normalizedName: { contains: query.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [total, rows, summaryRows] = await Promise.all([
    prisma.companyAgreement.count({ where }),
    prisma.companyAgreement.findMany({
      where,
      select: {
        id: true,
        companyRut: true,
        companyRutRaw: true,
        companyName: true,
        discountPercent: true,
        isapreId: true,
        sourceFile: true,
        active: true,
        updatedAt: true,
        isapre: { select: { name: true } },
      },
      orderBy: [{ companyName: "asc" }, { companyRut: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.companyAgreement.groupBy({
      by: ["isapreId", "active"],
      _count: true,
    }),
  ]);

  const byIsapre = new Map<
    string,
    { isapreId: string; isapreName: string; total: number; active: number }
  >();

  for (const row of summaryRows) {
    const key = row.isapreId ?? "sin-isapre";
    const current = byIsapre.get(key) ?? {
      isapreId: key,
      isapreName: row.isapreId
        ? resolveIsapreNameFromId(row.isapreId)
        : "Sin isapre",
      total: 0,
      active: 0,
    };
    current.total += row._count;
    if (row.active) current.active += row._count;
    byIsapre.set(key, current);
  }

  const totals = {
    all: summaryRows.reduce((sum, row) => sum + row._count, 0),
    active: summaryRows
      .filter((row) => row.active)
      .reduce((sum, row) => sum + row._count, 0),
    inactive: summaryRows
      .filter((row) => !row.active)
      .reduce((sum, row) => sum + row._count, 0),
  };

  return {
    items: rows.map(toListItem),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totals,
    byIsapre: [...byIsapre.values()].sort((a, b) =>
      a.isapreName.localeCompare(b.isapreName, "es"),
    ),
  };
}

export async function importCompanyAgreementsFromWorkbook(input: {
  fileBuffer: Buffer;
  fileName: string;
  isapreId: string;
  discountPercent?: number | null;
}): Promise<CompanyAgreementImportResult> {
  const isapreId = input.isapreId.trim();
  if (!isapreId) {
    throw new ApiError("Debes indicar la isapre del convenio.", 400);
  }

  const isapre = await prisma.isapre.findUnique({
    where: { id: isapreId },
    select: { id: true, name: true },
  });
  if (!isapre) {
    throw new ApiError(`Isapre no encontrada: ${isapreId}.`, 400);
  }

  const discountPercent =
    typeof input.discountPercent === "number" &&
    Number.isFinite(input.discountPercent) &&
    input.discountPercent > 0 &&
    input.discountPercent <= 100
      ? Math.round(input.discountPercent * 100) / 100
      : resolveCompanyAgreementDiscountPercent(isapreId);

  let agreements: ParsedCompanyAgreement[];
  try {
    agreements = parseCompanyAgreementsWorkbook(
      input.fileBuffer,
      discountPercent,
    );
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? error.message
        : "No se pudo leer el archivo Excel de convenios.",
      400,
    );
  }

  if (agreements.length === 0) {
    throw new ApiError(
      "No se encontraron convenios válidos en el Excel. Revisa columnas de RUT y razón social.",
      400,
    );
  }

  const sourceFile = input.fileName.split(/[/\\]/).pop()?.trim() || "import.xlsx";
  let created = 0;
  let updated = 0;

  for (const agreement of agreements) {
    const existing = await prisma.companyAgreement.findUnique({
      where: { companyRut: agreement.companyRut },
      select: { id: true },
    });

    await prisma.companyAgreement.upsert({
      where: { companyRut: agreement.companyRut },
      create: {
        companyRut: agreement.companyRut,
        companyRutRaw: agreement.companyRutRaw,
        companyName: agreement.companyName,
        normalizedName: agreement.normalizedName,
        discountPercent: agreement.discountPercent,
        isapreId,
        sourceFile,
        active: agreement.active,
      },
      update: {
        companyRutRaw: agreement.companyRutRaw,
        companyName: agreement.companyName,
        normalizedName: agreement.normalizedName,
        discountPercent: agreement.discountPercent,
        isapreId,
        sourceFile,
        active: agreement.active,
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  return {
    ok: true,
    isapreId: isapre.id,
    isapreName: isapre.name,
    sourceFile,
    discountPercent,
    imported: agreements.length,
    created,
    updated,
  };
}
