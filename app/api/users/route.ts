import { NextResponse } from "next/server";
import { readUsers } from "@/lib/api/user-store";
import type { UserRole } from "@/types/user";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { apiErrorResponse } from "@/lib/api/api-error";

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    if (roleParam && roleParam !== "CLIENT") {
      return NextResponse.json(
        {
          error:
            "Este endpoint solo lista clientes del cotizador. Usa /api/admin/accounts para staff.",
        },
        { status: 400 },
      );
    }

    const users = await readUsers("CLIENT" satisfies UserRole);
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
