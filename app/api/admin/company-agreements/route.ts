import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { listCompanyAgreementsAdmin } from "@/lib/api/company-agreements-admin";
import { requireAdminSession } from "@/lib/auth/require-auth";

export const runtime = "nodejs";

function parseOptionalBoolean(value: string | null): boolean | null {
  if (value == null || value.trim() === "" || value === "all") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "active", "activo"].includes(normalized)) return true;
  if (["0", "false", "no", "inactive", "inactivo"].includes(normalized)) {
    return false;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);

    const result = await listCompanyAgreementsAdmin({
      q: searchParams.get("q"),
      isapreId: searchParams.get("isapreId"),
      active: parseOptionalBoolean(searchParams.get("active")),
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/company-agreements", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
