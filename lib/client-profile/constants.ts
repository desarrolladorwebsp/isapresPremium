import type {
  ClientDependentProfile,
  ClientExecutiveProfile,
  ClientProfileInput,
} from "@/types/client-profile";
import {
  assertClientManagementRuts,
  formatOptionalClientRut,
  type ClientManagementRutOptions,
} from "@/lib/client-profile/validate-client-ruts";
import { formatRut } from "@/lib/auth/rut";

export const MARITAL_STATUS_OPTIONS = [
  "Soltero/a",
  "Casado/a",
  "Divorciado/a",
  "Viudo/a",
  "Conviviente civil",
  "Separado/a",
  "Otro",
] as const;

export function buildEmptyDependent(): ClientDependentProfile {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dep-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    rut: "",
    birthDate: "",
    heightCm: "",
    weightKg: "",
  };
}

export function buildEmptyClientProfile(): ClientExecutiveProfile {
  return {
    firstNames: "",
    lastNames: "",
    birthDate: "",
    currentIsapre: "",
    heightCm: "",
    weightKg: "",
    maritalStatus: "",
    address: "",
    commune: "",
    dependents: [],
    updatedAt: new Date().toISOString(),
  };
}

export function splitFullName(fullName?: string | null): {
  firstNames: string;
  lastNames: string;
} {
  if (!fullName?.trim()) {
    return { firstNames: "", lastNames: "" };
  }

  const parts = fullName.trim().split(/\s+/);
  return {
    firstNames: parts[0] ?? "",
    lastNames: parts.slice(1).join(" "),
  };
}

function isDependent(value: unknown): value is ClientDependentProfile {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.rut === "string" &&
    typeof item.birthDate === "string" &&
    typeof item.heightCm === "string" &&
    typeof item.weightKg === "string"
  );
}

export function resolveClientProfile(
  raw: unknown,
  fallback?: { fullName?: string | null },
): ClientExecutiveProfile {
  const defaults = buildEmptyClientProfile();
  const fromName = splitFullName(fallback?.fullName);

  if (!raw || typeof raw !== "object") {
    return {
      ...defaults,
      firstNames: fromName.firstNames,
      lastNames: fromName.lastNames,
    };
  }

  const profile = raw as Record<string, unknown>;

  return {
    firstNames:
      typeof profile.firstNames === "string"
        ? profile.firstNames
        : fromName.firstNames,
    lastNames:
      typeof profile.lastNames === "string"
        ? profile.lastNames
        : fromName.lastNames,
    birthDate: typeof profile.birthDate === "string" ? profile.birthDate : "",
    currentIsapre:
      typeof profile.currentIsapre === "string" ? profile.currentIsapre : "",
    heightCm: typeof profile.heightCm === "string" ? profile.heightCm : "",
    weightKg: typeof profile.weightKg === "string" ? profile.weightKg : "",
    maritalStatus:
      typeof profile.maritalStatus === "string" ? profile.maritalStatus : "",
    address: typeof profile.address === "string" ? profile.address : "",
    commune: typeof profile.commune === "string" ? profile.commune : "",
    dependents: Array.isArray(profile.dependents)
      ? profile.dependents.filter(isDependent)
      : [],
    updatedAt:
      typeof profile.updatedAt === "string"
        ? profile.updatedAt
        : new Date().toISOString(),
  };
}

export function buildFullName(firstNames: string, lastNames: string): string {
  return `${firstNames.trim()} ${lastNames.trim()}`.trim();
}

export function normalizeClientProfileInput(
  input: ClientProfileInput,
  options: ClientManagementRutOptions = { requireTitularRut: false },
): {
  email: string;
  phone: string | null;
  rut: string | null;
  fullName: string;
  profile: ClientExecutiveProfile;
} {
  const firstNames = input.firstNames.trim();
  const lastNames = input.lastNames.trim();
  const fullName = buildFullName(firstNames, lastNames);

  if (!fullName) {
    throw new Error("Indica nombres y apellidos del titular.");
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Indica el correo electrónico del titular.");
  }

  assertClientManagementRuts(
    {
      rut: input.rut,
      dependents: input.dependents,
    },
    options,
  );

  const dependents = (input.dependents ?? []).map((dependent) => {
    const rutRaw = dependent.rut.trim();
    return {
      id: dependent.id || buildEmptyDependent().id,
      rut: rutRaw ? formatRut(rutRaw) : "",
      birthDate: dependent.birthDate.trim(),
      heightCm: dependent.heightCm.trim(),
      weightKg: dependent.weightKg.trim(),
    };
  });

  return {
    email,
    phone: input.phone?.trim() || null,
    rut: formatOptionalClientRut(input.rut),
    fullName,
    profile: {
      firstNames,
      lastNames,
      birthDate: input.birthDate?.trim() || "",
      currentIsapre: input.currentIsapre?.trim() || "",
      heightCm: input.heightCm?.trim() || "",
      weightKg: input.weightKg?.trim() || "",
      maritalStatus: input.maritalStatus?.trim() || "",
      address: input.address?.trim() || "",
      commune: input.commune?.trim() || "",
      dependents,
      updatedAt: new Date().toISOString(),
    },
  };
}
