import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import {
  updateStaffAccount,
  deleteStaffAccount,
  readAdminById,
} from "@/lib/auth/account-store";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { resendStaffInviteForEmail } from "@/lib/auth/staff-invite-store";
import { sendStaffActivationEmail } from "@/lib/email/send-staff-invite";
import { prisma } from "@/lib/prisma";
import type {
  ExecutiveKind,
  StaffRealm,
  UpdateStaffAccountInput,
} from "@/types/staff-account";
import { isExecutiveKind } from "@/types/staff-account";
import type { SubscriptionStatus } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
]);

function parseRealm(value: string | null): StaffRealm | null {
  if (value === "admin" || value === "executive") return value;
  return null;
}

function isValidUpdateInput(payload: unknown): payload is UpdateStaffAccountInput {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Record<string, unknown>;

  return (
    (data.active === undefined || typeof data.active === "boolean") &&
    (data.fullName === undefined || typeof data.fullName === "string") &&
    (data.phone === undefined ||
      data.phone === null ||
      typeof data.phone === "string") &&
    (data.rut === undefined || data.rut === null || typeof data.rut === "string") &&
    (data.subscriptionStatus === undefined ||
      (typeof data.subscriptionStatus === "string" &&
        SUBSCRIPTION_STATUSES.has(data.subscriptionStatus as SubscriptionStatus))) &&
    (data.assignmentsSuspended === undefined ||
      typeof data.assignmentsSuspended === "boolean") &&
    (data.executiveKind === undefined || isExecutiveKind(data.executiveKind))
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const realm = parseRealm(new URL(request.url).searchParams.get("realm"));

    if (!realm) {
      return NextResponse.json(
        { error: "Parámetro realm inválido (admin o executive)." },
        { status: 400 },
      );
    }

    const payload = await parseJsonBody(request);

    if (!isValidUpdateInput(payload)) {
      return NextResponse.json(
        { error: "Datos de actualización inválidos." },
        { status: 400 },
      );
    }

    if (payload.executiveKind !== undefined && realm !== "executive") {
      return NextResponse.json(
        { error: "Solo se puede cambiar el tipo de rol en cuentas ejecutivas." },
        { status: 400 },
      );
    }

    const account = await updateStaffAccount(realm, id, payload);
    return NextResponse.json({ account });
  } catch (error) {
    console.error("PATCH /api/admin/accounts/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const realm = parseRealm(new URL(request.url).searchParams.get("realm"));

    if (!realm) {
      return NextResponse.json(
        { error: "Parámetro realm inválido (admin o executive)." },
        { status: 400 },
      );
    }

    await deleteStaffAccount(realm, id);
    return NextResponse.json({ ok: true, message: "Usuario eliminado." });
  } catch (error) {
    console.error("DELETE /api/admin/accounts/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { session } = await requireAdminSession(request);
    const { id } = await context.params;
    const url = new URL(request.url);
    const realm = parseRealm(url.searchParams.get("realm"));
    const action = url.searchParams.get("action");

    if (action === "cancel-pending-invite") {
      const { cancelPendingStaffInvite } = await import(
        "@/lib/auth/staff-invite-store"
      );
      await cancelPendingStaffInvite(id);
      return NextResponse.json({
        message: "Invitación cancelada.",
      });
    }

    if (action === "resend-pending-invite") {
      const invite = await prisma.staffInvite.findUnique({ where: { id } });

      if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
        return NextResponse.json(
          { error: "Invitación no encontrada o expirada." },
          { status: 404 },
        );
      }

      if (invite.realm !== "admin" && invite.realm !== "executive") {
        return NextResponse.json({ error: "Invitación inválida." }, { status: 400 });
      }

      const executiveKind: ExecutiveKind | null =
        invite.realm === "executive"
          ? (invite.executiveKind && isExecutiveKind(invite.executiveKind)
              ? invite.executiveKind
              : "ISAPRES_PREMIUM")
          : null;

      const admin = await readAdminById(session.sub);
      const { token } = await resendStaffInviteForEmail({
        email: invite.email,
        realm: invite.realm,
        executiveKind,
        rut: invite.rut ?? undefined,
        invitedByAdminId: admin?.id,
      });

      await sendStaffActivationEmail({
        email: invite.email,
        realm: invite.realm,
        executiveKind,
        activationToken: token,
        rut: invite.rut,
        request,
      });

      return NextResponse.json({
        message: "Invitación reenviada al correo del usuario.",
      });
    }

    if (!realm) {
      return NextResponse.json(
        { error: "Parámetro realm inválido (admin o executive)." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/accounts/[id]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
