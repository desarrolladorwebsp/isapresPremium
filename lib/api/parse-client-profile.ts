import type {
  ClientCoverageArea,
  ClientProfileInput,
} from "@/types/client-profile";

function resolveCoverageArea(value: unknown): ClientCoverageArea {
  if (value === "santiago-centro" || value === "region") return value;
  return "";
}

function resolveCoverageRegionId(
  regionId: unknown,
  coverageArea: ClientCoverageArea,
): string {
  if (typeof regionId === "string" && regionId.trim()) {
    return regionId.trim();
  }
  if (coverageArea === "santiago-centro") return "rm-centro";
  return "";
}

export function parseClientProfilePayload(payload: unknown): ClientProfileInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Datos de perfil inválidos.");
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.firstNames !== "string" || !data.firstNames.trim()) {
    throw new Error("El nombre del titular es obligatorio.");
  }

  const dependents = Array.isArray(data.dependents)
    ? data.dependents
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const dependent = item as Record<string, unknown>;
          return {
            id: typeof dependent.id === "string" ? dependent.id : "",
            rut: typeof dependent.rut === "string" ? dependent.rut : "",
            birthDate:
              typeof dependent.birthDate === "string" ? dependent.birthDate : "",
            heightCm:
              typeof dependent.heightCm === "string" ? dependent.heightCm : "",
            weightKg:
              typeof dependent.weightKg === "string" ? dependent.weightKg : "",
          };
        })
    : [];

  const additionalTitulares = Array.isArray(data.additionalTitulares)
    ? data.additionalTitulares
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const titular = item as Record<string, unknown>;
          return {
            id: typeof titular.id === "string" ? titular.id : "",
            firstNames:
              typeof titular.firstNames === "string" ? titular.firstNames : "",
            lastNames:
              typeof titular.lastNames === "string" ? titular.lastNames : "",
            rut: typeof titular.rut === "string" ? titular.rut : "",
            birthDate:
              typeof titular.birthDate === "string" ? titular.birthDate : "",
            heightCm:
              typeof titular.heightCm === "string" ? titular.heightCm : "",
            weightKg:
              typeof titular.weightKg === "string" ? titular.weightKg : "",
            maritalStatus:
              typeof titular.maritalStatus === "string"
                ? titular.maritalStatus
                : "",
            phone: typeof titular.phone === "string" ? titular.phone : "",
            currentIsapre:
              typeof titular.currentIsapre === "string"
                ? titular.currentIsapre
                : "",
          };
        })
    : [];

  const preferredClinicIds = Array.isArray(data.preferredClinicIds)
    ? data.preferredClinicIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];

  return {
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    rut: typeof data.rut === "string" ? data.rut : null,
    firstNames: data.firstNames,
    lastNames: typeof data.lastNames === "string" ? data.lastNames : "",
    birthDate: typeof data.birthDate === "string" ? data.birthDate : null,
    currentIsapre:
      typeof data.currentIsapre === "string" ? data.currentIsapre : null,
    heightCm: typeof data.heightCm === "string" ? data.heightCm : null,
    weightKg: typeof data.weightKg === "string" ? data.weightKg : null,
    maritalStatus:
      typeof data.maritalStatus === "string" ? data.maritalStatus : null,
    address: typeof data.address === "string" ? data.address : null,
    commune: typeof data.commune === "string" ? data.commune : null,
    coverageArea: (() => {
      const area = resolveCoverageArea(data.coverageArea);
      const regionId = resolveCoverageRegionId(data.coverageRegionId, area);
      return regionId ? "region" : "";
    })(),
    coverageRegionId: resolveCoverageRegionId(
      data.coverageRegionId,
      resolveCoverageArea(data.coverageArea),
    ),
    preferredClinicIds,
    anualidad: data.anualidad === true,
    anualidadComment:
      typeof data.anualidadComment === "string" ? data.anualidadComment : "",
    dependents,
    additionalTitulares,
  };
}
