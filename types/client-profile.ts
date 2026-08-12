export interface ClientDependentProfile {
  id: string;
  /** Nombre completo de la carga. */
  fullName: string;
  rut: string;
  birthDate: string;
  /** Edad; se puede recalcular desde birthDate, pero es editable. */
  age: string;
  heightCm: string;
  weightKg: string;
  /** Preexistencias médicas (texto libre). */
  preexistenciasMedicas: string;
}

/** Moneda del monto ingresado en perfil (UF o pesos chilenos). */
export type ClientMoneyCurrency = "UF" | "CLP";

/** Titulares adicionales del grupo familiar (además del titular de la cuenta). */
export interface ClientAdditionalTitularProfile {
  id: string;
  firstNames: string;
  lastNames: string;
  rut: string;
  birthDate: string;
  /** Edad; se puede recalcular desde birthDate, pero es editable. */
  age: string;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  phone: string;
  currentIsapre: string;
  /** Precio del plan actual (monto). */
  currentPlanPrice: string;
  currentPlanPriceCurrency: ClientMoneyCurrency;
  /** Adicional voluntario (monto). */
  voluntaryAdditional: string;
  voluntaryAdditionalCurrency: ClientMoneyCurrency;
  /** Renta imponible (texto libre / monto). */
  rentaImponible: string;
  /**
   * Motivo(s) de cotización.
   * Uno o varios ids separados por coma (ej. `cobertura,otros`).
   */
  motivoCotizacion: string;
  /** Detalle cuando entre los motivos está `otros`. */
  motivoCotizacionOther: string;
  /** Preexistencias médicas (texto libre). */
  preexistenciasMedicas: string;
}

/**
 * Compatibilidad con perfiles antiguos.
 * La ubicación se guarda en `coverageRegionId` (zona del catálogo).
 */
export type ClientCoverageArea = "" | "santiago-centro" | "region";

export interface ClientExecutiveProfile {
  firstNames: string;
  lastNames: string;
  birthDate: string;
  /** Edad; se puede recalcular desde birthDate, pero es editable. */
  age: string;
  currentIsapre: string;
  /** Precio del plan actual (monto). */
  currentPlanPrice: string;
  currentPlanPriceCurrency: ClientMoneyCurrency;
  /** Adicional voluntario (monto). */
  voluntaryAdditional: string;
  voluntaryAdditionalCurrency: ClientMoneyCurrency;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  /** RUT del empleador (para detectar convenio empresa). */
  employerRut: string;
  /**
   * Calidad de cliente / tipo de cotizante:
   * dependiente | independiente | voluntario.
   */
  contributorType: string;
  /** Renta imponible (texto libre / monto). */
  rentaImponible: string;
  /**
   * Motivo(s) de cotización.
   * Uno o varios ids separados por coma (ej. `cobertura,otros`).
   */
  motivoCotizacion: string;
  /** Detalle cuando entre los motivos está `otros`. */
  motivoCotizacionOther: string;
  address: string;
  commune: string;
  /** Derivado: "region" si hay coverageRegionId. */
  coverageArea: ClientCoverageArea;
  /** Id de región de Chile (catálogo CLIENT_REGION_OPTIONS). */
  coverageRegionId: string;
  /** Clínicas de preferencia (texto libre). */
  preferredClinics: string;
  /** Si el beneficiario tiene anualidad. */
  anualidad: boolean;
  /** Comentario cuando no tiene anualidad. */
  anualidadComment: string;
  /** Seguros complementarios (texto libre por ahora). */
  segurosComplementarios: string;
  /** Preexistencias médicas (texto libre). */
  preexistenciasMedicas: string;
  dependents: ClientDependentProfile[];
  additionalTitulares: ClientAdditionalTitularProfile[];
  updatedAt: string;
}

export interface ClientProfileInput {
  email?: string | null;
  phone?: string | null;
  rut?: string | null;
  firstNames: string;
  lastNames?: string | null;
  birthDate?: string | null;
  age?: string | null;
  currentIsapre?: string | null;
  currentPlanPrice?: string | null;
  currentPlanPriceCurrency?: ClientMoneyCurrency | null;
  voluntaryAdditional?: string | null;
  voluntaryAdditionalCurrency?: ClientMoneyCurrency | null;
  heightCm?: string | null;
  weightKg?: string | null;
  maritalStatus?: string | null;
  employerRut?: string | null;
  contributorType?: string | null;
  rentaImponible?: string | null;
  motivoCotizacion?: string | null;
  motivoCotizacionOther?: string | null;
  address?: string | null;
  commune?: string | null;
  coverageArea?: ClientCoverageArea | null;
  coverageRegionId?: string | null;
  preferredClinics?: string | null;
  anualidad?: boolean | null;
  anualidadComment?: string | null;
  segurosComplementarios?: string | null;
  preexistenciasMedicas?: string | null;
  dependents?: ClientDependentProfile[];
  additionalTitulares?: ClientAdditionalTitularProfile[];
}
