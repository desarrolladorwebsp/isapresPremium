import type { ExecutiveKind, SubscriptionStatus } from "@prisma/client";

export type StaffRealm = "admin" | "executive";

export type { ExecutiveKind };

export const EXECUTIVE_KINDS = [
  "ISAPRES_PREMIUM",
  "ZOOM",
  "ISAPRES",
] as const satisfies readonly ExecutiveKind[];

export function isExecutiveKind(value: unknown): value is ExecutiveKind {
  return (
    value === "ISAPRES_PREMIUM" || value === "ZOOM" || value === "ISAPRES"
  );
}

export interface StaffAccountRecord {
  id: string;
  realm: StaffRealm;
  executiveKind: ExecutiveKind | null;
  email: string;
  fullName: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  phone?: string | null;
  rut?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiresAt?: string | null;
  assignmentsSuspended?: boolean;
  onboardingCompleted?: boolean;
}

export interface CreateStaffAccountInput {
  realm: StaffRealm;
  /** Obligatorio al invitar ejecutivo; null/omitido en admin. */
  executiveKind?: ExecutiveKind | null;
  email: string;
  /** Opcional en la invitación; la persona lo ingresa al activar la cuenta. */
  rut?: string;
  fullName?: string;
  phone?: string;
  subscriptionStatus?: SubscriptionStatus;
}

export interface PendingStaffInviteRecord {
  id: string;
  email: string;
  realm: StaffRealm;
  executiveKind: ExecutiveKind | null;
  rut: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface UpdateStaffAccountInput {
  active?: boolean;
  fullName?: string;
  phone?: string | null;
  rut?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  assignmentsSuspended?: boolean;
  /**
   * Solo cuentas executive: cambia el kind (Zoom / Isapres / Isapres Premium).
   * No se usa para promover/degradar admin ↔ ejecutivo.
   */
  executiveKind?: ExecutiveKind;
}
