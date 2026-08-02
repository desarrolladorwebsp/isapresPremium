import type { CotizacionNotifyConvenio } from "@/lib/email/cotizacion-notify-schema";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";

export function toCotizacionNotifyConvenio(
  agreement: ValidatedCompanyAgreement | null | undefined,
): CotizacionNotifyConvenio | undefined {
  if (!agreement) return undefined;

  const rutEmpresa = agreement.companyRutRaw?.trim() || agreement.companyRut;
  if (!rutEmpresa || !agreement.companyName.trim()) return undefined;

  return {
    rutEmpresa,
    nombreEmpresa: agreement.companyName.trim(),
    descuentoPercent: agreement.discountPercent ?? undefined,
    isapreId: agreement.isapreId ?? undefined,
    isapreName: agreement.isapreName ?? undefined,
  };
}

export function formatConvenioDiscountLabel(
  descuentoPercent: number | null | undefined,
): string {
  if (descuentoPercent == null) return "beneficio preferencial por convenio";
  const formatted = Number.isInteger(descuentoPercent)
    ? String(descuentoPercent)
    : descuentoPercent.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `hasta un ${formatted}% de descuento`;
}
