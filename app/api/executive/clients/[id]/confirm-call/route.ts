import { NextResponse } from "next/server";
import { markClientConfirmationCall } from "@/lib/api/client-pipeline-store";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession, assertSessionStaffSection } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/executive/clients/[id]/confirm-call
 * Marca el llamado de confirmación Zoom como realizado.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as {
      outcome?: string | null;
    };

    const updated = await markClientConfirmationCall(
      id,
      { outcome: payload.outcome },
      {
        executiveAccountId: user.id,
        isAdmin: realm === AUTH_REALM.admin,
      },
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/executive/clients/[id]/confirm-call", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
