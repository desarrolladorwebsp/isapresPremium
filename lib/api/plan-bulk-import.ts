import { ApiError } from "@/lib/api/api-error";
import {
  createPlanRecord,
  deletePlanRecord,
  readClinics,
  readPlanByCode,
  updatePlanRecord,
} from "@/lib/api/data-store";
import { resolveHasTopFromPlanType } from "@/lib/plan-metadata";
import {
  parsePlanBulkWorkbook,
  type PlanBulkUpdatePartial,
  type ParsedPlanBulkRow,
} from "@/lib/plans/parse-bulk-workbook";
import type {
  PlanBulkImportIssue,
  PlanBulkImportResult,
} from "@/types/plan-bulk-import";
import type { HealthPlan } from "@/types/plan";

function mergeUpdate(
  existing: HealthPlan,
  row: ParsedPlanBulkRow,
): HealthPlan {
  const partial = row.updatePartial as PlanBulkUpdatePartial;
  const nextType = partial.planType ?? existing.plan_type;
  const nextIsapre = partial.isapre ?? existing.isapre;

  return {
    ...existing,
    isapre: nextIsapre,
    plan_name: partial.planName ?? existing.plan_name,
    base_price_uf:
      partial.basePriceUf != null
        ? partial.basePriceUf
        : existing.base_price_uf,
    ges_premium_uf:
      partial.gesPremiumUf != null
        ? partial.gesPremiumUf
        : existing.ges_premium_uf,
    plan_type: nextType,
    has_top: resolveHasTopFromPlanType(nextType),
    additional_notes: partial.notesProvided
      ? partial.notes
      : existing.additional_notes,
    zones: partial.zonesProvided ? partial.zones : existing.zones,
    coverage: row.replaceCoverage
      ? (row.plan?.coverage ?? [])
      : existing.coverage,
    // Conserva PDF adjunto en actualizar.
    pdf_url: existing.pdf_url,
    pdf_public_id: existing.pdf_public_id,
  };
}

async function validateAgainstDb(
  rows: ParsedPlanBulkRow[],
): Promise<PlanBulkImportIssue[]> {
  const issues: PlanBulkImportIssue[] = [];

  for (const row of rows) {
    const existing = await readPlanByCode(row.uniqueCode);

    if (row.action === "crear") {
      if (existing) {
        issues.push({
          sheet: "Planes",
          row: row.sheetRow,
          code: row.uniqueCode,
          message: `Ya existe un plan con código "${row.uniqueCode}". Usa actualizar.`,
        });
      }
      continue;
    }

    if (row.action === "actualizar" || row.action === "eliminar") {
      if (!existing) {
        issues.push({
          sheet: "Planes",
          row: row.sheetRow,
          code: row.uniqueCode,
          message: `No existe un plan con código "${row.uniqueCode}".`,
        });
      }
    }
  }

  return issues;
}

/**
 * Importa planes desde la plantilla Excel (hojas Planes + Coberturas).
 * Falla completo si hay errores de parseo o de validación contra BD.
 */
export async function importPlansFromWorkbook(input: {
  fileBuffer: Buffer;
  fileName: string;
}): Promise<PlanBulkImportResult> {
  const clinics = await readClinics();

  let parsed;
  try {
    parsed = parsePlanBulkWorkbook(input.fileBuffer, clinics);
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? error.message
        : "No se pudo leer el archivo Excel de planes.",
      400,
    );
  }

  if (parsed.issues.length > 0) {
    const preview = parsed.issues
      .slice(0, 8)
      .map((issue) => `${issue.sheet} fila ${issue.row}: ${issue.message}`)
      .join(" · ");
    const more =
      parsed.issues.length > 8
        ? ` (+${parsed.issues.length - 8} más)`
        : "";
    throw new ApiError(
      `El Excel tiene ${parsed.issues.length} error(es). ${preview}${more}`,
      400,
    );
  }

  if (parsed.rows.length === 0) {
    throw new ApiError(
      "No se encontraron filas válidas en la hoja Planes (acción + codigo_unico).",
      400,
    );
  }

  const dbIssues = await validateAgainstDb(parsed.rows);
  if (dbIssues.length > 0) {
    const preview = dbIssues
      .slice(0, 8)
      .map(
        (issue) =>
          `${issue.sheet ?? "Planes"} fila ${issue.row}: ${issue.message}`,
      )
      .join(" · ");
    const more =
      dbIssues.length > 8 ? ` (+${dbIssues.length - 8} más)` : "";
    throw new ApiError(
      `Validación contra catálogo: ${dbIssues.length} error(es). ${preview}${more}`,
      400,
    );
  }

  const sourceFile =
    input.fileName.split(/[/\\]/).pop()?.trim() || "import.xlsx";
  const warnings: string[] = [];
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const row of parsed.rows) {
    for (const warning of row.warnings) {
      warnings.push(`Fila ${row.sheetRow} (${row.uniqueCode}): ${warning}`);
    }

    if (row.action === "eliminar") {
      await deletePlanRecord(row.uniqueCode);
      deleted += 1;
      continue;
    }

    if (row.action === "crear") {
      if (!row.plan) {
        throw new ApiError(
          `Fila ${row.sheetRow}: plan incompleto para crear.`,
          400,
        );
      }
      await createPlanRecord(row.plan);
      created += 1;
      continue;
    }

    // actualizar
    const existing = await readPlanByCode(row.uniqueCode);
    if (!existing || !row.updatePartial) {
      throw new ApiError(
        `Fila ${row.sheetRow}: no se pudo actualizar "${row.uniqueCode}".`,
        400,
      );
    }

    const merged = mergeUpdate(existing, row);
    await updatePlanRecord(merged);
    updated += 1;
  }

  return {
    ok: true,
    sourceFile,
    processed: parsed.rows.length,
    created,
    updated,
    deleted,
    warnings,
  };
}
