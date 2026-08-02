import * as XLSX from "xlsx";
import {
  ISAPRE_FILTER_OPTIONS,
  ZONE_FILTER_OPTIONS,
} from "@/lib/filter-options";
import {
  resolveHasTopFromPlanType,
} from "@/lib/plan-metadata";
import {
  DEFAULT_GES_PREMIUM_UF,
  ISAPRE_GES_DEFAULTS,
  resolveGesPremiumUf,
} from "@/lib/isapre-ges-defaults";
import { resolveIsapreIdFromName } from "@/lib/isapre-catalog";
import type { CoverageEntry, HealthPlan, PlanTypeId } from "@/types/plan";

type CellValue = string | number | boolean | null | undefined;

export type PlanBulkAction = "crear" | "actualizar" | "eliminar";

export interface ParsedPlanBulkCoverage {
  clinicId: string;
  clinicName: string;
  percentage: number;
  type: "hospitalaria" | "ambulatoria";
  rowNumber: number;
}

export interface ParsedPlanBulkRow {
  action: PlanBulkAction;
  uniqueCode: string;
  /** Plan armado desde el Excel (null en eliminar). */
  plan: HealthPlan | null;
  /** Campos opcionales presentes en actualizar (para merge con BD). */
  updatePartial: PlanBulkUpdatePartial | null;
  /** true si el Excel trae filas de cobertura para este código. */
  replaceCoverage: boolean;
  sheetRow: number;
  warnings: string[];
}

export interface PlanBulkUpdatePartial {
  isapre: string | null;
  planName: string | null;
  basePriceUf: number | null;
  gesPremiumUf: number | null;
  planType: PlanTypeId | null;
  notesProvided: boolean;
  notes: string | null;
  zonesProvided: boolean;
  zones: string[];
}

export interface PlanBulkParseIssue {
  sheet: "Planes" | "Coberturas";
  row: number;
  message: string;
}

export interface PlanBulkParseResult {
  rows: ParsedPlanBulkRow[];
  issues: PlanBulkParseIssue[];
}

const PLAN_TYPE_BY_LABEL: Record<string, PlanTypeId> = {
  preferente: "preferred",
  "libre eleccion": "free_choice",
  "libre elección": "free_choice",
  cerrado: "closed",
  preferred: "preferred",
  free_choice: "free_choice",
  closed: "closed",
};

const ALLOWED_PERCENTAGES = new Set([40, 50, 60, 70, 80, 90, 100]);
const ZONE_IDS = new Set(ZONE_FILTER_OPTIONS.map((z) => z.id));
const ISAPRE_LABELS = new Set(
  ISAPRE_FILTER_OPTIONS.map((item) => item.label.toLowerCase()),
);

