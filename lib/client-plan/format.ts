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
    return `${plan.finalPriceUf.toLocaleString("es-CL", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} UF`;
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

export function formatClientPlanBasePrice(
  plan: ClientPlanSnapshot | null | undefined,
): string | null {
  if (plan?.basePriceUf == null || !Number.isFinite(plan.basePriceUf)) {
    return null;
  }
  return `${plan.basePriceUf.toLocaleString("es-CL", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} UF`;
}
