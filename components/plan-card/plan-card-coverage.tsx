"use client";

import { CoverageColumnCompact } from "./coverage-column-compact";
import {
  AmbulatoryCoverageIcon,
  HospitalCoverageIcon,
} from "./coverage-column-icons";
import type { PlanCardCoverageProps } from "./plan-card-coverage.types";

export type { PlanCardCoverageProps } from "./plan-card-coverage.types";

export function PlanCardCoverage({
  hospitalaria,
  ambulatoria,
  highlightHospitalClinicIds = [],
  highlightAmbulatoryClinicIds = [],
}: PlanCardCoverageProps) {
  return (
    <div className="grid border-t border-border md:grid-cols-2">
      <CoverageColumnCompact
        title="Cobertura hospitalaria"
        icon={<HospitalCoverageIcon />}
        entries={hospitalaria}
        barClassName="bg-coverage-gradient"
        percentClassName="text-primary-dark"
        headerClassName="text-primary-dark"
        badgeClassName="bg-primary/15 text-primary-dark ring-1 ring-primary/25"
        showDivider
        highlightClinicIds={highlightHospitalClinicIds}
      />
      <CoverageColumnCompact
        title="Cobertura ambulatoria"
        icon={<AmbulatoryCoverageIcon />}
        entries={ambulatoria}
        barClassName="bg-secondary"
        percentClassName="text-secondary"
        headerClassName="text-secondary"
        badgeClassName="bg-secondary-muted text-secondary ring-1 ring-secondary/30"
        highlightClinicIds={highlightAmbulatoryClinicIds}
      />
    </div>
  );
}
