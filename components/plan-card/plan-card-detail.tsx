"use client";

import { joinClasses } from "@/lib/utils";
import type { CoverageEntry } from "@/domain";
import { CoverageColumnCompact } from "./coverage-column-compact";
import {
  AmbulatoryCoverageIcon,
  HospitalCoverageIcon,
} from "./coverage-column-icons";

export interface PlanCardDetailProps {
  hospitalaria: CoverageEntry[];
  ambulatoria: CoverageEntry[];
}

export function PlanCardDetail({
  hospitalaria,
  ambulatoria,
}: PlanCardDetailProps) {
  return (
    <div
      className={joinClasses(
        "grid border-t border-border bg-bg-layout/20 md:grid-cols-2",
      )}
    >
      <CoverageColumnCompact
        title="Cobertura hospitalaria"
        icon={<HospitalCoverageIcon />}
        entries={hospitalaria}
        barClassName="bg-primary"
        percentClassName="text-primary-dark"
        showDivider
      />
      <CoverageColumnCompact
        title="Cobertura ambulatoria"
        icon={<AmbulatoryCoverageIcon />}
        entries={ambulatoria}
        barClassName="bg-secondary"
        percentClassName="text-secondary"
      />
    </div>
  );
}
