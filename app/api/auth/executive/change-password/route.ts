import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import { changeStaffPassword } from "@/lib/auth/account-store";
import { requireExecutiveSession } from "@/lib/auth/require-auth";

function isValidPayload(payload: unknown): payload is {
  currentPassword: string;
  newPassword: string;
} {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;

  return (
    typeof data.currentPassword === "string" &&
    data.currentPassword.length > 0 &&
    typeof data.newPassword === "string" &&
    data.newPassword.length > 0
  );
}

export async function POST(request: Request) {
  try {
    const { session } = await requireExecutiveSession(request, {
      allowIncompleteOnboarding: true,
    });
    const payload = await parseJsonBody(request);

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { error: "Contraseña actual y nueva son obligatorias." },
        { status: 400 },
      );
    }

    const user = await changeStaffPassword(
      "executive",
      session.sub,
      payload.currentPassword,
      payload.newPassword,
    );

    return NextResponse.json({ user });
  } catch (error) {
    console.error("POST /api/auth/executive/change-password", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
