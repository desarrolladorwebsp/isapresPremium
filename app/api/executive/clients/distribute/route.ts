import { AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED, MANUAL_ASSIGNMENT_MESSAGE } from "@/lib/client-pipeline/assignment-policy";
import { NextResponse } from "next/server";
import { distributeUnassignedClients } from "@/lib/api/lead-assignment";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    if (!AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED) {
      return NextResponse.json({ error: MANUAL_ASSIGNMENT_MESSAGE, code: "AUTOMATIC_ASSIGNMENT_PAUSED" }, { status: 409 });
    }
    const result = await distributeUnassignedClients();

    return NextResponse.json({
      message:
        result.assigned > 0
          ? `Se asignaron ${result.assigned} cliente(s) automáticamente.`
          : result.remaining > 0
            ? "No hay ejecutivos elegibles para asignar clientes pendientes."
            : "No hay clientes pendientes de asignación.",
      ...result,
    });
  } catch (error) {
    console.error("POST /api/executive/clients/distribute", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
