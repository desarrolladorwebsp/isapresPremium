import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import { authenticateStaff } from "@/lib/auth/account-store";
import type { LoginCredentials } from "@/lib/auth/types";

function isValidCredentials(payload: unknown): payload is LoginCredentials {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;
  return (
    typeof data.email === "string" &&
    data.email.trim().length > 0 &&
    typeof data.password === "string" &&
    data.password.length > 0
  );
}

/** @deprecated Usar POST /api/auth/login */
export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request);

    if (!isValidCredentials(payload)) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios." },
        { status: 400 },
      );
    }

    const { user } = await authenticateStaff(payload);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("POST /api/auth/executive/login", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
