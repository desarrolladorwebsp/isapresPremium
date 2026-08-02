"use client";

import {
  AdminBadge,
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from "@/components/admin/admin-data-table";
import { formatPlanUf } from "@/domain";
import type { Clinic } from "@/domain";
import {
  countCoverageEntries,
  getPlansForClinic,
  getZoneLabel,
  type ClinicPlanUsage,
} from "@/lib/clinic-admin";
import type { HealthPlan } from "@/types/plan";

export interface ClinicPlansModalContentProps {
  clinic: Clinic;
  plans: HealthPlan[];
}

function formatCoverageSummary(entries: ClinicPlanUsage["coverages"]): string {
  return entries
    .map((entry) => `${entry.type === "hospitalaria" ? "H" : "A"} ${entry.percentage}%`)
    .join(" · ");
}

export function ClinicPlansModalContent({
  clinic,
  plans,
}: ClinicPlansModalContentProps) {
  const linkedPlans = getPlansForClinic(plans, clinic.id);
  const coverageCount = countCoverageEntries(plans, clinic.id);

  if (linkedPlans.length === 0) {
    return (
      <p className="text-sm text-muted">
        Ningún plan del catálogo incluye esta clínica en su cobertura.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <span className="font-semibold text-foreground">{linkedPlans.length}</span>{" "}
        plan{linkedPlans.length === 1 ? "" : "es"} ·{" "}
        <span className="font-semibold text-foreground">{coverageCount}</span>{" "}
        línea{coverageCount === 1 ? "" : "s"} de cobertura
      </p>

      <div className="overflow-x-auto rounded-xl border">
        <AdminTable minWidth="40rem">
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Plan</AdminTableHeaderCell>
              <AdminTableHeaderCell>Isapre</AdminTableHeaderCell>
              <AdminTableHeaderCell>Código</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Precio base</AdminTableHeaderCell>
              <AdminTableHeaderCell>Cobertura en clínica</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {linkedPlans.map(({ plan, coverages }) => (
              <AdminTableRow key={plan.unique_code}>
                <AdminTableCell>
                  <p className="font-semibold text-foreground">{plan.plan_name}</p>
                </AdminTableCell>
                <AdminTableCell>{plan.isapre}</AdminTableCell>
                <AdminTableCell>
                  <code className="font-mono text-xs text-muted">
                    {plan.unique_code}
                  </code>
                </AdminTableCell>
                <AdminTableCell align="right">
                  <span className="tabular-nums font-semibold">
                    {formatPlanUf(plan.base_price_uf)}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs text-muted">
                    {formatCoverageSummary(coverages)}
                  </span>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </div>
    </div>
  );
}

export function ClinicZoneBadges({ zoneIds }: { zoneIds: string[] }) {
  if (zoneIds.length === 0) {
    return <AdminBadge tone="warning">Sin zona</AdminBadge>;
  }

  return (
    <div className="flex max-w-xs flex-wrap gap-1.5">
      {zoneIds.map((zoneId) => (
        <AdminBadge key={zoneId} tone="primary">
          {getZoneLabel(zoneId)}
        </AdminBadge>
      ))}
    </div>
  );
}
