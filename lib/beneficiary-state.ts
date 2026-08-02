import type {
  DependentBeneficiary,
  FamilyBeneficiariesState,
  LegacyFamilyBeneficiariesState,
} from "@/types/beneficiary";

function sanitizePersons(
  persons: DependentBeneficiary[] | undefined,
): DependentBeneficiary[] {
  if (!Array.isArray(persons)) return [];
  return persons.filter(
    (person) =>
      person &&
      typeof person.id === "string" &&
      person.id.length > 0 &&
      (person.age === null || typeof person.age === "number"),
  );
}

export function createEmptyFamilyBeneficiaries(): FamilyBeneficiariesState {
  return { contributors: [], dependents: [] };
}

/** Migra `{ contributorAge, dependents }` o estado mixto → shape canónico. */
export function normalizeFamilyBeneficiaries(
  raw: LegacyFamilyBeneficiariesState | FamilyBeneficiariesState | null | undefined,
): FamilyBeneficiariesState {
  if (!raw || typeof raw !== "object") {
    return createEmptyFamilyBeneficiaries();
  }

  const dependents = sanitizePersons(raw.dependents);
  const fromArray = sanitizePersons(
    "contributors" in raw ? raw.contributors : undefined,
  );

  if (fromArray.length > 0) {
    return { contributors: fromArray, dependents };
  }

  const legacyAge =
    "contributorAge" in raw && typeof raw.contributorAge === "number"
      ? raw.contributorAge
      : null;

  if (legacyAge !== null) {
    return {
      contributors: [{ id: "contributor", age: legacyAge }],
      dependents,
    };
  }

  return { contributors: [], dependents };
}

export function getPrimaryContributorAge(
  state: FamilyBeneficiariesState | LegacyFamilyBeneficiariesState | null | undefined,
): number | null {
  const normalized = normalizeFamilyBeneficiaries(state);
  const primary = normalized.contributors.find(
    (person) => person.age !== null && typeof person.age === "number",
  );
  return primary?.age ?? null;
}

export function setPrimaryContributorAge(
  state: FamilyBeneficiariesState,
  age: number | null,
): FamilyBeneficiariesState {
  const rest = state.contributors.slice(1);
  if (age === null) {
    return { ...state, contributors: rest };
  }

  const primary = state.contributors[0];
  return {
    ...state,
    contributors: [
      { id: primary?.id ?? "contributor", age },
      ...rest,
    ],
  };
}
