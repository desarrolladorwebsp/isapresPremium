import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { uploadPlanPdfAndSync } from "@/lib/api/plan-pdf-upload";
import { requireAdminSession } from "@/lib/auth/require-auth";
import type { PlanPdfBatchUploadResponse } from "@/types/plan-pdf-upload";

export const runtime = "nodejs";

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  return !["0", "false", "no"].includes(normalized);
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const formData = await request.formData();

    const allowReplace = parseBoolean(formData.get("allowReplace"));
    const defaultIsapreId =
      typeof formData.get("isapreId") === "string"
        ? formData.get("isapreId")?.toString().trim() || null
        : null;
    const defaultUniqueCode =
      typeof formData.get("uniqueCode") === "string"
        ? formData.get("uniqueCode")?.toString().trim() || null
        : null;

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    const singleFile = formData.get("file");
    if (singleFile instanceof File) {
      files.unshift(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Debes enviar al menos un archivo PDF." },
        { status: 400 },
      );
    }

    const results = [];

    for (const file of files) {
      if (file.type && file.type !== "application/pdf") {
        results.push({
          ok: false as const,
          fileName: file.name,
          error: "Solo se permiten archivos PDF.",
        });
        continue;
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const perFileUniqueCode = defaultUniqueCode;
      const perFileIsapreId = defaultIsapreId;

      results.push(
        await uploadPlanPdfAndSync({
          fileBuffer,
          mimeType: file.type || "application/pdf",
          fileName: file.name,
          uniqueCode: perFileUniqueCode,
          isapreId: perFileIsapreId,
          allowReplace,
        }),
      );
    }

    const response: PlanPdfBatchUploadResponse = {
      results,
      uploaded: results.filter((item) => item.ok).length,
      replaced: results.filter((item) => item.ok && item.replaced).length,
      failed: results.filter((item) => !item.ok).length,
    };

    const status = response.uploaded > 0 ? 201 : 422;
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error("POST /api/admin/plan-pdf-upload", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
