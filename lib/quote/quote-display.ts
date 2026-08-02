import { REGION_OPTIONS, SEX_OPTIONS } from "@/lib/quote-criteria-options";
import { resolveCotizadorSourceLabel } from "@/lib/partner-entity/source-label";
import type { QuoteRecord } from "@/types/quote";

export function formatQuoteDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function resolvePartnerLabel(quote: QuoteRecord): string {
  return (
    resolveCotizadorSourceLabel(
      quote.partnerEntitySlug,
      quote.partnerEntityName,
    ) ?? "Sin origen"
  );
}

export function resolveRegionLabel(region: string | null | undefined): string {
  if (!region) return "—";
  return (
    REGION_OPTIONS.find((option) => option.value === region)?.label ?? region
  );
}

export function resolveSexLabel(sex: string | null | undefined): string {
  if (!sex) return "—";
  return SEX_OPTIONS.find((option) => option.value === sex)?.label ?? sex;
}

export function formatIncome(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const digits = value.replace(/\D/g, "");
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) return value;

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBeneficiaries(quote: QuoteRecord): string {
  const parts: string[] = [];

  if (quote.contributorAge != null) {
    parts.push(`Titular ${quote.contributorAge} años`);
  }

  if ((quote.dependentsCount ?? 0) > 0) {
    const ages =
      quote.dependentAges && quote.dependentAges.length > 0
        ? ` (${quote.dependentAges.join(", ")} años)`
        : "";
    parts.push(
      `${quote.dependentsCount} carga${quote.dependentsCount === 1 ? "" : "s"}${ages}`,
    );
  }

  if (quote.beneficiaryCount != null && quote.beneficiaryCount > 0) {
    parts.push(
      `${quote.beneficiaryCount} beneficiario${quote.beneficiaryCount === 1 ? "" : "s"}`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function normalizePhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  return digits.startsWith("56") ? `+${digits}` : `+56${digits}`;
}
