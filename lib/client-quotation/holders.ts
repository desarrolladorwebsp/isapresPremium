import { resolveClientProfile } from "@/lib/client-profile/constants";

export interface QuotationHolderSelection {
  holderId: string;
  name: string;
  planCode: string;
  isapre: string;
  receivedAt: string | null;
}

export function quotationHolders(profile: unknown, fullName: string) {
  const { additionalTitulares } = resolveClientProfile(profile, { fullName });
  return [
    { holderId: "primary", name: fullName || "Titular principal" },
    ...additionalTitulares.map((holder, index) => ({
      holderId: `additional:${holder.id}`,
      name: `${holder.firstNames} ${holder.lastNames}`.trim() || `Titular ${index + 2}`,
    })),
  ];
}

export function selectQuotationPlans(
  holders: ReturnType<typeof quotationHolders>,
  plans: readonly { planCode: string; isapre: string }[],
  input: unknown,
): QuotationHolderSelection[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Selecciona un plan para cada titular.");
  }
  const choices = input as Record<string, unknown>;
  if (Object.keys(choices).length !== holders.length || new Set(holders.map(h => h.holderId)).size !== holders.length) {
    throw new Error("La selección debe incluir a cada titular una sola vez.");
  }
  return holders.map(holder => {
    const plan = plans.find(item => item.planCode === choices[holder.holderId]);
    if (!plan) throw new Error("Selecciona un plan de la cotización para cada titular.");
    return { ...holder, planCode: plan.planCode, isapre: plan.isapre, receivedAt: null };
  });
}
