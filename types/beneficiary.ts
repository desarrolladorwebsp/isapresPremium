import type { ValidatedCompanyAgreement } from "@/types/company-agreement";

export type BeneficiaryRole = "contributor" | "dependent";

export interface DependentBeneficiary {
  id: string;
  age: number | null;
  /** Beneficio propio del cotizante; no se hereda a otras personas. */
  companyAgreement?: ValidatedCompanyAgreement | null;
}

export interface FamilyBeneficiariesState {
  contributors: DependentBeneficiary[];
  dependents: DependentBeneficiary[];
}

/** Forma legacy (pre multi-cotizante) usada en deep links / persistencia. */
export interface LegacyFamilyBeneficiariesState {
  contributorAge?: number | null;
  contributors?: DependentBeneficiary[];
  dependents?: DependentBeneficiary[];
}

export interface PersonRiskFactor {
  id: string;
  role: BeneficiaryRole;
  age: number | null;
  tableFactor: number | null;
  factor: number | null;
  isRiskFactorExempt: boolean;
  companyAgreement?: ValidatedCompanyAgreement | null;
}

export interface BeneficiaryGroupSummary {
  /** Primer cotizante (compat); vacío si no hay cotizantes. */
  contributor: PersonRiskFactor;
  /** Todos los cotizantes con factor de rol contributor. */
  contributors: PersonRiskFactor[];
  dependents: PersonRiskFactor[];
  beneficiaryCount: number;
  personCount: number;
  totalFactors: number;
}
