/** Valores GES por isapre (UF por beneficiario al mes). */
export const ISAPRE_GES_DEFAULTS: Record<
  string,
  { gesPremiumUf: number; gesPremiumUfLegacy: number }
> = {
  "vida-tres": { gesPremiumUf: 0.712, gesPremiumUfLegacy: 0.63 },
  consalud: { gesPremiumUf: 0.731, gesPremiumUfLegacy: 0.602 },
  banmedica: { gesPremiumUf: 0.778, gesPremiumUfLegacy: 0.602 },
  "nueva-masvida": { gesPremiumUf: 0.854, gesPremiumUfLegacy: 0.795 },
  esencial: { gesPremiumUf: 0.91, gesPremiumUfLegacy: 0.8 },
  "cruz-blanca": { gesPremiumUf: 0.971, gesPremiumUfLegacy: 0.74 },
  colmena: { gesPremiumUf: 1.036, gesPremiumUfLegacy: 0.77 },
};

export const DEFAULT_GES_PREMIUM_UF = 0.731;

export function resolveGesPremiumUf(
  value: number | null | undefined,
  fallback: number = DEFAULT_GES_PREMIUM_UF,
): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}
