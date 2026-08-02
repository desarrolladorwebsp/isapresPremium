"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";

export interface CompanyAgreementInquiryDraft {
  userRut: string;
  email: string;
  phone: string;
  companyRut: string;
}

interface CompanyAgreementContextValue {
  validatedAgreement: ValidatedCompanyAgreement | null;
  setValidatedAgreement: (agreement: ValidatedCompanyAgreement | null) => void;
  clearValidatedAgreement: () => void;
  /** Borrador de contacto ingresado en “Validar convenio” (prefill de Solicitar). */
  inquiryDraft: CompanyAgreementInquiryDraft | null;
  setInquiryDraft: (draft: CompanyAgreementInquiryDraft | null) => void;
}

const CompanyAgreementContext =
  createContext<CompanyAgreementContextValue | null>(null);

export function CompanyAgreementProvider({ children }: { children: ReactNode }) {
  const [validatedAgreement, setValidatedAgreementState] =
    useState<ValidatedCompanyAgreement | null>(null);
  const [inquiryDraft, setInquiryDraftState] =
    useState<CompanyAgreementInquiryDraft | null>(null);

  const setValidatedAgreement = useCallback(
    (agreement: ValidatedCompanyAgreement | null) => {
      setValidatedAgreementState(agreement);
    },
    [],
  );

  const clearValidatedAgreement = useCallback(() => {
    setValidatedAgreementState(null);
  }, []);

  const setInquiryDraft = useCallback(
    (draft: CompanyAgreementInquiryDraft | null) => {
      setInquiryDraftState(draft);
    },
    [],
  );

  const value = useMemo(
    () => ({
      validatedAgreement,
      setValidatedAgreement,
      clearValidatedAgreement,
      inquiryDraft,
      setInquiryDraft,
    }),
    [
      validatedAgreement,
      setValidatedAgreement,
      clearValidatedAgreement,
      inquiryDraft,
      setInquiryDraft,
    ],
  );

  return (
    <CompanyAgreementContext.Provider value={value}>
      {children}
    </CompanyAgreementContext.Provider>
  );
}

export function useCompanyAgreementContext(): CompanyAgreementContextValue {
  const context = useContext(CompanyAgreementContext);
  if (!context) {
    throw new Error(
      "useCompanyAgreementContext debe usarse dentro de CompanyAgreementProvider.",
    );
  }
  return context;
}

/** Permite usar el contexto cuando el provider es opcional (p. ej. panel ejecutivo). */
export function useOptionalCompanyAgreementContext():
  | CompanyAgreementContextValue
  | null {
  return useContext(CompanyAgreementContext);
}
