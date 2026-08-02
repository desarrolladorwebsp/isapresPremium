import * as XLSX from "xlsx";
import { formatRut, isValidRut } from "@/lib/auth/rut";
import {
  normalizeCompanyAgreementName,
  normalizeCompanyAgreementRut,
  parseAgreementDiscountPercent,
} from "@/lib/company-agreements/normalize";

type CellValue = string | number | boolean | null | undefined;

export interface ParsedCompanyAgreement {
  companyRut: string;
  companyRutRaw: string;
  companyName: string;
  normalizedName: string;
  discountPercent: number | null;
  active: boolean;
}

function normalizeHeader(value: CellValue): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

function cellText(value: CellValue): string {
  return String(value ?? "").trim();
}

function findColumn(headers: CellValue[], candidates: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  return normalizedHeaders.findIndex((header) =>
    candidates.some((candidate) => header.includes(candidate)),
  );
}

function findPreferredColumn(
  headers: CellValue[],
  preferred: string[],
  fallback: string[],
): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  const preferredIndex = normalizedHeaders.findIndex((header) =>
    preferred.some((candidate) => header === candidate),
  );
  if (preferredIndex >= 0) return preferredIndex;
  return findColumn(headers, fallback);
}

function findHeaderRow(rows: CellValue[][]): {
  rowIndex: number;
  rutCol: number;
  nameCol: number;
  discountCol: number;
} {
  const maxScan = Math.min(rows.length, 30);

  for (let rowIndex = 0; rowIndex < maxScan; rowIndex += 1) {
    const headers = rows[rowIndex] ?? [];
    const rutCol = findPreferredColumn(headers, ["rut filial"], ["rut"]);
    const nameCol = findPreferredColumn(
      headers,
      ["nombre filial", "razon social"],
      ["razon social", "razon", "empresa", "nombre"],
    );
    const discountCol = findColumn(headers, [
      "descuento",
      "%",
      "porcentaje",
      "beneficio",
    ]);

    if (rutCol >= 0 && nameCol >= 0 && nameCol !== rutCol) {
      return { rowIndex, rutCol, nameCol, discountCol };
    }
  }

  throw new Error(
    "No se encontró una fila de encabezados con columnas de RUT y empresa.",
  );
}

export function parseCompanyAgreementsWorkbook(
  input: ArrayBuffer | Buffer | Uint8Array,
  defaultDiscountPercent: number,
): ParsedCompanyAgreement[] {
  const workbook = XLSX.read(input, { type: "buffer", cellDates: false });
  const parsed = new Map<string, ParsedCompanyAgreement>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    if (rows.length === 0) continue;

    let columns: ReturnType<typeof findHeaderRow>;
    try {
      columns = findHeaderRow(rows);
    } catch {
      continue;
    }

    for (const row of rows.slice(columns.rowIndex + 1)) {
      const companyRutRaw = cellText(row[columns.rutCol]);
      const companyRut = normalizeCompanyAgreementRut(companyRutRaw);
      if (!companyRutRaw || !isValidRut(companyRut)) continue;

      const companyName = cellText(row[columns.nameCol]);
      if (!companyName) continue;

      parsed.set(companyRut, {
        companyRut,
        companyRutRaw: formatRut(companyRut),
        companyName,
        normalizedName: normalizeCompanyAgreementName(companyName),
        discountPercent:
          columns.discountCol >= 0
            ? parseAgreementDiscountPercent(row[columns.discountCol]) ??
              defaultDiscountPercent
            : defaultDiscountPercent,
        active: true,
      });
    }
  }

  return [...parsed.values()].sort((a, b) =>
    a.companyName.localeCompare(b.companyName, "es"),
  );
}
