import { NextResponse } from "next/server";
import { unassignClientPlan } from "@/lib/api/client-plan-store";
import { apiErrorResponse } from "@/lib/api/api-error";
import {
  assertSessionStaffSection,
  requireExecutiveOrAdminSession,
} from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";

interface RouteContext {
  params: Promise<{ id: string; planCode: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id, planCode } = await context.params;

    const updated = await unassignClientPlan(
      id,
      decodeURIComponent(planCode),
      {
        executiveAccountId: user.id,
        isAdmin: realm === AUTH_REALM.admin,
        executiveKind:
          realm === AUTH_REALM.executive
            ? (user as import("@/lib/auth/types").ExecutiveSessionUser)
                .executiveKind
            : null,
        actor: {
          realm: realm === AUTH_REALM.admin ? "admin" : "executive",
          id: user.id,
          name: user.fullName,
        },
      },
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "DELETE /api/executive/clients/[id]/assigned-plans/[planCode]",
      error,
    );
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
