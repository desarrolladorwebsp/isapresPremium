export interface ClientDependentProfile {
  id: string;
  rut: string;
  birthDate: string;
  /** Edad; se puede recalcular desde birthDate, pero es editable. */
  age: string;
  heightCm: string;
  weightKg: string;
  /** Preexistencias médicas (texto libre). */
  preexistenciasMedicas: string;
}

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
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
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
  heightCm?: string | null;
  weightKg?: string | null;
  maritalStatus?: string | null;
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
