import type { HealthPlan } from "@/domain";

export function resolvePlanBadges(
  plan: HealthPlan,
  badges?: string[],
): string[] {
  if (badges && badges.length > 0) return badges;
  return plan.has_top ? ["Top"] : [];
}
