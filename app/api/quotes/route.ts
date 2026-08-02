import { NextResponse } from "next/server";
import { readQuotes, readQuotesForExecutive } from "@/lib/api/quote-store";
import type { CreateQuoteInput } from "@/types/quote";
import {
  requireExecutiveOrAdminSession,
} from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertStaffCanAccessSection } from "@/lib/auth/staff-role";
import { apiErrorResponse } from "@/lib/api/api-error";
import { createQuote } from "@/lib/api/quote-store";
import { enforcePublicPostGuard } from "@/lib/security/public-post-guard";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

function isValidCreateQuoteInput(payload: unknown): payload is CreateQuoteInput {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;

  return (
    typeof data.fullName === "string" &&
    data.fullName.trim().length > 0 &&
    typeof data.email === "string" &&
    data.email.trim().length > 0 &&
    typeof data.phone === "string" &&
    data.phone.trim().length > 0
  );
}

export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);

    assertStaffCanAccessSection(
      {
        realm,
        executiveKind:
          realm === AUTH_REALM.executive
            ? (user as ExecutiveSessionUser).executiveKind
            : null,
      },
      "cotizaciones",
    );

    const quotes =
      realm === AUTH_REALM.admin
        ? await readQuotes()
        : await readQuotesForExecutive(user.id);

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("GET /api/quotes", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const blocked = enforcePublicPostGuard(request, "quote");
    if (blocked) return blocked;

    const payload = (await request.json()) as unknown;

    if (!isValidCreateQuoteInput(payload)) {
      return NextResponse.json(
        { error: "Datos de cotización inválidos." },
        { status: 400 },
      );
    }

    const quote = await createQuote(payload);
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotes", error);
    return NextResponse.json(
      { error: "No se pudo registrar la cotización." },
      { status: 500 },
    );
  }
}
