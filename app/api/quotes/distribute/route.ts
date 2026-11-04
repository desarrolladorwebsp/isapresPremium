import { AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED, MANUAL_ASSIGNMENT_MESSAGE } from "@/lib/client-pipeline/assignment-policy";
import { NextResponse } from "next/server";
import { distributeUnassignedQuotes } from "@/lib/api/quote-store";
import { apiErrorResponse } from "@/lib/api/api-error";
import { requireAdminSession } from "@/lib/auth/require-auth";

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminSession(request);
    if (!AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED) {
      return NextResponse.json({ error: MANUAL_ASSIGNMENT_MESSAGE, code: "AUTOMATIC_ASSIGNMENT_PAUSED" }, { status: 409 });
    }
    const result = await distributeUnassignedQuotes({
      realm: "admin",
      id: user.id,
      name: user.fullName,
    });

    return NextResponse.json({
      message:
        result.assigned > 0
          ? `Se asignaron ${result.assigned} lead${result.assigned === 1 ? "" : "s"} a ejecutivos.`
          : "No había leads sin asignar.",
      ...result,
    });
  } catch (error) {
    console.error("POST /api/quotes/distribute", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
