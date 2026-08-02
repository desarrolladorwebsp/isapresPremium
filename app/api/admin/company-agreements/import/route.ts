import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { importCompanyAgreementsFromWorkbook } from "@/lib/api/company-agreements-admin";
import { requireAdminSession } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function hasAllowedExcelExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const formData = await request.formData();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes enviar un archivo Excel (.xlsx o .xls)." },
        { status: 400 },
      );
    }

    if (!hasAllowedExcelExtension(file.name)) {
      return NextResponse.json(
        { error: "Solo se permiten archivos .xlsx, .xls o .csv." },
        { status: 400 },
      );
    }

    const isapreId =
      typeof formData.get("isapreId") === "string"
        ? formData.get("isapreId")?.toString().trim() || ""
        : "";

    const discountRaw =
      typeof formData.get("discountPercent") === "string"
        ? formData.get("discountPercent")?.toString().trim()
        : "";
    const discountPercent =
      discountRaw && Number.isFinite(Number(discountRaw))
        ? Number(discountRaw)
        : null;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const result = await importCompanyAgreementsFromWorkbook({
      fileBuffer,
      fileName: file.name,
      isapreId,
      discountPercent,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/company-agreements/import", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
