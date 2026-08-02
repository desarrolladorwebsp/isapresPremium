import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";

/** @deprecated Usar GET /api/auth/me */
export async function GET() {
  try {
    const { user } = await requireExecutiveOrAdminSession();
    return NextResponse.json({ user });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
