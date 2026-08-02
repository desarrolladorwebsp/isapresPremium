import {
  calculateFinalPlanPriceClp,
  buildPlanFinalPriceQuote,
} from "@/lib/plan-final-price";
import { resolveGesPremiumUf } from "@/lib/isapre-pricing-rules";
import {
  formatBasePriceBadgeLabel,
  PLAN_TYPE_LABELS,
  resolveCommercialPlanName,
  resolvePrimaryPlanType,
} from "@/lib/plan-metadata";
import { formatPlanClp, formatQuotedUf, splitCoverageByType } from "@/lib/plan-format";
import { getPlanPdfDownloadUrl, planHasPdf } from "@/lib/plan-pdf";
import { resolveAppBaseUrl } from "@/lib/platform/routing";
import {
  buildPlanAgreementPriceDisplay,
  buildPlanAgreementPriceDisplayWithMapping,
  resolveAgreementDiscountPercentForPlan,
  resolveAgreementPlanMapping,
  type PlanAgreementPriceDisplay,
} from "@/lib/company-agreements/plan-price-discount";
import type { BeneficiaryGroupSummary, PersonRiskFactor } from "@/types/beneficiary";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";
import type { CoverageEntry, HealthPlan } from "@/types/plan";

export interface PlanWhatsAppShareInput {
  plan: HealthPlan;
  beneficiarySummary: BeneficiaryGroupSummary;
  ufToClp: number;
  highlightHospitalClinicIds?: string[];
  highlightAmbulatoryClinicIds?: string[];
  /** Si se informa, antepone saludo con el primer nombre. */
  clientFullName?: string | null;
  /** Convenio validado en el cotizador ejecutivo (misma fuente que la card). */
  validatedAgreement?: ValidatedCompanyAgreement | null;
}

function firstNameFromFullName(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || null;
}

function formatBaseBracket(basePriceUf: number): string {
  const label = formatBasePriceBadgeLabel(basePriceUf);
  // "BASE 2,50" → "Base 2,50"
  const normalized = label.replace(/^BASE\s+/i, "Base ");
  return `[${normalized}]`;
}

function formatDiscountPercentLabel(percent: number): string {
  const formatted = Number.isInteger(percent)
    ? String(percent)
    : percent.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `${formatted}%`;
}

function personUnitPriceUf(
  person: PersonRiskFactor,
  basePriceUf: number,
  gesPremiumUfPerPerson: number,
): number {
  const factor = person.factor ?? 0;
  return factor * basePriceUf + gesPremiumUfPerPerson;
}

function formatBeneficiaryLine(
  label: string,
  age: number | null,
  uf: number,
  clp: number,
): string {
  const agePart = age != null ? String(age) : "—";
  return `${label} ${agePart} : ${formatQuotedUf(uf)} - ${formatPlanClp(clp)}`;
}

function buildBeneficiaryValueLines(
  summary: BeneficiaryGroupSummary,
  basePriceUf: number,
  gesPremiumUfPerPerson: number,
  ufToClp: number,
  /** Factor 0–1 aplicado sobre el valor unitario (descuento % convenio). */
  priceFactor = 1,
): string[] {
  const lines: string[] = [];
  const applyFactor = (uf: number) =>
    Math.round(uf * priceFactor * 1_000_000) / 1_000_000;

  if (summary.contributor.age != null || summary.beneficiaryCount > 0) {
    const uf = applyFactor(
      personUnitPriceUf(
        summary.contributor,
        basePriceUf,
        gesPremiumUfPerPerson,
      ),
    );
    lines.push(
      formatBeneficiaryLine(
        "Cotizante",
        summary.contributor.age,
        uf,
        calculateFinalPlanPriceClp(uf, ufToClp),
      ),
    );
  }

  for (const dependent of summary.dependents) {
    const uf = applyFactor(
      personUnitPriceUf(dependent, basePriceUf, gesPremiumUfPerPerson),
    );
    lines.push(
      formatBeneficiaryLine(
        "Carga",
        dependent.age,
        uf,
        calculateFinalPlanPriceClp(uf, ufToClp),
      ),
    );
  }

  return lines;
}

function formatCoverageLines(
  entries: CoverageEntry[],
  highlightedClinicIds: string[],
): string[] {
  const highlight = new Set(highlightedClinicIds);
  return entries.map((entry) => {
    const star = highlight.has(entry.clinic_id) ? " ⭐" : "";
    return `${entry.percentage}% ${entry.clinic_name}${star}`;
  });
}

