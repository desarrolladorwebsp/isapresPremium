import type { ClientPlanSnapshot } from "@/types/client-plan";

export function formatClientPlanLabel(
  plan: ClientPlanSnapshot | null | undefined,
): string {
  if (!plan?.planCode) return "—";
  const name = plan.planName?.trim() || plan.planCode;
  const isapre = plan.isapre?.trim();
  return isapre ? `${isapre} · ${name}` : name;
}

export function formatClientPlanPrice(
  plan: ClientPlanSnapshot | null | undefined,
): string | null {
  if (!plan) return null;
  if (plan.finalPriceUf != null) {
    return `${plan.finalPriceUf.toFixed(2)} UF`;
  }
  if (plan.finalPriceClp != null) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(plan.finalPriceClp);
  }
  return null;
}
