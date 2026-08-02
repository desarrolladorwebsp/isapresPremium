import { ApiError } from "@/lib/api/api-error";
import { prisma } from "@/lib/prisma";
import { resolveIsapreNameFromId } from "@/lib/isapre-catalog";
import { savePlanPdf } from "@/lib/plan-pdf-storage/upload";
import type { PlanPdfUploadItemResult } from "@/types/plan-pdf-upload";

export function extractUniqueCodeFromPdfFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;

  return baseName
    .replace(/\.pdf$/i, "")
    .replace(/\s*\(\d+\)$/, "")
    .trim();
}

interface MatchedPlan {
  uniqueCode: string;
  planName: string;
  isapreId: string;
  pdfUrl: string | null;
  pdfPublicId: string | null;
  isapreRef: { name: string };
}

type PlanMatchResult =
  | {
      status: "matched";
      plan: MatchedPlan;
      uniqueCode: string;
      detectedFromFileName: boolean;
    }
  | {
      status: "not_found";
      uniqueCode: string;
    }
  | {
      status: "ambiguous";
      uniqueCode: string;
      candidates: MatchedPlan[];
    }
  | {
      status: "missing_code";
      uniqueCode: string;
    };

async function findPlanForPdfUpload(input: {
  uniqueCode?: string | null;
  fileName?: string | null;
  isapreId?: string | null;
}): Promise<PlanMatchResult> {
  const explicitCode = input.uniqueCode?.trim() ?? "";
  const fromFileName = input.fileName
    ? extractUniqueCodeFromPdfFileName(input.fileName)
    : "";
  const uniqueCode = explicitCode || fromFileName;

  if (!uniqueCode) {
    return { status: "missing_code", uniqueCode: "" };
  }

  const plans = await prisma.plan.findMany({
    where: {
      uniqueCode: { equals: uniqueCode, mode: "insensitive" },
      ...(input.isapreId?.trim() ? { isapreId: input.isapreId.trim() } : {}),
    },
    select: {
      uniqueCode: true,
      planName: true,
      isapreId: true,
      pdfUrl: true,
      pdfPublicId: true,
      isapreRef: { select: { name: true } },
    },
  });

  if (plans.length === 0) {
    return { status: "not_found", uniqueCode };
  }

  if (plans.length === 1) {
    return {
      status: "matched",
      plan: plans[0],
      uniqueCode: plans[0].uniqueCode,
      detectedFromFileName: !explicitCode,
    };
  }

  return {
    status: "ambiguous",
    uniqueCode,
    candidates: plans,
  };
}

function toCandidateList(candidates: MatchedPlan[]) {
  return candidates.map((plan) => ({
    uniqueCode: plan.uniqueCode,
    planName: plan.planName,
    isapre: plan.isapreRef.name,
    isapreId: plan.isapreId,
  }));
}

export async function uploadPlanPdfAndSync(input: {
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  uniqueCode?: string | null;
  isapreId?: string | null;
  allowReplace?: boolean;
}): Promise<PlanPdfUploadItemResult> {
  const fileName = input.fileName.trim() || "documento.pdf";

  try {
    const match = await findPlanForPdfUpload({
      uniqueCode: input.uniqueCode,
      fileName,
      isapreId: input.isapreId,
    });

    if (match.status === "missing_code") {
      return {
        ok: false,
        fileName,
        error:
          "No se pudo detectar el código del plan. Usa un nombre como 13-SF1001-26.pdf o indica el código manualmente.",
      };
    }

    if (match.status === "not_found") {
      return {
        ok: false,
        fileName,
        uniqueCode: match.uniqueCode,
        error: `No existe un plan en la base de datos con el código ${match.uniqueCode}.`,
      };
    }

    if (match.status === "ambiguous") {
      return {
        ok: false,
        fileName,
        uniqueCode: match.uniqueCode,
        error:
          "Hay más de un plan con ese código. Indica la Isapre al subir el PDF.",
        candidates: toCandidateList(match.candidates),
      };
    }

    const { plan, detectedFromFileName } = match;
    const hadPdf = Boolean(plan.pdfUrl?.trim());

    if (hadPdf && input.allowReplace === false) {
      return {
        ok: false,
        fileName,
        uniqueCode: plan.uniqueCode,
        error: `El plan ${plan.uniqueCode} ya tiene PDF cargado.`,
      };
    }

    const isapreName = resolveIsapreNameFromId(plan.isapreId);
    const uploaded = await savePlanPdf({
      fileBuffer: input.fileBuffer,
      isapre: isapreName,
      uniqueCode: plan.uniqueCode,
      mimeType: input.mimeType,
      previousStoragePath: plan.pdfPublicId,
    });

    await prisma.plan.update({
      where: { uniqueCode: plan.uniqueCode },
      data: {
        pdfUrl: uploaded.url,
        pdfPublicId: uploaded.storagePath,
      },
    });

    return {
      ok: true,
      fileName,
      uniqueCode: plan.uniqueCode,
      planName: plan.planName,
      isapre: plan.isapreRef.name,
      isapreId: plan.isapreId,
      replaced: hadPdf,
      detectedFromFileName,
      storagePath: uploaded.storagePath,
      url: uploaded.url,
      backend: uploaded.backend,
      bytes: uploaded.bytes,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        fileName,
        error: error.message,
      };
    }

    return {
      ok: false,
      fileName,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo subir el PDF del plan.",
    };
  }
}
