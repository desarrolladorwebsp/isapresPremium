import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/api-error";
import { listExecutivesForRedirect } from "@/lib/api/client-pipeline-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import type { ExecutiveKind } from "@/types/staff-account";
import { isExecutiveKind } from "@/types/staff-account";

/**
 * Lista ejecutivos elegibles por kind para selectores de reasignación.
 *
 * Acceso:
 * - Admin: cualquier kind
 * - Zoom: solo ISAPRES_PREMIUM
 * - Isapres Premium: ZOOM o ISAPRES
 */
export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const kindParam = new URL(request.url).searchParams.get("kind");

    if (!kindParam || !isExecutiveKind(kindParam)) {
      throw new ApiError(
        "Indica un kind válido: ZOOM, ISAPRES_PREMIUM o ISAPRES.",
        400,
        "INVALID_INPUT",
      );
    }

    const kind = kindParam as ExecutiveKind;
    const isAdmin = realm === AUTH_REALM.admin;
    const executiveKind =
      realm === AUTH_REALM.executive
        ? (user as ExecutiveSessionUser).executiveKind
        : null;

    const allowed =
      isAdmin ||
      (executiveKind === "ZOOM" && kind === "ISAPRES_PREMIUM") ||
      (executiveKind === "ISAPRES_PREMIUM" &&
        (kind === "ZOOM" || kind === "ISAPRES"));

    if (!allowed) {
      throw new ApiError(
        "No tienes permiso para listar estos ejecutivos.",
        403,
        "FORBIDDEN",
      );
    }

    const executives = await listExecutivesForRedirect(kind);
    return NextResponse.json({ executives });
  } catch (error) {
    console.error("GET /api/executive/eligible-executives", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