function resolveAgreementPricesForPlan(
  plan: HealthPlan,
  beneficiarySummary: BeneficiaryGroupSummary,
  ufToClp: number,
  agreement: ValidatedCompanyAgreement | null | undefined,
): {
  standardQuote: ReturnType<typeof buildPlanFinalPriceQuote>;
  agreementPrices: PlanAgreementPriceDisplay;
  activeBasePriceUf: number;
  mappingCode: string | null;
} {
  const standardQuote = buildPlanFinalPriceQuote(
    plan.base_price_uf,
    beneficiarySummary,
    ufToClp,
    plan.ges_premium_uf,
  );

  const mapping = resolveAgreementPlanMapping(
    plan.unique_code,
    plan.isapre,
    agreement,
  );

  if (mapping) {
    const convenioQuote = buildPlanFinalPriceQuote(
      mapping.price,
      beneficiarySummary,
      ufToClp,
      plan.ges_premium_uf,
    );
    return {
      standardQuote,
      agreementPrices: buildPlanAgreementPriceDisplayWithMapping(
        standardQuote,
        convenioQuote,
      ),
      activeBasePriceUf: mapping.price,
      mappingCode: mapping.code,
    };
  }

  const discountPercent = resolveAgreementDiscountPercentForPlan(
    plan.isapre,
    agreement,
  );
  return {
    standardQuote,
    agreementPrices: buildPlanAgreementPriceDisplay(
      standardQuote,
      discountPercent,
    ),
    activeBasePriceUf: plan.base_price_uf,
    mappingCode: null,
  };
}

