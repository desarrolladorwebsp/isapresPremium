import { NextResponse } from "next/server";
import { assignClientPlan } from "@/lib/api/client-plan-store";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import {
  assertSessionStaffSection,
  requireExecutiveOrAdminSession,
} from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { AssignClientPlanInput } from "@/types/client-plan";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseAssignPayload(payload: unknown): AssignClientPlanInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Datos inválidos.");
  }
  const data = payload as Record<string, unknown>;
  if (typeof data.planCode !== "string" || !data.planCode.trim()) {
    throw new Error("Debes indicar el código del plan.");
  }
  return {
    planCode: data.planCode,
    notes: typeof data.notes === "string" ? data.notes : null,
    setAsChosen:
      typeof data.setAsChosen === "boolean" ? data.setAsChosen : undefined,
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(realm, user, "clientes");
    const { id } = await context.params;
    const payload = await parseJsonBody(request);
    const input = parseAssignPayload(payload);

    const updated = await assignClientPlan(id, input, {
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
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error("POST /api/executive/clients/[id]/assigned-plans", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
