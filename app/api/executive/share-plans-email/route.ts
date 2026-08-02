import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  readClientRecords,
  readClientsForExecutive,
} from "@/lib/api/user-store";
import {
  ApiError,
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertStaffCanAccessSection } from "@/lib/auth/staff-role";
import { parseExecutiveSharePlansEmailInput } from "@/lib/email/executive-share-plans-schema";
import { sendExecutiveSharePlansEmail } from "@/lib/email/send-executive-share-plans";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
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
      "cotizador",
    );
    const payload = await parseJsonBody(request);
    const input = parseExecutiveSharePlansEmailInput(payload);

    const clients =
      realm === AUTH_REALM.admin
        ? await readClientRecords()
        : await readClientsForExecutive(user.id);

    const client = clients.find((row) => row.id === input.clientId);
    if (!client) {
      throw new ApiError("Cliente no encontrado o sin acceso.", 404);
    }

    const clientEmail = client.email.trim();
    if (!EMAIL_RE.test(clientEmail)) {
      throw new ApiError(
        "El cliente seleccionado no tiene un correo válido.",
        400,
      );
    }

    const result = await sendExecutiveSharePlansEmail({
      ...input,
      clientFullName: client.fullName,
      clientEmail,
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
      email: clientEmail,
      planCount: input.plans.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const { body, status } = apiErrorResponse(
        new ApiError("Datos de correo inválidos.", 400),
      );
      return NextResponse.json(body, { status });
    }

    console.error("POST /api/executive/share-plans-email", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
