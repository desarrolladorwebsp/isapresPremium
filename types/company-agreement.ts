export interface CompanyAgreementRecord {
  id: string;
  companyRut: string;
  companyRutRaw: string | null;
  companyName: string;
  discountPercent: number | null;
  isapreId: string | null;
  isapreName: string | null;
}

export interface CompanyAgreementLookupResult {
  matches: CompanyAgreementRecord[];
}

/** Convenio empresa confirmado en la sesión del cotizador (lookup exitoso). */
export interface ValidatedCompanyAgreement {
  companyRut: string;
  companyRutRaw: string | null;
  companyName: string;
  discountPercent: number | null;
  isapreId: string | null;
  isapreName: string | null;
}

export interface CompanyAgreementAdminListItem extends CompanyAgreementRecord {
  sourceFile: string | null;
  active: boolean;
  updatedAt: string;
}

export interface CompanyAgreementAdminListResult {
  items: CompanyAgreementAdminListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totals: {
    all: number;
    active: number;
    inactive: number;
  };
  byIsapre: Array<{
    isapreId: string;
    isapreName: string;
    total: number;
    active: number;
  }>;
}

export interface CompanyAgreementImportResult {
  ok: true;
  isapreId: string;
  isapreName: string;
  sourceFile: string;
  discountPercent: number;
  imported: number;
  created: number;
  updated: number;
}
