import type { ExecutiveKind, StaffRole } from "@prisma/client";
import type { StaffRealm } from "@/types/staff-account";
import { isExecutiveKind } from "@/types/staff-account";
import {
  STAFF_ADMIN_SECTIONS,
  STAFF_BASE_SECTIONS,
  STAFF_LIMITED_EXECUTIVE_SECTIONS,
  STAFF_PREMIUM_SECTIONS,
  type StaffSection,
} from "@/lib/staff/staff-sections";
import { ApiError } from "@/lib/api/api-error";

export const DEFAULT_EXECUTIVE_KIND: ExecutiveKind = "ISAPRES_PREMIUM";

export function staffRoleToRealm(role: StaffRole): StaffRealm {
  return role === "ADMIN" ? "admin" : "executive";
}

export function staffRealmToRole(realm: StaffRealm): StaffRole {
  return realm === "admin" ? "ADMIN" : "EXECUTIVE";
}

export function isExecutiveRole(role: StaffRole): boolean {
  return role === "EXECUTIVE";
}

export function isAdminRole(role: StaffRole): boolean {
  return role === "ADMIN";
}

export function normalizeExecutiveKind(
  kind: ExecutiveKind | null | undefined,
): ExecutiveKind {
  return kind && isExecutiveKind(kind) ? kind : DEFAULT_EXECUTIVE_KIND;
}

export function getStaffRoleLabel(input: {
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
}): string {
  if (input.realm === "admin") return "Administrador";

  switch (normalizeExecutiveKind(input.executiveKind)) {
    case "ZOOM":
      return "Ejecutivo Zoom";
    case "ISAPRES":
      return "Ejecutivo Isapres";
    case "ISAPRES_PREMIUM":
    default:
      return "Ejecutivo Isapres Premium";
  }
}

/** Label en minúsculas para correos (“como X”). */
export function getStaffRoleLabelLower(input: {
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
}): string {
  if (input.realm === "admin") return "administrador";

  switch (normalizeExecutiveKind(input.executiveKind)) {
    case "ZOOM":
      return "ejecutivo Zoom";
    case "ISAPRES":
      return "ejecutivo Isapres";
    case "ISAPRES_PREMIUM":
    default:
      return "ejecutivo Isapres Premium";
  }
}

export function getStaffSectionsForAccount(input: {
  realm: StaffRealm;
  executiveKind?: ExecutiveKind | null;
}): StaffSection[] {
  if (input.realm === "admin") {
    return [...STAFF_BASE_SECTIONS, ...STAFF_ADMIN_SECTIONS];
  }

  switch (normalizeExecutiveKind(input.executiveKind)) {
    case "ZOOM":
    case "ISAPRES":
      return [...STAFF_LIMITED_EXECUTIVE_SECTIONS];
    case "ISAPRES_PREMIUM":
    default:
      return [...STAFF_PREMIUM_SECTIONS];
  }
}

export function staffCanAccessSection(
  input: {
    realm: StaffRealm;
    executiveKind?: ExecutiveKind | null;
  },
  section: StaffSection,
): boolean {
  return getStaffSectionsForAccount(input).includes(section);
}

export function assertStaffCanAccessSection(
  input: {
    realm: StaffRealm;
    executiveKind?: ExecutiveKind | null;
  },
  section: StaffSection,
): void {
  if (!staffCanAccessSection(input, section)) {
    throw new ApiError(
      "No tienes permiso para acceder a este recurso.",
      403,
      "SECTION_FORBIDDEN",
    );
  }
}
