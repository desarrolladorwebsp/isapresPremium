import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { savePlanPdf } from "@/lib/plan-pdf-storage/upload";
import { requireAdminSession } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const uniqueCode = formData.get("uniqueCode");
    const isapre = formData.get("isapre");
    const previousStoragePath = formData.get("previousStoragePath");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes enviar un archivo PDF en el campo file." },
        { status: 400 },
      );
    }

    if (typeof uniqueCode !== "string" || uniqueCode.trim().length === 0) {
      return NextResponse.json(
        { error: "El código único del plan es obligatorio." },
        { status: 400 },
      );
    }

    if (typeof isapre !== "string" || isapre.trim().length === 0) {
      return NextResponse.json(
        { error: "La Isapre es obligatoria para organizar el PDF." },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const result = await savePlanPdf({
      fileBuffer,
      isapre,
      uniqueCode,
      mimeType: file.type,
      previousStoragePath:
        typeof previousStoragePath === "string" &&
        previousStoragePath.trim().length > 0
          ? previousStoragePath
          : null,
    });

    return NextResponse.json(
      {
        ...result,
        publicId: result.storagePath,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/plans/pdf", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
