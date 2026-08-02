export type QuoteStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "CANCELLED";

export interface CreateQuoteInput {
  planCode?: string | null;
  fullName: string;
  email: string;
  phone: string;
  rut?: string | null;
  region?: string | null;
  sex?: string | null;
  monthlyIncome?: string | null;
  contributorAge?: number | null;
  dependentsCount?: number;
  dependentAges?: number[];
  contactPreference?: string | null;
  quoteReason?: string | null;
  finalPriceUf?: number | null;
  finalPriceClp?: number | null;
  ufValue?: number | null;
  beneficiaryCount?: number | null;
  totalFactors?: number | null;
  notes?: string | null;
  partnerEntitySlug?: string | null;
  partnerEntityName?: string | null;
  companyAgreementRut?: string | null;
  companyAgreementName?: string | null;
  companyAgreementDiscount?: number | null;
  planName?: string | null;
  planIsapre?: string | null;
}

export interface QuoteRecord extends CreateQuoteInput {
  id: string;
  userId: string | null;
  status: QuoteStatus;
  executiveAccountId?: string | null;
  executiveName?: string | null;
  createdAt: string;
  updatedAt: string;
}
