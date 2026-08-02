import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import {
  hashPassword,
  normalizeEmail,
  validatePasswordStrength,
} from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { EXECUTIVE_ONBOARDING_PATH } from "@/lib/auth/constants";
import {
  DEFAULT_EXECUTIVE_KIND,
  normalizeExecutiveKind,
  staffRealmToRole,
} from "@/lib/auth/staff-role";
import { formatRut, isValidRut, normalizeRut, rutMatches } from "@/lib/auth/rut";
import type { ExecutiveKind, StaffRealm } from "@/types/staff-account";
import { isExecutiveKind } from "@/types/staff-account";
import type { SubscriptionStatus } from "@prisma/client";

const INVITE_TTL_DAYS = 7;

export interface StaffInvitePublic {
  email: string;
  realm: StaffRealm;
  executiveKind: ExecutiveKind | null;
  rut: string | null;
  expiresAt: string;
}

export interface ActivateStaffAccountInput {
  token: string;
  firstName?: string;
  lastName?: string;
  rut: string;
  password: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

function isValidRealm(value: string): value is StaffRealm {
  return value === "admin" || value === "executive";
}

function resolveInviteExecutiveKind(
  realm: StaffRealm,
  kind: ExecutiveKind | null | undefined,
): ExecutiveKind | null {
  if (realm === "admin") return null;
  return normalizeExecutiveKind(kind);
}

export async function createStaffInvite(input: {
  email: string;
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
  rut?: string;
  invitedByAdminId?: string;
}): Promise<{
  token: string;
  inviteId: string;
  invite: {
    id: string;
    email: string;
    realm: StaffRealm;
    executiveKind: ExecutiveKind | null;
    rut: string | null;
    expiresAt: string;
    createdAt: string;
  };
}> {
  const email = normalizeEmail(input.email);
  const rut = input.rut?.trim() ? formatRut(input.rut) : null;

  if (rut && !isValidRut(rut)) {
    throw new ApiError("El RUT indicado no es válido.", 400, "INVALID_RUT");
  }

  if (input.realm === "executive") {
    const kind = input.executiveKind ?? DEFAULT_EXECUTIVE_KIND;
    if (!isExecutiveKind(kind)) {
      throw new ApiError("Tipo de ejecutivo inválido.", 400, "INVALID_EXECUTIVE_KIND");
    }
  }

  if (input.realm === "admin" && input.executiveKind) {
    throw new ApiError(
      "Un administrador no puede tener tipo de ejecutivo.",
      400,
      "INVALID_EXECUTIVE_KIND",
    );
  }

  const existing = await prisma.staffAccount.findUnique({ where: { email } });

  if (existing) {
    throw new ApiError("Ya existe una cuenta activa con ese correo.", 409, "EMAIL_EXISTS");
  }

  await prisma.staffInvite.updateMany({
    where: { email, acceptedAt: null },
    data: { acceptedAt: new Date() },
  });

  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const executiveKind = resolveInviteExecutiveKind(
    input.realm,
    input.executiveKind,
  );

  const invite = await prisma.staffInvite.create({
    data: {
      email,
      rut,
      realm: input.realm,
      executiveKind,
      tokenHash: hashToken(token),
      expiresAt,
      invitedByAdminId: input.invitedByAdminId ?? null,
    },
  });

  return {
    token,
    inviteId: invite.id,
    invite: {
      id: invite.id,
      email: invite.email,
      realm: input.realm,
      executiveKind,
      rut: invite.rut,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    },
  };
}

export async function readStaffInviteByToken(
  token: string,
): Promise<StaffInvitePublic | null> {
  const invite = await prisma.staffInvite.findFirst({
    where: {
      tokenHash: hashToken(token.trim()),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invite || !isValidRealm(invite.realm)) return null;

  return {
    email: invite.email,
    realm: invite.realm,
    executiveKind: resolveInviteExecutiveKind(invite.realm, invite.executiveKind),
    rut: invite.rut,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function activateStaffAccountFromInvite(
  input: ActivateStaffAccountInput,
): Promise<{ realm: StaffRealm; loginPath: string }> {
  const strengthError = validatePasswordStrength(input.password);
  if (strengthError) {
    throw new ApiError(strengthError, 400, "WEAK_PASSWORD");
  }

  if (!isValidRut(input.rut)) {
    throw new ApiError("El RUT no es válido.", 400, "INVALID_RUT");
  }

  const formattedRut = formatRut(input.rut);

  const invite = await prisma.staffInvite.findFirst({
    where: {
      tokenHash: hashToken(input.token.trim()),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invite || !isValidRealm(invite.realm)) {
    throw new ApiError(
      "El enlace de invitación no es válido o expiró.",
      400,
      "INVALID_INVITE",
    );
  }

  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";

  if (invite.realm === "admin") {
    if (!firstName || !lastName) {
      throw new ApiError("Nombre y apellido son obligatorios.", 400, "INVALID_INPUT");
    }
  }

  const fullName =
    firstName && lastName
      ? `${firstName} ${lastName}`.trim()
      : invite.email.split("@")[0] ?? "Ejecutivo";

  if (!rutMatches(invite.rut, formattedRut)) {
    throw new ApiError(
      "El RUT no coincide con la invitación enviada al correo.",
      400,
      "RUT_MISMATCH",
    );
  }

  const passwordHash = await hashPassword(input.password);
  const role = staffRealmToRole(invite.realm);

  if (invite.realm === "admin") {
    const account = await prisma.staffAccount.create({
      data: {
        email: invite.email,
        fullName,
        role,
        executiveKind: null,
        rut: formattedRut,
        passwordHash,
        active: true,
        mustChangePassword: false,
        onboardingCompleted: true,
      },
    });

    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    await issueSession({
      accountId: account.id,
      email: account.email,
      realm: "admin",
      mustChangePassword: false,
    });

    return { realm: "admin", loginPath: "/cotizador/ejecutivos" };
  }

  const trialExpiresAt = new Date();
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);
  const subscriptionStatus: SubscriptionStatus = "TRIAL";
  const executiveKind = normalizeExecutiveKind(invite.executiveKind);

  const account = await prisma.staffAccount.create({
    data: {
      email: invite.email,
      fullName,
      role,
      executiveKind,
      rut: formattedRut,
      passwordHash,
      active: true,
      mustChangePassword: false,
      onboardingCompleted: false,
      subscriptionStatus,
      subscriptionExpiresAt: trialExpiresAt,
    },
  });

  await prisma.staffInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await issueSession({
    accountId: account.id,
    email: account.email,
    realm: "executive",
    mustChangePassword: false,
  });

  return { realm: "executive", loginPath: EXECUTIVE_ONBOARDING_PATH };
}

export async function cancelPendingStaffInvite(inviteId: string): Promise<void> {
  const invite = await prisma.staffInvite.findUnique({ where: { id: inviteId } });

  if (!invite || invite.acceptedAt) {
    throw new ApiError("Invitación no encontrada.", 404, "NOT_FOUND");
  }

  await prisma.staffInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });
}

export async function resendStaffInviteForEmail(input: {
  email: string;
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
  rut?: string;
  invitedByAdminId?: string;
}): Promise<{ token: string }> {
  return createStaffInvite(input);
}

export async function listPendingStaffInvites(): Promise<
  Array<{
    id: string;
    email: string;
    realm: StaffRealm;
    executiveKind: ExecutiveKind | null;
    rut: string | null;
    expiresAt: string;
    createdAt: string;
  }>
> {
  const invites = await prisma.staffInvite.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return invites
    .filter((invite): invite is typeof invite & { realm: StaffRealm } =>
      isValidRealm(invite.realm),
    )
    .map((invite) => ({
      id: invite.id,
      email: invite.email,
      realm: invite.realm,
      executiveKind: resolveInviteExecutiveKind(invite.realm, invite.executiveKind),
      rut: invite.rut,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    }));
}

export { normalizeRut, formatRut };
