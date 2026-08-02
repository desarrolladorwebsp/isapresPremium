"use client";

import { useState } from "react";
import { PlanPdfReportPanel } from "@/components/admin/plan-pdf-report-panel";
import { PlansPanel } from "@/components/admin/plans-panel";
import { joinClasses } from "@/lib/utils";
import type { Clinic, HealthPlan } from "@/domain";

type AdminPlansTab = "planes" | "pdfs";

export interface PlansAndPdfsAdminViewProps {
  plans: HealthPlan[];
  clinics: Clinic[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

const TABS: Array<{ id: AdminPlansTab; label: string; hint: string }> = [
  {
    id: "planes",
    label: "Planes",
    hint: "Listado, alta, edición y baja de planes",
  },
  {
    id: "pdfs",
    label: "Reporte PDFs",
    hint: "Cobertura de PDFs por isapre y carga de archivos",
  },
];

/**
 * Contenedor admin: CRUD de planes + reporte/upload de PDFs.
 * Reutiliza PlansPanel y PlanPdfReportPanel sin duplicar lógica.
 */
export function PlansAndPdfsAdminView({
  plans,
  clinics,
  loading,
  onRefresh,
  onNotify,
}: PlansAndPdfsAdminViewProps) {
  const [tab, setTab] = useState<AdminPlansTab>("planes");
  const [pdfRefreshKey, setPdfRefreshKey] = useState(0);

  async function handleCatalogRefresh() {
    await onRefresh();
    // Forzar recarga del reporte PDF tras mutaciones de planes.
    setPdfRefreshKey((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div
        role="tablist"
        aria-label="Planes y PDFs"
        className="flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1 shadow-sm"
      >
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={item.hint}
              onClick={() => setTab(item.id)}
              className={joinClasses(
                "min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-bold transition sm:flex-none sm:px-4",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                  : "text-muted hover:bg-surface-hover hover:text-primary-dark",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "planes" ? (
        <PlansPanel
          plans={plans}
          clinics={clinics}
          loading={loading}
          onRefresh={handleCatalogRefresh}
          onNotify={onNotify}
        />
      ) : (
        <PlanPdfReportPanel key={pdfRefreshKey} onNotify={onNotify} />
      )}
    </div>
  );
}
