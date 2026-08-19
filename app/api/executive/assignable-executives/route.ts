import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/api-error";
import { listStaffAccounts } from "@/lib/auth/account-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { canBrowseAllClientsAsExecutive } from "@/lib/auth/staff-role";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

/**
 * Lista de ejecutivos/admins activos para el selector de reasignación de
 * clientes. Acceso: Admin, Ejecutivo Isapres Premium y Ejecutivo Zoom
 * (mismos roles que pueden navegar la cartera completa de clientes).
 */
export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const isAdmin = realm === AUTH_REALM.admin;
    const executiveKind =
      realm === AUTH_REALM.executive
        ? (user as ExecutiveSessionUser).executiveKind
        : null;

    if (!isAdmin && !canBrowseAllClientsAsExecutive(executiveKind)) {
      throw new ApiError(
        "No tienes permiso para reasignar clientes.",
        403,
        "FORBIDDEN",
      );
    }

    const accounts = await listStaffAccounts();
    const assignable = accounts.filter((account) => {
      if (!account.active) return false;
      // Membresía: solo cotizador — jamás en selectores de asignación de clientes.
      if (account.executiveKind === "MEMBRESIA_ISAPRES_PREMIUM") return false;
      if (account.realm === "admin") return true;
      return (
        account.realm === "executive" && account.onboardingCompleted !== false
      );
    });

    return NextResponse.json({ accounts: assignable });
  } catch (error) {
    console.error("GET /api/executive/assignable-executives", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
