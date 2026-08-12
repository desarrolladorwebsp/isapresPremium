import {
  DEFAULT_GES_PREMIUM_UF,
  ISAPRE_GES_DEFAULTS,
  resolveGesPremiumUf,
} from "@/lib/isapre-ges-defaults";

export {
  DEFAULT_GES_PREMIUM_UF,
  ISAPRE_GES_DEFAULTS,
  resolveGesPremiumUf,
};

/** @deprecated Usar GES por isapre (`ges_premium_uf` en plan). Fallback global. */
export const GES_PREMIUM_UF_PER_BENEFICIARY = DEFAULT_GES_PREMIUM_UF;

/** Umbral exclusivo: menores de 2 años (0 y 1) no pagan factor/GES; a los 2 aplica tabla (0,60). */
export const RISK_FACTOR_EXEMPT_MAX_AGE_YEARS = 2;

export function isRiskFactorExemptByAge(age: number | null): boolean {
  return age !== null && age < RISK_FACTOR_EXEMPT_MAX_AGE_YEARS;
}
