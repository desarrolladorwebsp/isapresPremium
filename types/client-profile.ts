export interface ClientDependentProfile {
  id: string;
  rut: string;
  birthDate: string;
  heightCm: string;
  weightKg: string;
}

/** Titulares adicionales del grupo familiar (además del titular de la cuenta). */
export interface ClientAdditionalTitularProfile {
  id: string;
  firstNames: string;
  lastNames: string;
  rut: string;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  phone: string;
  currentIsapre: string;
}

export interface ClientExecutiveProfile {
  firstNames: string;
  lastNames: string;
  birthDate: string;
  currentIsapre: string;
  heightCm: string;
  weightKg: string;
  maritalStatus: string;
  address: string;
  commune: string;
  dependents: ClientDependentProfile[];
  additionalTitulares: ClientAdditionalTitularProfile[];
  updatedAt: string;
}

export interface ClientProfileInput {
  email: string;
  phone?: string | null;
  rut?: string | null;
  firstNames: string;
  lastNames: string;
  birthDate?: string | null;
  currentIsapre?: string | null;
  heightCm?: string | null;
  weightKg?: string | null;
  maritalStatus?: string | null;
  address?: string | null;
  commune?: string | null;
  dependents?: ClientDependentProfile[];
  additionalTitulares?: ClientAdditionalTitularProfile[];
}