/** Convierte ruta relativa de PDF en URL absoluta para WhatsApp. */
export function resolveAbsolutePlanPdfUrl(plan: HealthPlan): string | null {
  if (!planHasPdf(plan)) return null;
  const url = getPlanPdfDownloadUrl(plan);
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = resolveAppBaseUrl().replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Bloques de un plan (sin saludo). Reutilizado por mensaje individual y masivo. */
function buildPlanShareBlocks(
  input: Omit<PlanWhatsAppShareInput, "clientFullName">,
): string[] {
  const {
    plan,
    beneficiarySummary,
    ufToClp,
    highlightHospitalClinicIds = [],
    highlightAmbulatoryClinicIds = [],
    validatedAgreement = null,
  } = input;

  const { standardQuote, agreementPrices, activeBasePriceUf, mappingCode } =
    resolveAgreementPricesForPlan(
      plan,
      beneficiarySummary,
      ufToClp,
      validatedAgreement,
    );

  const gesRate = resolveGesPremiumUf(plan.ges_premium_uf);
  const planTypeLabel = PLAN_TYPE_LABELS[resolvePrimaryPlanType(plan)];
  const commercialName = resolveCommercialPlanName(plan);
  const { hospitalaria, ambulatoria } = splitCoverageByType(plan.coverage);
  const pdfUrl = resolveAbsolutePlanPdfUrl(plan);
  const hasConvenio = agreementPrices.hasAgreementDiscount;
  const priceFactor = hasConvenio
    ? Math.max(0, 1 - agreementPrices.discountPercent / 100)
    : 1;
  // Con mapping el base ya es el de convenio; no reaplicar % sobre el unitario.
  const beneficiaryBaseUf = hasConvenio
    ? activeBasePriceUf
    : plan.base_price_uf;
  const beneficiaryFactor =
    hasConvenio && mappingCode == null ? priceFactor : 1;

  const blocks: string[] = [];

  blocks.push(`📌 *PLAN DE SALUD* [${planTypeLabel}]`);
  blocks.push(`✅ *${plan.isapre} - ${commercialName}*`);
  blocks.push(
    `(${plan.unique_code}) ${formatBaseBracket(activeBasePriceUf)}`,
  );

  if (hasConvenio && validatedAgreement) {
    blocks.push("");
    blocks.push("🏢 *CONVENIO EMPRESA*");
    blocks.push(validatedAgreement.companyName.trim());
    if (validatedAgreement.isapreName?.trim()) {
      blocks.push(`Isapre convenio: ${validatedAgreement.isapreName.trim()}`);
    }
    blocks.push(
      `Descuento: −${formatDiscountPercentLabel(agreementPrices.discountPercent)}`,
    );
    if (mappingCode) {
      blocks.push(`Código plan convenio: ${mappingCode}`);
    }
  }

  blocks.push("");
  blocks.push("✅ *VALOR POR BENEFICIARIO*");
  const beneficiaryLines = buildBeneficiaryValueLines(
    beneficiarySummary,
    beneficiaryBaseUf,
    gesRate,
    ufToClp,
    beneficiaryFactor,
  );
  if (beneficiaryLines.length > 0) {
    blocks.push(...beneficiaryLines);
  } else {
    blocks.push("Sin beneficiarios configurados");
  }
  blocks.push("");

  if (hasConvenio) {
    blocks.push("✅ *VALOR MENSUAL*");
    blocks.push(
      `Lista: ${formatQuotedUf(agreementPrices.listFinalPriceUf)} - ${formatPlanClp(agreementPrices.listFinalPriceClp)}`,
    );
    blocks.push(
      `Con convenio (−${formatDiscountPercentLabel(agreementPrices.discountPercent)}): ${formatQuotedUf(agreementPrices.displayFinalPriceUf)} - ${formatPlanClp(agreementPrices.displayFinalPriceClp)}`,
    );
  } else {
    blocks.push("✅ *VALOR MENSUAL*");
    blocks.push(
      `${formatQuotedUf(standardQuote.finalPriceUf)} - ${formatPlanClp(standardQuote.finalPriceClp)}`,
    );
  }

  if (pdfUrl) {
    blocks.push("");
    blocks.push("🔎 *VER Y DESCARGAR PLAN* 📋");
    blocks.push(`🔗 ${pdfUrl}`);
  }

  if (hospitalaria.length > 0) {
    blocks.push("");
    blocks.push("🏥 *COBERTURA HOSPITALARIA:*");
    blocks.push(
      ...formatCoverageLines(hospitalaria, highlightHospitalClinicIds),
    );
  }

  if (ambulatoria.length > 0) {
    blocks.push("");
    blocks.push("🩺 *COBERTURA AMBULATORIA:*");
    blocks.push(
      ...formatCoverageLines(ambulatoria, highlightAmbulatoryClinicIds),
    );
  }

  return blocks;
}

/**
 * Mensaje puntual de plan para compartir por WhatsApp / portapapeles.
 * Sin JSX; reutiliza precios, coberturas, PDF y convenio del cotizador ejecutivo.
 */
export function buildPlanWhatsAppMessage(input: PlanWhatsAppShareInput): string {
  const blocks: string[] = [];
  const firstName = firstNameFromFullName(input.clientFullName);
  if (firstName) {
    blocks.push(`Hola ${firstName},`);
    blocks.push("");
  }
  blocks.push(...buildPlanShareBlocks(input));
  return blocks.join("\n");
}

export interface SelectedPlansShareInput {
  plans: HealthPlan[];
  beneficiarySummary: BeneficiaryGroupSummary;
  ufToClp: number;
  highlightHospitalClinicIds?: string[];
  highlightAmbulatoryClinicIds?: string[];
  clientFullName?: string | null;
  validatedAgreement?: ValidatedCompanyAgreement | null;
}

/**
 * Mensaje consolidado para varios planes (WhatsApp / correo texto).
 * Un solo saludo; planes numerados como Alternativa N.
 */
export function buildSelectedPlansShareMessage(
  input: SelectedPlansShareInput,
): string {
  const {
    plans,
    beneficiarySummary,
    ufToClp,
    highlightHospitalClinicIds = [],
    highlightAmbulatoryClinicIds = [],
    clientFullName,
    validatedAgreement = null,
  } = input;

  if (plans.length === 0) return "";

  const blocks: string[] = [];
  const firstName = firstNameFromFullName(clientFullName);
  if (firstName) {
    blocks.push(`Hola ${firstName},`);
    blocks.push("");
  }

  blocks.push(
    `Te comparto ${plans.length} alternativa${plans.length === 1 ? "" : "s"} de planes de salud.`,
  );
  blocks.push("");

  plans.forEach((plan, index) => {
    if (index > 0) {
      blocks.push("");
      blocks.push("────────────");
      blocks.push("");
    }
    blocks.push(`*Alternativa ${index + 1}*`);
    blocks.push("");
    blocks.push(
      ...buildPlanShareBlocks({
        plan,
        beneficiarySummary,
        ufToClp,
        highlightHospitalClinicIds,
        highlightAmbulatoryClinicIds,
        validatedAgreement,
      }),
    );
  });

  return blocks.join("\n");
}

function tsvCell(value: string): string {
  return value.replace(/[\t\n\r]+/g, " ").trim();
}

function formatCoverageCompact(entries: CoverageEntry[]): string {
  if (entries.length === 0) return "—";
  return entries
    .map((entry) => `${entry.clinic_name} (${entry.percentage}%)`)
    .join("; ");
}

/** Tabla TSV (una fila por plan) para pegar en Excel / Sheets. */
export function buildSelectedPlansTableTsv(
  input: SelectedPlansShareInput,
): string {
  const headers = [
    "Isapre",
    "Nombre del plan",
    "Código",
    "Tipo",
    "Precio final UF",
    "Precio final CLP",
    "Cobertura hospitalaria",
    "Cobertura ambulatoria",
    "Enlace PDF",
  ];

  const rows = input.plans.map((plan) => {
    const { standardQuote, agreementPrices } = resolveAgreementPricesForPlan(
      plan,
      input.beneficiarySummary,
      input.ufToClp,
      input.validatedAgreement,
    );
    const finalUf = agreementPrices.hasAgreementDiscount
      ? agreementPrices.displayFinalPriceUf
      : standardQuote.finalPriceUf;
    const finalClp = agreementPrices.hasAgreementDiscount
      ? agreementPrices.displayFinalPriceClp
      : standardQuote.finalPriceClp;
    const { hospitalaria, ambulatoria } = splitCoverageByType(plan.coverage);

    return [
      plan.isapre,
      resolveCommercialPlanName(plan),
      plan.unique_code,
      PLAN_TYPE_LABELS[resolvePrimaryPlanType(plan)],
      formatQuotedUf(finalUf),
      formatPlanClp(finalClp),
      formatCoverageCompact(hospitalaria),
      formatCoverageCompact(ambulatoria),
      resolveAbsolutePlanPdfUrl(plan) ?? "",
    ].map(tsvCell);
  });

  return [headers, ...rows].map((row) => row.join("\t")).join("\n");
}

/** Snapshot tipado para correo ejecutivo (sin HTML). */
export interface SelectedPlanEmailSnapshot {
  isapre: string;
  name: string;
  code: string;
  type: string;
  priceUf: string;
  priceClp: string;
  listPriceUf: string | null;
  listPriceClp: string | null;
  convenioLabel: string | null;
  hospitalCoverage: string;
  ambulatoryCoverage: string;
  pdfUrl: string | null;
}

export function buildSelectedPlansEmailSnapshots(
  input: SelectedPlansShareInput,
): SelectedPlanEmailSnapshot[] {
  return input.plans.map((plan) => {
    const { standardQuote, agreementPrices } = resolveAgreementPricesForPlan(
      plan,
      input.beneficiarySummary,
      input.ufToClp,
      input.validatedAgreement,
    );
    const hasConvenio = agreementPrices.hasAgreementDiscount;
    const { hospitalaria, ambulatoria } = splitCoverageByType(plan.coverage);

    return {
      isapre: plan.isapre,
      name: resolveCommercialPlanName(plan),
      code: plan.unique_code,
      type: PLAN_TYPE_LABELS[resolvePrimaryPlanType(plan)],
      priceUf: formatQuotedUf(
        hasConvenio
          ? agreementPrices.displayFinalPriceUf
          : standardQuote.finalPriceUf,
      ),
      priceClp: formatPlanClp(
        hasConvenio
          ? agreementPrices.displayFinalPriceClp
          : standardQuote.finalPriceClp,
      ),
      listPriceUf: hasConvenio
        ? formatQuotedUf(agreementPrices.listFinalPriceUf)
        : null,
      listPriceClp: hasConvenio
        ? formatPlanClp(agreementPrices.listFinalPriceClp)
        : null,
      convenioLabel:
        hasConvenio && input.validatedAgreement
          ? `${input.validatedAgreement.companyName.trim()} (−${formatDiscountPercentLabel(agreementPrices.discountPercent)})`
          : null,
      hospitalCoverage: formatCoverageCompact(hospitalaria),
      ambulatoryCoverage: formatCoverageCompact(ambulatoria),
      pdfUrl: resolveAbsolutePlanPdfUrl(plan),
    };
  });
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback abajo
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
