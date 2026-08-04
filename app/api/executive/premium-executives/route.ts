import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/api-error";
import { listPremiumExecutivesForRedirect } from "@/lib/api/client-pipeline-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { canUseZoomExecutiveWorkflow } from "@/lib/auth/staff-role";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

/**
 * Lista ejecutivos Isapres Premium elegibles para redirección del flujo Zoom.
 * Acceso: Admin, Ejecutivo Zoom, o Ejecutivo Isapres Premium (adaptación).
 * Incluye administradores activos como destino operativo.
 */
export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const isAdmin = realm === AUTH_REALM.admin;
    const executiveKind =
      realm === AUTH_REALM.executive
        ? (user as ExecutiveSessionUser).executiveKind
        : null;

    if (!isAdmin && !canUseZoomExecutiveWorkflow(executiveKind)) {
      throw new ApiError(
        "No tienes permiso para listar ejecutivos Isapres Premium.",
        403,
        "FORBIDDEN",
      );
    }

    const executives = await listPremiumExecutivesForRedirect();
    return NextResponse.json({ executives });
  } catch (error) {
    console.error("GET /api/executive/premium-executives", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
