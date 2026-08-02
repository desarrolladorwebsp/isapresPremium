import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/api-error";
import {
  PASSWORD_RESET_TTL_MINUTES,
} from "@/lib/auth/constants";
import {
  hashPassword,
  normalizeEmail,
  validatePasswordStrength,
} from "@/lib/auth/password";

const GENERIC_REQUEST_MESSAGE =
  "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function getPasswordResetRequestMessage(): string {
  return GENERIC_REQUEST_MESSAGE;
}

/**
 * Crea un token de reset si la cuenta existe y está activa.
 * Devuelve el token raw solo cuando hay envío; si no, null (sin revelar existencia).
 */
export async function createPasswordResetTokenForEmail(
  emailInput: string,
): Promise<{ token: string; email: string } | null> {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return null;
  }

  const account = await prisma.staffAccount.findUnique({
    where: { email },
    select: { id: true, email: true, active: true },
  });

  if (!account || !account.active) {
    return null;
  }

  const now = new Date();

  await prisma.passwordResetToken.updateMany({
    where: {
      staffAccountId: account.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  const token = generateResetToken();
  const expiresAt = new Date(
    now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  );

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      staffAccountId: account.id,
      expiresAt,
    },
  });

  return { token, email: account.email };
}

export async function readPasswordResetToken(
  tokenInput: string,
): Promise<{ email: string; expiresAt: string } | null> {
  const token = tokenInput.trim();
  if (!token) return null;

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      staffAccount: {
        select: { email: true, active: true },
      },
    },
  });

  if (!record || !record.staffAccount.active) {
    return null;
  }

  return {
    email: record.staffAccount.email,
    expiresAt: record.expiresAt.toISOString(),
  };
}

export async function resetStaffPasswordWithToken(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  const token = input.token.trim();
  if (!token) {
    throw new ApiError(
      "El enlace no es válido o expiró. Solicita uno nuevo.",
      400,
      "INVALID_RESET_TOKEN",
    );
  }

  if (input.newPassword !== input.confirmPassword) {
    throw new ApiError(
      "Las contraseñas no coinciden.",
      400,
      "PASSWORD_MISMATCH",
    );
  }

  const strengthError = validatePasswordStrength(input.newPassword);
  if (strengthError) {
    throw new ApiError(strengthError, 400, "WEAK_PASSWORD");
  }

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      staffAccount: {
        select: { id: true, active: true },
      },
    },
  });

  if (!record || !record.staffAccount.active) {
    throw new ApiError(
      "El enlace no es válido o expiró. Solicita uno nuevo.",
      400,
      "INVALID_RESET_TOKEN",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.staffAccount.update({
      where: { id: record.staffAccountId },
      data: {
        passwordHash,
        passwordChangedAt: now,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        staffAccountId: record.staffAccountId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: now },
    }),
  ]);
}