function normalizeHeader(value: CellValue): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[▾🔒]/g, "")
    .replace(/[^a-z0-9_]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function cellText(value: CellValue): string {
  if (value == null) return "";
  return String(value).trim();
}

function cellNumber(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cellText(value).replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function findSheet(
  workbook: XLSX.WorkBook,
  candidates: string[],
): XLSX.WorkSheet | null {
  const normalized = new Map(
    workbook.SheetNames.map((name) => [
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim(),
      name,
    ]),
  );

  for (const candidate of candidates) {
    const key = candidate
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const real = normalized.get(key);
    if (real) return workbook.Sheets[real] ?? null;
  }
  return null;
}

function sheetRows(sheet: XLSX.WorkSheet): CellValue[][] {
  return XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
}

function buildHeaderIndex(headerRow: CellValue[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function col(headers: Map<string, number>, ...names: string[]): number {
  for (const name of names) {
    const idx = headers.get(normalizeHeader(name));
    if (idx != null) return idx;
  }
  return -1;
}

function isTemplateNoteRow(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (text.startsWith("▾") || text.startsWith("▼") || text.startsWith("🔒")) {
    return true;
  }
  return (
    text.length > 40 &&
    /select|f[oó]rmula|hoja protegida|solo admiten/i.test(text)
  );
}

function parseAction(raw: string): PlanBulkAction | null {
  const value = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (value === "crear" || value === "create" || value === "nuevo") return "crear";
  if (value === "actualizar" || value === "update" || value === "editar") {
    return "actualizar";
  }
  if (value === "eliminar" || value === "delete" || value === "borrar") {
    return "eliminar";
  }
  return null;
}

function parsePlanType(raw: string): PlanTypeId | null {
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return PLAN_TYPE_BY_LABEL[key] ?? null;
}

function parseZoneToken(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const id = text.split("|")[0]?.trim() || text;
  if (ZONE_IDS.has(id)) return id;
  const byLabel = ZONE_FILTER_OPTIONS.find(
    (z) => z.label.toLowerCase() === text.toLowerCase(),
  );
  return byLabel?.id ?? null;
}

function resolveGesForIsapreName(isapreName: string): number {
  const id = resolveIsapreIdFromName(isapreName);
  return resolveGesPremiumUf(
    ISAPRE_GES_DEFAULTS[id]?.gesPremiumUf,
    DEFAULT_GES_PREMIUM_UF,
  );
}

export interface ClinicLookupItem {
  id: string;
  name: string;
}

function buildClinicResolver(clinics: ClinicLookupItem[]) {
  const byId = new Map(clinics.map((c) => [c.id, c]));
  const byLabel = new Map(
    clinics.map((c) => [`${c.id} | ${c.name}`.toLowerCase(), c]),
  );
  const byName = new Map<string, ClinicLookupItem[]>();
  for (const clinic of clinics) {
    const key = clinic.name.toLowerCase();
    const list = byName.get(key) ?? [];
    list.push(clinic);
    byName.set(key, list);
  }

  return function resolveClinic(raw: string): ClinicLookupItem | null {
    const text = raw.trim();
    if (!text) return null;

    const fromLabel = byLabel.get(text.toLowerCase());
    if (fromLabel) return fromLabel;

    if (text.includes("|")) {
      const [idPartRaw, ...nameParts] = text.split("|");
      const idPart = idPartRaw?.trim() ?? "";
      const namePart = nameParts.join("|").trim();
      if (byId.has(idPart)) return byId.get(idPart)!;
      // Permite clínicas nuevas en la plantilla (id | nombre).
      if (idPart && namePart) return { id: idPart, name: namePart };
    }

    if (byId.has(text)) return byId.get(text)!;

    const matches = byName.get(text.toLowerCase()) ?? [];
    if (matches.length === 1) return matches[0];
    return null;
  };
}

function collectZones(
  row: CellValue[],
  headers: Map<string, number>,
): { zones: string[]; error: string | null } {
  const zones: string[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= 5; i += 1) {
    const idx = col(headers, `zona_${i}`, `zona${i}`);
    if (idx < 0) continue;
    const raw = cellText(row[idx]);
    if (!raw) continue;
    const zoneId = parseZoneToken(raw);
    if (!zoneId) {
      return { zones: [], error: `Zona no válida: "${raw}".` };
    }
    if (!seen.has(zoneId)) {
      seen.add(zoneId);
      zones.push(zoneId);
    }
  }

  return { zones, error: null };
}

/**
 * Parsea la plantilla de carga masiva (hojas Planes + Coberturas).
 * No escribe en BD.
 */
export function parsePlanBulkWorkbook(
  input: ArrayBuffer | Buffer | Uint8Array,
  clinics: ClinicLookupItem[],
): PlanBulkParseResult {
  const workbook = XLSX.read(input, { type: "buffer", cellDates: false });
  const issues: PlanBulkParseIssue[] = [];
  const resolveClinic = buildClinicResolver(clinics);

  const planesSheet = findSheet(workbook, ["Planes", "planes", "Planes "]);
  const coberturasSheet = findSheet(workbook, [
    "Coberturas",
    "coberturas",
    "Cobertura",
  ]);

  if (!planesSheet) {
    return {
      rows: [],
      issues: [
        {
          sheet: "Planes",
          row: 0,
          message: 'No se encontró la hoja "Planes".',
        },
      ],
    };
  }

  const planesMatrix = sheetRows(planesSheet);
  if (planesMatrix.length < 2) {
    return {
      rows: [],
      issues: [
        {
          sheet: "Planes",
          row: 0,
          message: "La hoja Planes no tiene filas de datos.",
        },
      ],
    };
  }

  const planesHeaders = buildHeaderIndex(planesMatrix[0] ?? []);
  const accionCol = col(planesHeaders, "accion");
  const codigoCol = col(planesHeaders, "codigo_unico", "codigo", "unique_code");
  const isapreCol = col(planesHeaders, "isapre");
  const nombreCol = col(planesHeaders, "nombre_plan", "nombre", "plan_name");
  const precioCol = col(
    planesHeaders,
    "precio_base_uf",
    "precio_base",
    "base_price_uf",
  );
  const gesCol = col(planesHeaders, "ges_uf", "ges_premium_uf", "ges");
  const tipoCol = col(planesHeaders, "tipo_plan", "tipo");
  const notasCol = col(planesHeaders, "notas", "additional_notes", "notas_adicionales");

  if (accionCol < 0 || codigoCol < 0) {
    return {
      rows: [],
      issues: [
        {
          sheet: "Planes",
          row: 1,
          message:
            'La hoja Planes debe tener columnas "accion" y "codigo_unico".',
        },
      ],
    };
  }

  // Coberturas index by codigo
  const coverageByCode = new Map<string, ParsedPlanBulkCoverage[]>();
  if (coberturasSheet) {
    const covMatrix = sheetRows(coberturasSheet);
    if (covMatrix.length >= 2) {
      const covHeaders = buildHeaderIndex(covMatrix[0] ?? []);
      const covCodigoCol = col(covHeaders, "codigo_unico", "codigo");
      const covTipoCol = col(covHeaders, "tipo_cobertura", "tipo");
      const covClinicaCol = col(covHeaders, "clinica", "clinic", "prestador");
      const covPctCol = col(covHeaders, "porcentaje", "percentage", "pct");

      if (
        covCodigoCol < 0 ||
        covTipoCol < 0 ||
        covClinicaCol < 0 ||
        covPctCol < 0
      ) {
        issues.push({
          sheet: "Coberturas",
          row: 1,
          message:
            "Coberturas requiere columnas codigo_unico, tipo_cobertura, clinica y porcentaje.",
        });
      } else {
        for (let i = 1; i < covMatrix.length; i += 1) {
          const row = covMatrix[i] ?? [];
          const rowNumber = i + 1;
          const code = cellText(row[covCodigoCol]);
          const tipoRaw = cellText(row[covTipoCol]);
          const clinicaRaw = cellText(row[covClinicaCol]);
          const pctRaw = row[covPctCol];

          if (!code && !tipoRaw && !clinicaRaw && cellText(pctRaw) === "") {
            continue;
          }

          if (isTemplateNoteRow(code) || isTemplateNoteRow(tipoRaw)) {
            continue;
          }

          if (!code) {
            issues.push({
              sheet: "Coberturas",
              row: rowNumber,
              message: "Falta codigo_unico.",
            });
            continue;
          }

          const tipo = tipoRaw
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          if (tipo !== "hospitalaria" && tipo !== "ambulatoria") {
            issues.push({
              sheet: "Coberturas",
              row: rowNumber,
              message: `tipo_cobertura inválido: "${tipoRaw}".`,
            });
            continue;
          }

          const clinic = resolveClinic(clinicaRaw);
          if (!clinic) {
            issues.push({
              sheet: "Coberturas",
              row: rowNumber,
              message: `Clínica no reconocida: "${clinicaRaw}".`,
            });
            continue;
          }

          const percentage = cellNumber(pctRaw);
          if (
            percentage == null ||
            !ALLOWED_PERCENTAGES.has(Math.round(percentage))
          ) {
            issues.push({
              sheet: "Coberturas",
              row: rowNumber,
              message: `Porcentaje inválido: "${cellText(pctRaw)}" (usa 40–100).`,
            });
            continue;
          }

          const list = coverageByCode.get(code) ?? [];
          list.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            percentage: Math.round(percentage),
            type: tipo,
            rowNumber,
          });
          coverageByCode.set(code, list);
        }
      }
    }
  }

  const rows: ParsedPlanBulkRow[] = [];
  const seenCodes = new Map<string, number>();

  for (let i = 1; i < planesMatrix.length; i += 1) {
    const row = planesMatrix[i] ?? [];
    const sheetRow = i + 1;
    const actionRaw = cellText(row[accionCol]);
    const uniqueCode = cellText(row[codigoCol]);

    if (!actionRaw && !uniqueCode) continue;

    if (isTemplateNoteRow(actionRaw) || isTemplateNoteRow(uniqueCode)) {
      continue;
    }

    const warnings: string[] = [];
    const action = parseAction(actionRaw);
    if (!action) {
      issues.push({
        sheet: "Planes",
        row: sheetRow,
        message: `Acción inválida: "${actionRaw}". Usa crear, actualizar o eliminar.`,
      });
      continue;
    }

    if (!uniqueCode) {
      issues.push({
        sheet: "Planes",
        row: sheetRow,
        message: "Falta codigo_unico.",
      });
      continue;
    }

    const previous = seenCodes.get(uniqueCode);
    if (previous != null) {
      issues.push({
        sheet: "Planes",
        row: sheetRow,
        message: `codigo_unico duplicado en el Excel (también en fila ${previous}).`,
      });
      continue;
    }
    seenCodes.set(uniqueCode, sheetRow);

    if (action === "eliminar") {
      rows.push({
        action,
        uniqueCode,
        plan: null,
        updatePartial: null,
        replaceCoverage: false,
        sheetRow,
        warnings,
      });
      continue;
    }

    const isapre = isapreCol >= 0 ? cellText(row[isapreCol]) : "";
    const nombre = nombreCol >= 0 ? cellText(row[nombreCol]) : "";
    const precio = precioCol >= 0 ? cellNumber(row[precioCol]) : null;
    const tipoRaw = tipoCol >= 0 ? cellText(row[tipoCol]) : "";
    const notas = notasCol >= 0 ? cellText(row[notasCol]) || null : null;
    const gesOverride = gesCol >= 0 ? cellNumber(row[gesCol]) : null;
    const { zones, error: zoneError } = collectZones(row, planesHeaders);

    if (action === "crear") {
      if (!isapre) {
        issues.push({
          sheet: "Planes",
          row: sheetRow,
          message: "crear requiere isapre.",
        });
        continue;
      }
      if (!ISAPRE_LABELS.has(isapre.toLowerCase())) {
        issues.push({
          sheet: "Planes",
          row: sheetRow,
          message: `Isapre no válida: "${isapre}".`,
        });
        continue;
      }
      if (!nombre) {
        issues.push({
          sheet: "Planes",
          row: sheetRow,
          message: "crear requiere nombre_plan.",
        });
        continue;
      }
      if (precio == null || precio < 0) {
        issues.push({
          sheet: "Planes",
          row: sheetRow,
          message: "crear requiere precio_base_uf numérico ≥ 0.",
        });
        continue;
      }
      const planType = parsePlanType(tipoRaw);
      if (!planType) {
        issues.push({
          sheet: "Planes",
          row: sheetRow,
          message: `crear requiere tipo_plan válido (Preferente, Libre Elección o Cerrado).`,
        });
        continue;
      }
      if (zoneError) {
        issues.push({ sheet: "Planes", row: sheetRow, message: zoneError });
        continue;
      }

      const covRaw = coverageByCode.get(uniqueCode) ?? [];
      const coverage: CoverageEntry[] = covRaw.map((entry) => ({
        clinic_id: entry.clinicId,
        clinic_name: entry.clinicName,
        percentage: entry.percentage,
        type: entry.type,
      }));

      const plan: HealthPlan = {
        isapre,
        plan_name: nombre,
        unique_code: uniqueCode,
        base_price_uf: precio,
        ges_premium_uf:
          gesOverride != null && gesOverride > 0
            ? gesOverride
            : resolveGesForIsapreName(isapre),
        plan_type: planType,
        has_top: resolveHasTopFromPlanType(planType),
        additional_notes: notas,
        pdf_url: null,
        pdf_public_id: null,
        zones,
        coverage,
      };

      if (covRaw.length === 0) {
        warnings.push("Sin filas en Coberturas; el plan se creará sin prestadores.");
      }

      rows.push({
        action,
        uniqueCode,
        plan,
        updatePartial: null,
        replaceCoverage: true,
        sheetRow,
        warnings,
      });
      continue;
    }

    // actualizar — campos opcionales (parcial); cobertura solo si hay filas
    if (isapre && !ISAPRE_LABELS.has(isapre.toLowerCase())) {
      issues.push({
        sheet: "Planes",
        row: sheetRow,
        message: `Isapre no válida: "${isapre}".`,
      });
      continue;
    }

    let planType: PlanTypeId | null = null;
    if (tipoRaw) {
      planType = parsePlanType(tipoRaw);
      if (!planType) {
        issues.push({
          sheet: "Planes",
          row: sheetRow,
          message: `tipo_plan inválido: "${tipoRaw}".`,
        });
        continue;
      }
    }

    if (zoneError) {
      issues.push({ sheet: "Planes", row: sheetRow, message: zoneError });
      continue;
    }

    if (precio != null && precio < 0) {
      issues.push({
        sheet: "Planes",
        row: sheetRow,
        message: "precio_base_uf debe ser ≥ 0.",
      });
      continue;
    }

    const covRaw = coverageByCode.get(uniqueCode) ?? [];
    const coverage: CoverageEntry[] = covRaw.map((entry) => ({
      clinic_id: entry.clinicId,
      clinic_name: entry.clinicName,
      percentage: entry.percentage,
      type: entry.type,
    }));

    const draftIsapre = isapre || "Consalud";
    const draftType = planType ?? "free_choice";
    const plan: HealthPlan = {
      isapre: draftIsapre,
      plan_name: nombre || uniqueCode,
      unique_code: uniqueCode,
      base_price_uf: precio ?? 0,
      ges_premium_uf:
        gesOverride != null && gesOverride > 0
          ? gesOverride
          : resolveGesForIsapreName(draftIsapre),
      plan_type: draftType,
      has_top: resolveHasTopFromPlanType(draftType),
      additional_notes: notas,
      pdf_url: null,
      pdf_public_id: null,
      zones,
      coverage,
    };

    const zonesFilled = zones.length > 0;

    rows.push({
      action,
      uniqueCode,
      plan,
      updatePartial: {
        isapre: isapre || null,
        planName: nombre || null,
        basePriceUf: precio,
        gesPremiumUf:
          gesOverride != null && gesOverride > 0 ? gesOverride : null,
        planType,
        notesProvided: Boolean(notas),
        notes: notas,
        zonesProvided: zonesFilled,
        zones,
      },
      replaceCoverage: covRaw.length > 0,
      sheetRow,
      warnings,
    });
  }

  // Orphan coverages (code not in Planes)
  const planCodes = new Set(rows.map((r) => r.uniqueCode));
  for (const [code, list] of coverageByCode) {
    if (!planCodes.has(code)) {
      for (const entry of list) {
        issues.push({
          sheet: "Coberturas",
          row: entry.rowNumber,
          message: `codigo_unico "${code}" no aparece en la hoja Planes.`,
        });
      }
    }
  }

  return { rows, issues };
}
