export interface ClientDependentProfile {
  id: string;
  rut: string;
  birthDate: string;
  heightCm: string;
  weightKg: string;
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
}
