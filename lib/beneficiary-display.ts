import {
  getPrimaryContributorAge,
  normalizeFamilyBeneficiaries,
} from "@/lib/beneficiary-state";
import type { FamilyBeneficiariesState } from "@/types/beneficiary";

export function getConfirmedDependents(
  beneficiaries: FamilyBeneficiariesState,
) {
  return normalizeFamilyBeneficiaries(beneficiaries).dependents.filter(
    (dependent) => dependent.age !== null,
  );
}

export function formatBeneficiariesBarSummary(
  beneficiaries: FamilyBeneficiariesState,
): string | null {
  const parts: string[] = [];
  const normalized = normalizeFamilyBeneficiaries(beneficiaries);
  const confirmed = getConfirmedDependents(normalized);
  const contributors = normalized.contributors.filter(
    (person) => person.age !== null,
  );

  if (contributors.length === 1) {
    parts.push(`Cotizante ${contributors[0]!.age} años`);
  } else if (contributors.length > 1) {
    const ages = contributors.map((person) => `${person.age} años`).join(", ");
    parts.push(`${contributors.length} cotizantes (${ages})`);
  }

  if (confirmed.length > 0) {
    const ages = confirmed.map((dependent) => `${dependent.age} años`).join(", ");
    parts.push(
      `${confirmed.length} carga${confirmed.length === 1 ? "" : "s"} (${ages})`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatDependentsCountLabel(count: number): string {
  if (count === 0) return "Sin cargas";
  return `${count} carga${count === 1 ? "" : "s"}`;
}

export { getPrimaryContributorAge };
