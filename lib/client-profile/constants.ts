import type {
  ClientAdditionalTitularProfile,
  ClientCoverageArea,
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
import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";

export const MARITAL_STATUS_OPTIONS = [
  "Soltero/a",
  "Casado/a",
  "Divorciado/a",
  "Viudo/a",
  "Conviviente civil",
  "Separado/a",
  "Otro",
] as const;

/** Zonas / regiones de ubicación del beneficiario (incluye RM y sus sectores). */
export const CLIENT_REGION_OPTIONS = ZONE_FILTER_OPTIONS;

function createLocalId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildEmptyDependent(): ClientDependentProfile {
  return {
    id: createLocalId("dep"),
    rut: "",
    birthDate: "",
    heightCm: "",
    weightKg: "",
  };
}

export function buildEmptyAdditionalTitular(): ClientAdditionalTitularProfile {
  return {
    id: createLocalId("tit"),
    firstNames: "",
    lastNames: "",
    rut: "",
    birthDate: "",
    heightCm: "",
    weightKg: "",
    maritalStatus: "",
    phone: "",
    currentIsapre: "",
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
    coverageArea: "",
    coverageRegionId: "",
    preferredClinicIds: [],
    anualidad: false,
    anualidadComment: "",
    dependents: [],
    additionalTitulares: [],
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

function isAdditionalTitular(
  value: unknown,
): value is ClientAdditionalTitularProfile {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.firstNames === "string" &&
    typeof item.lastNames === "string" &&
    typeof item.rut === "string" &&
    typeof item.birthDate === "string" &&
    typeof item.heightCm === "string" &&
    typeof item.weightKg === "string" &&
    typeof item.maritalStatus === "string" &&
    typeof item.phone === "string" &&
    typeof item.currentIsapre === "string"
  );
}

function resolveCoverageArea(value: unknown): ClientCoverageArea {
  if (value === "region" || value === "santiago-centro") return value;
  return "";
}

const VALID_REGION_IDS = new Set(CLIENT_REGION_OPTIONS.map((option) => option.id));

function resolveCoverageRegionId(
  regionId: unknown,
  coverageArea: ClientCoverageArea,
): string {
  if (typeof regionId === "string") {
    const trimmed = regionId.trim();
    if (VALID_REGION_IDS.has(trimmed)) return trimmed;
  }
  // Compat: valor antiguo “Santiago Centro” → RM Centro
  if (coverageArea === "santiago-centro") return "rm-centro";
  return "";
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
  const legacyArea = resolveCoverageArea(profile.coverageArea);
  const coverageRegionId = resolveCoverageRegionId(
    profile.coverageRegionId,
    legacyArea,
  );

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
    coverageArea: coverageRegionId ? "region" : "",
    coverageRegionId,
    preferredClinicIds: Array.isArray(profile.preferredClinicIds)
      ? profile.preferredClinicIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
      : [],
    anualidad: profile.anualidad === true,
    anualidadComment:
      typeof profile.anualidadComment === "string"
        ? profile.anualidadComment
        : "",
    dependents: Array.isArray(profile.dependents)
      ? profile.dependents.filter(isDependent)
      : [],
    additionalTitulares: Array.isArray(profile.additionalTitulares)
      ? profile.additionalTitulares.filter(isAdditionalTitular)
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

function buildPlaceholderEmail(fullName: string): string {
  const slug =
    fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36) || "cliente";
  return `sin-correo+${slug}-${Date.now()}@clientes.isaprespremium.local`;
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
  const lastNames = (input.lastNames ?? "").trim();
  const fullName = buildFullName(firstNames, lastNames);

  if (!firstNames) {
    throw new Error("Indica el nombre del titular.");
  }

  const emailRaw = (input.email ?? "").trim().toLowerCase();
  const email = emailRaw || buildPlaceholderEmail(fullName || firstNames);

  assertClientManagementRuts(
    {
      rut: input.rut,
      dependents: input.dependents,
      additionalTitulares: input.additionalTitulares,
    },
    options,
  );

  for (const [index, titular] of (input.additionalTitulares ?? []).entries()) {
    if (!titular.firstNames.trim()) {
      throw new Error(
        `Indica el nombre del titular adicional ${index + 2}.`,
      );
    }
  }

  const legacyArea = resolveCoverageArea(input.coverageArea);
  const coverageRegionId = resolveCoverageRegionId(
    input.coverageRegionId,
    legacyArea,
  );
  const coverageArea: ClientCoverageArea = coverageRegionId ? "region" : "";
  const preferredClinicIds = Array.from(
    new Set(
      (input.preferredClinicIds ?? [])
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
  const anualidad = input.anualidad === true;
  const anualidadComment = anualidad
    ? ""
    : (input.anualidadComment ?? "").trim();

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

  const additionalTitulares = (input.additionalTitulares ?? []).map(
    (titular) => {
      const rutRaw = titular.rut.trim();
      return {
        id: titular.id || buildEmptyAdditionalTitular().id,
        firstNames: titular.firstNames.trim(),
        lastNames: titular.lastNames.trim(),
        rut: rutRaw ? formatRut(rutRaw) : "",
        birthDate: titular.birthDate.trim(),
        heightCm: titular.heightCm.trim(),
        weightKg: titular.weightKg.trim(),
        maritalStatus: titular.maritalStatus.trim(),
        phone: titular.phone.trim(),
        currentIsapre: titular.currentIsapre.trim(),
      };
    },
  );

  return {
    email,
    phone: input.phone?.trim() || null,
    rut: formatOptionalClientRut(input.rut),
    fullName: fullName || firstNames,
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
      coverageArea,
      coverageRegionId,
      preferredClinicIds,
      anualidad,
      anualidadComment,
      dependents,
      additionalTitulares,
      updatedAt: new Date().toISOString(),
    },
  };
}
