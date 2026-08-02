import { NextResponse } from "next/server";
import { assignUserToExecutive, readUserById } from "@/lib/api/user-store";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const payload = (await parseJsonBody(request)) as Record<string, unknown>;

    const user = await readUserById(id);
    if (!user) {
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
