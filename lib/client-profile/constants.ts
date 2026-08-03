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

export const MARITAL_STATUS_OPTIONS = [
  "Soltero/a",
  "Casado/a",
  "Divorciado/a",
  "Viudo/a",
  "Conviviente civil",
  "Separado/a",
  "Otro",
] as const;

/** Las 16 regiones de Chile (orden geográfico norte → sur). */
export const CLIENT_REGION_OPTIONS = [
  { id: "arica-parinacota", label: "Arica y Parinacota" },
  { id: "tarapaca", label: "Tarapacá" },
  { id: "antofagasta", label: "Antofagasta" },
  { id: "atacama", label: "Atacama" },
  { id: "coquimbo", label: "Coquimbo" },
  { id: "valparaiso", label: "Valparaíso" },
  { id: "metropolitana", label: "Metropolitana de Santiago" },
  { id: "ohiggins", label: "O'Higgins" },
  { id: "maule", label: "Maule" },
  { id: "nuble", label: "Ñuble" },
  { id: "biobio", label: "Biobío" },
  { id: "araucania", label: "La Araucanía" },
  { id: "los-rios", label: "Los Ríos" },
  { id: "los-lagos", label: "Los Lagos" },
  { id: "aysen", label: "Aysén" },
  { id: "magallanes", label: "Magallanes" },
] as const;

/** Compatibilidad con zonas antiguas del cotizador. */
const LEGACY_REGION_ID_MAP: Record<string, string> = {
  "rm-metropolitana": "metropolitana",
  "rm-norte": "metropolitana",
  "rm-sur": "metropolitana",
  "rm-oriente": "metropolitana",
  "rm-poniente": "metropolitana",
  "rm-centro": "metropolitana",
  "santiago-centro": "metropolitana",
  octava: "biobio",
};

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
    age: "",
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
    age: "",
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
    age: "",
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
    segurosComplementarios: "",
    dependents: [],
    additionalTitulares: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Calcula edad en años desde YYYY-MM-DD. Editable aparte; solo sugiere. */
export function calculateAgeFromBirthDate(birthDate: string): string {
  const raw = birthDate.trim();
  if (!raw) return "";
  const birth = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  if (age < 0 || age > 130) return "";
  return String(age);
}

function resolveAge(ageValue: unknown, birthDate: string): string {
  if (typeof ageValue === "string" && ageValue.trim()) {
    return ageValue.trim();
  }
  if (typeof ageValue === "number" && Number.isFinite(ageValue)) {
    return String(Math.trunc(ageValue));
  }
  return calculateAgeFromBirthDate(birthDate);
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

const VALID_REGION_IDS = new Set<string>(
  CLIENT_REGION_OPTIONS.map((option) => option.id),
);

function resolveCoverageRegionId(
  regionId: unknown,
  coverageArea: ClientCoverageArea,
): string {
  if (typeof regionId === "string") {
    const trimmed = regionId.trim();
    if (VALID_REGION_IDS.has(trimmed)) return trimmed;
    const mapped = LEGACY_REGION_ID_MAP[trimmed];
    if (mapped) return mapped;
  }
  // Compat: valor antiguo “Santiago Centro” → Metropolitana
  if (coverageArea === "santiago-centro") return "metropolitana";
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
  const birthDate = typeof profile.birthDate === "string" ? profile.birthDate : "";

  return {
    firstNames:
      typeof profile.firstNames === "string"
        ? profile.firstNames
        : fromName.firstNames,
    lastNames:
      typeof profile.lastNames === "string"
        ? profile.lastNames
        : fromName.lastNames,
    birthDate,
    age: resolveAge(profile.age, birthDate),
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
    segurosComplementarios:
      typeof profile.segurosComplementarios === "string"
        ? profile.segurosComplementarios
        : "",
    dependents: Array.isArray(profile.dependents)
      ? profile.dependents.filter(isDependent).map((dependent) => {
          const rawDependent = dependent as ClientDependentProfile & {
            age?: string;
          };
          return {
            ...dependent,
            age: resolveAge(rawDependent.age, dependent.birthDate),
          };
        })
      : [],
    additionalTitulares: Array.isArray(profile.additionalTitulares)
      ? profile.additionalTitulares.filter(isAdditionalTitular).map((titular) => {
          const rawTitular = titular as ClientAdditionalTitularProfile & {
            age?: string;
          };
          return {
            ...titular,
            age: resolveAge(rawTitular.age, titular.birthDate),
          };
        })
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
  const segurosComplementarios = (input.segurosComplementarios ?? "").trim();

  const dependents = (input.dependents ?? []).map((dependent) => {
    const rutRaw = dependent.rut.trim();
    const birthDate = dependent.birthDate.trim();
    const ageRaw = (dependent.age ?? "").trim();
    return {
      id: dependent.id || buildEmptyDependent().id,
      rut: rutRaw ? formatRut(rutRaw) : "",
      birthDate,
      age: ageRaw || calculateAgeFromBirthDate(birthDate),
      heightCm: dependent.heightCm.trim(),
      weightKg: dependent.weightKg.trim(),
    };
  });

  const additionalTitulares = (input.additionalTitulares ?? []).map(
    (titular) => {
      const rutRaw = titular.rut.trim();
      const birthDate = titular.birthDate.trim();
      const ageRaw = (titular.age ?? "").trim();
      return {
        id: titular.id || buildEmptyAdditionalTitular().id,
        firstNames: titular.firstNames.trim(),
        lastNames: titular.lastNames.trim(),
        rut: rutRaw ? formatRut(rutRaw) : "",
        birthDate,
        age: ageRaw || calculateAgeFromBirthDate(birthDate),
        heightCm: titular.heightCm.trim(),
        weightKg: titular.weightKg.trim(),
        maritalStatus: titular.maritalStatus.trim(),
        phone: titular.phone.trim(),
        currentIsapre: titular.currentIsapre.trim(),
      };
    },
  );

  const birthDate = input.birthDate?.trim() || "";
  const ageRaw = (input.age ?? "").trim();

  return {
    email,
    phone: input.phone?.trim() || null,
    rut: formatOptionalClientRut(input.rut),
    fullName: fullName || firstNames,
    profile: {
      firstNames,
      lastNames,
      birthDate,
      age: ageRaw || calculateAgeFromBirthDate(birthDate),
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
      segurosComplementarios,
      dependents,
      additionalTitulares,
      updatedAt: new Date().toISOString(),
    },
  };
}
