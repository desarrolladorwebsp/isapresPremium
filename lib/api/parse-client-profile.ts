import type {
  ClientCoverageArea,
  ClientMoneyCurrency,
  ClientProfileInput,
} from "@/types/client-profile";
import { resolveClientMoneyCurrency } from "@/lib/client-profile/constants";

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
  if (coverageArea === "santiago-centro") return "metropolitana";
  return "";
}

function resolveMoneyAmount(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function resolveMoneyCurrency(value: unknown): ClientMoneyCurrency {
  return resolveClientMoneyCurrency(value);
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
            age: typeof dependent.age === "string" ? dependent.age : "",
            heightCm:
              typeof dependent.heightCm === "string" ? dependent.heightCm : "",
            weightKg:
              typeof dependent.weightKg === "string" ? dependent.weightKg : "",
            preexistenciasMedicas:
              typeof dependent.preexistenciasMedicas === "string"
                ? dependent.preexistenciasMedicas
                : "",
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
            age: typeof titular.age === "string" ? titular.age : "",
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
            currentPlanPrice: resolveMoneyAmount(titular.currentPlanPrice),
            currentPlanPriceCurrency: resolveMoneyCurrency(
              titular.currentPlanPriceCurrency,
            ),
            voluntaryAdditional: resolveMoneyAmount(
              titular.voluntaryAdditional,
            ),
            voluntaryAdditionalCurrency: resolveMoneyCurrency(
              titular.voluntaryAdditionalCurrency,
            ),
            rentaImponible:
              typeof titular.rentaImponible === "string"
                ? titular.rentaImponible
                : "",
            motivoCotizacion:
              typeof titular.motivoCotizacion === "string"
                ? titular.motivoCotizacion
                : "",
            motivoCotizacionOther:
              typeof titular.motivoCotizacionOther === "string"
                ? titular.motivoCotizacionOther
                : "",
            preexistenciasMedicas:
              typeof titular.preexistenciasMedicas === "string"
                ? titular.preexistenciasMedicas
                : "",
          };
        })
    : [];

  return {
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    rut: typeof data.rut === "string" ? data.rut : null,
    firstNames: data.firstNames,
    lastNames: typeof data.lastNames === "string" ? data.lastNames : "",
    birthDate: typeof data.birthDate === "string" ? data.birthDate : null,
    age: typeof data.age === "string" ? data.age : null,
    currentIsapre:
      typeof data.currentIsapre === "string" ? data.currentIsapre : null,
    currentPlanPrice:
      typeof data.currentPlanPrice === "string" ? data.currentPlanPrice : null,
    currentPlanPriceCurrency: resolveMoneyCurrency(
      data.currentPlanPriceCurrency,
    ),
    voluntaryAdditional:
      typeof data.voluntaryAdditional === "string"
        ? data.voluntaryAdditional
        : null,
    voluntaryAdditionalCurrency: resolveMoneyCurrency(
      data.voluntaryAdditionalCurrency,
    ),
    heightCm: typeof data.heightCm === "string" ? data.heightCm : null,
    weightKg: typeof data.weightKg === "string" ? data.weightKg : null,
    maritalStatus:
      typeof data.maritalStatus === "string" ? data.maritalStatus : null,
    employerRut: typeof data.employerRut === "string" ? data.employerRut : null,
    rentaImponible:
      typeof data.rentaImponible === "string" ? data.rentaImponible : null,
    motivoCotizacion:
      typeof data.motivoCotizacion === "string" ? data.motivoCotizacion : null,
    motivoCotizacionOther:
      typeof data.motivoCotizacionOther === "string"
        ? data.motivoCotizacionOther
        : null,
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
    preferredClinics:
      typeof data.preferredClinics === "string" ? data.preferredClinics : "",
    anualidad: data.anualidad === true,
    anualidadComment:
      typeof data.anualidadComment === "string" ? data.anualidadComment : "",
    segurosComplementarios:
      typeof data.segurosComplementarios === "string"
        ? data.segurosComplementarios
        : "",
    preexistenciasMedicas:
      typeof data.preexistenciasMedicas === "string"
        ? data.preexistenciasMedicas
        : "",
    dependents,
    additionalTitulares,
  };
}
