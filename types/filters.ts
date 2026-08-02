export type PlanTypeFilterId = "closed" | "free_choice" | "preferred";

export type CoveragePercentageOption = 40 | 50 | 60 | 70 | 80 | 90 | 100;

export interface CheckboxFilterState {
  [optionId: string]: boolean;
}

export interface DashboardFiltersState {
  isapres: CheckboxFilterState;
  zones: CheckboxFilterState;
  planTypes: CheckboxFilterState;
  /** Clínicas preferidas para cobertura hospitalaria (OR); no disponible en el widget embebido. */
  hospitalClinicIds: string[];
  /** Clínicas preferidas para cobertura ambulatoria (OR); no disponible en el widget embebido. */
  ambulatoryClinicIds: string[];
  hospitalCoveragePercent: CoveragePercentageOption | null;
  ambulatoryCoveragePercent: CoveragePercentageOption | null;
}

export interface FilterOption {
  id: string;
  label: string;
}
