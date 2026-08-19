import { NextResponse } from "next/server";
import { assignUserToExecutive, readUserById } from "@/lib/api/user-store";
import { apiErrorResponse, parseJsonBody, ApiError } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession, assertSessionStaffSection } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { canBrowseAllClientsAsExecutive } from "@/lib/auth/staff-role";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { realm, user: sessionUser } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, sessionUser, "clientes");

    const isAdmin = realm === AUTH_REALM.admin;
    const executiveKind =
      realm === AUTH_REALM.executive
        ? (sessionUser as ExecutiveSessionUser).executiveKind
        : null;

    if (!isAdmin && !canBrowseAllClientsAsExecutive(executiveKind)) {
      throw new ApiError(
        "No tienes permiso para reasignar clientes.",
        403,
        "FORBIDDEN",
      );
    }

    const { id } = await context.params;
    const payload = (await parseJsonBody(request)) as Record<string, unknown>;

    const client = await readUserById(id);
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    if (payload.assignedExecutiveId !== undefined) {
      const assignedExecutiveId =
        payload.assignedExecutiveId === null
          ? null
          : typeof payload.assignedExecutiveId === "string"
            ? payload.assignedExecutiveId
            : null;

      const updated = await assignUserToExecutive(id, assignedExecutiveId);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Sin cambios válidos." }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/users/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
