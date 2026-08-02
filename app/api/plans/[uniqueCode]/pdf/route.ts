import { getDownloadUrl } from "@vercel/blob";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { readPlanByCode } from "@/lib/api/data-store";
import { buildPlanPdfFileName } from "@/lib/pdf-filename";
import {
  isVercelBlobUrl,
  resolveBlobPlanPdfDownloadUrl,
} from "@/lib/plan-pdf-storage/blob";
import {
  collectPlanPdfCleanupKeys,
  resolveStoredPlanPdfStorageKey,
} from "@/lib/plan-pdf-storage/paths";
import {
  planPdfFileExistsAsync,
  readPlanPdfFile,
} from "@/lib/plan-pdf-storage/read";
import { useVercelBlobStorage } from "@/lib/plan-pdf-storage/provider";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ uniqueCode: string }>;
}

function wantsInline(request: Request): boolean {
  const value = new URL(request.url).searchParams.get("inline");
  return value === "1" || value === "true";
}

function buildPdfResponse(
  fileBuffer: Buffer,
  fileName: string,
  inline: boolean,
): NextResponse {
  const disposition = inline
    ? `inline; filename="${fileName}"`
    : `attachment; filename="${fileName}"`;

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fileBuffer.byteLength),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function fetchPdfBufferFromUrl(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function resolveStorageKeyForPlan(plan: {
  isapre: string;
  unique_code: string;
  pdf_public_id: string | null;
}): Promise<string | null> {
  const candidateKeys = collectPlanPdfCleanupKeys(
    plan.isapre,
    plan.unique_code,
    plan.pdf_public_id,
  );

  for (const key of candidateKeys) {
    if (await planPdfFileExistsAsync(key)) {
      return key;
    }
  }

  const fallbackKey = resolveStoredPlanPdfStorageKey(
    plan.pdf_public_id,
    plan.isapre,
    plan.unique_code,
  );

  if (fallbackKey && (await planPdfFileExistsAsync(fallbackKey))) {
    return fallbackKey;
  }

  return null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const inline = wantsInline(request);
    const { uniqueCode } = await context.params;
    const decodedCode = decodeURIComponent(uniqueCode);
    const plan = await readPlanByCode(decodedCode);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado." },
        { status: 404 },
      );
    }

    const fileName = buildPlanPdfFileName(plan.unique_code);
    const directUrl = plan.pdf_url?.trim();

    // Blob URL directa en BD.
    if (directUrl && isVercelBlobUrl(directUrl)) {
      if (inline) {
        // No redirigir: el redirect a Blob rompe el embed en iframe.
        const buffer = await fetchPdfBufferFromUrl(directUrl);
        if (!buffer) {
          return NextResponse.json(
            { error: "No se pudo cargar el PDF del plan." },
            { status: 502 },
          );
        }
        return buildPdfResponse(buffer, fileName, true);
      }

      return NextResponse.redirect(getDownloadUrl(directUrl), 307);
    }

    // Blob por storage key: descarga puede redirigir a attachment URL.
    if (!inline && useVercelBlobStorage()) {
      const candidateKeys = collectPlanPdfCleanupKeys(
        plan.isapre,
        plan.unique_code,
        plan.pdf_public_id,
      );

      for (const key of candidateKeys) {
        const blobUrl = await resolveBlobPlanPdfDownloadUrl(key);
        if (blobUrl) {
          return NextResponse.redirect(blobUrl, 307);
        }
      }

      const fallbackKey = resolveStoredPlanPdfStorageKey(
        plan.pdf_public_id,
        plan.isapre,
        plan.unique_code,
      );

      if (fallbackKey) {
        const blobUrl = await resolveBlobPlanPdfDownloadUrl(fallbackKey);
        if (blobUrl) {
          return NextResponse.redirect(blobUrl, 307);
        }
      }
    }

    // Inline (o fallback local): streamear bytes same-origin.
    const storageKey = await resolveStorageKeyForPlan(plan);

    if (!storageKey) {
      return NextResponse.json(
        { error: "Este plan no tiene PDF disponible." },
        { status: 404 },
      );
    }

    const fileBuffer = await readPlanPdfFile(storageKey);
    return buildPdfResponse(fileBuffer, fileName, inline);
  } catch (error) {
    console.error("GET /api/plans/[uniqueCode]/pdf", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
