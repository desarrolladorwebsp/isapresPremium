import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import { readAdminById } from "@/lib/auth/account-store";
import { DEFAULT_EXECUTIVE_KIND } from "@/lib/auth/staff-role";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { createStaffInvite } from "@/lib/auth/staff-invite-store";
import { isValidRut, formatRut } from "@/lib/auth/rut";
import { sendStaffActivationEmail } from "@/lib/email/send-staff-invite";
import { listPendingStaffInvites } from "@/lib/auth/staff-invite-store";
import { listStaffAccounts } from "@/lib/auth/account-store";
import type {
  CreateStaffAccountInput,
  ExecutiveKind,
  StaffRealm,
} from "@/types/staff-account";
import { isExecutiveKind } from "@/types/staff-account";

function isValidCreateInput(payload: unknown): payload is CreateStaffAccountInput {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;

  if (
    !(data.realm === "admin" || data.realm === "executive") ||
    typeof data.email !== "string" ||
    data.email.trim().length === 0 ||
    (data.rut !== undefined && typeof data.rut !== "string")
  ) {
    return false;
  }

  if (data.realm === "admin") {
    return data.executiveKind === undefined || data.executiveKind === null;
  }

  if (data.executiveKind === undefined || data.executiveKind === null) {
    return true;
  }

  return isExecutiveKind(data.executiveKind);
}

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const [accounts, pendingInvites] = await Promise.all([
      listStaffAccounts(),
      listPendingStaffInvites(),
    ]);
    return NextResponse.json({ accounts, pendingInvites });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminSession(request);
    const payload = await parseJsonBody(request);

    if (!isValidCreateInput(payload)) {
      return NextResponse.json(
        { error: "Datos de invitación inválidos." },
        { status: 400 },
      );
    }

    const rutRaw = payload.rut?.trim();

    if (rutRaw && !isValidRut(rutRaw)) {
      return NextResponse.json({ error: "El RUT no es válido." }, { status: 400 });
    }

    const realm = payload.realm as StaffRealm;
    const executiveKind: ExecutiveKind | null =
      realm === "executive"
        ? (payload.executiveKind && isExecutiveKind(payload.executiveKind)
            ? payload.executiveKind
            : DEFAULT_EXECUTIVE_KIND)
        : null;

    const admin = await readAdminById(session.sub);
    const { token, invite } = await createStaffInvite({
      email: payload.email,
      realm,
      executiveKind,
      rut: rutRaw ? formatRut(rutRaw) : undefined,
      invitedByAdminId: admin?.id,
    });

    await sendStaffActivationEmail({
      email: payload.email.trim().toLowerCase(),
      realm,
      executiveKind,
      activationToken: token,
      rut: rutRaw ? formatRut(rutRaw) : null,
      request,
    });

    return NextResponse.json(
      {
        message:
          "Invitación enviada. La persona debe abrir el enlace del correo para crear su cuenta.",
        pendingInvite: invite,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/accounts", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
