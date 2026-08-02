"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminFormModal,
  AdminPanel,
  AdminPanelHeader,
  AdminRefreshButton,
  AdminRowActions,
  AdminBadge,
  AdminTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from "@/components/admin/admin-data-table";
import { ClinicZoneBadges } from "@/components/admin/clinic-plans-modal";
import {
  createEmptyPlan,
  createPlan,
  deletePlan,
  importPlansBulkAdmin,
  updatePlan,
} from "@/lib/api/admin-client";
import { formatPlanUf } from "@/domain";
import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";
import {
  filterAndSortPlans,
  getPlanTypeLabel,
  getPlanZoneIds,
  ISAPRE_FILTER_OPTIONS,
  PLAN_TYPE_FILTER_OPTIONS,
  type PlanCoverageFilter,
  type PlanPdfFilter,
  type PlanSortKey,
} from "@/lib/plan-admin";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { Clinic, HealthPlan } from "@/domain";
import { PlanForm } from "./plan-form";

/** Plantilla oficial (Google Sheets) para carga / actualización masiva de planes. */
export const PLAN_BULK_IMPORT_TEMPLATE_URL =
  "https://docs.google.com/spreadsheets/d/1Epvertgw-tHTWWoHS5IULCVOFE5fvPGwGsvqr1UBPVg/edit?usp=sharing";

export interface PlansPanelProps {
  plans: HealthPlan[];
  clinics: Clinic[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

type FormMode = "create" | "edit" | null;

function PlanZoneBadgesCompact({ zoneIds }: { zoneIds: string[] }) {
  if (zoneIds.length <= 4) {
    return <ClinicZoneBadges zoneIds={zoneIds} />;
  }

  return (
    <div className="space-y-1">
      <ClinicZoneBadges zoneIds={zoneIds.slice(0, 3)} />
      <span className="text-[10px] font-medium text-muted">
        +{zoneIds.length - 3} zona{zoneIds.length - 3 === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export function PlansPanel({
  plans,
  clinics,
  loading,
  onRefresh,
  onNotify,
}: PlansPanelProps) {
  const [search, setSearch] = useState("");
  const [isapreFilter, setIsapreFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [planTypeFilter, setPlanTypeFilter] = useState("all");
  const [pdfFilter, setPdfFilter] = useState<PlanPdfFilter>("all");
  const [coverageFilter, setCoverageFilter] =
    useState<PlanCoverageFilter>("all");
  const [sortKey, setSortKey] = useState<PlanSortKey>("name_asc");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [draftPlan, setDraftPlan] = useState<HealthPlan>(createEmptyPlan());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const filteredPlans = useMemo(
    () =>
      filterAndSortPlans(plans, {
        search,
        isapre: isapreFilter,
        zone: zoneFilter,
        planType: planTypeFilter,
        pdf: pdfFilter,
        coverage: coverageFilter,
        sort: sortKey,
      }),
    [
      plans,
      search,
      isapreFilter,
      zoneFilter,
      planTypeFilter,
      pdfFilter,
      coverageFilter,
      sortKey,
    ],
  );

  function openCreateForm() {
    setDraftPlan(createEmptyPlan());
    setFormMode("create");
  }

  function openEditForm(plan: HealthPlan) {
    setDraftPlan(plan);
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode(null);
  }

  async function handleSave(plan: HealthPlan) {
    setSaving(true);
    try {
      if (formMode === "create") {
        await createPlan(plan);
        onNotify("Plan creado correctamente.");
      } else {
        await updatePlan(plan);
        onNotify("Plan actualizado correctamente.");
      }
      await onRefresh();
      closeForm();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo guardar el plan.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: HealthPlan) {
    const confirmed = window.confirm(
      `¿Eliminar el plan "${plan.plan_name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      await deletePlan(plan.unique_code);
      onNotify("Plan eliminado.");
      if (formMode === "edit" && draftPlan.unique_code === plan.unique_code) {
        closeForm();
      }
      await onRefresh();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo eliminar el plan.",
        "error",
      );
    }
  }

  async function handleBulkImport(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      onNotify("Solo se permiten archivos Excel (.xlsx / .xls).", "error");
      return;
    }

    setImporting(true);
    try {
      const result = await importPlansBulkAdmin(file);
      const parts = [
        `${result.processed} fila(s)`,
        result.created ? `${result.created} creados` : null,
        result.updated ? `${result.updated} actualizados` : null,
        result.deleted ? `${result.deleted} eliminados` : null,
      ].filter(Boolean);

      const warningHint =
        result.warnings.length > 0
          ? ` · ${result.warnings.length} aviso(s)`
          : "";

      onNotify(`Carga masiva OK: ${parts.join(" · ")}${warningHint}.`);
      await onRefresh();
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo importar el Excel de planes.",
        "error",
      );
    } finally {
      setImporting(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Planes de salud"
        description="Catálogo de planes del cotizador. Filtra por isapre, zona o tipo y ordena por nombre, precio o coberturas. Para cargas masivas usa la plantilla oficial."
        actions={
          <>
            <AdminRefreshButton onClick={() => void onRefresh()} />
            <a
              href={PLAN_BULK_IMPORT_TEMPLATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir plantilla de carga masiva en Google Sheets"
              className={joinClasses(
                "inline-flex h-9 items-center justify-center rounded-lg border border-primary/30 bg-white px-3 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
            >
              Formato carga masiva
            </a>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => void handleBulkImport(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={importing || loading}
              onClick={() => bulkFileInputRef.current?.click()}
            >
              {importing ? "Importando…" : "Subir Excel"}
            </Button>
            <Button size="sm" onClick={openCreateForm}>
              Agregar plan
            </Button>
          </>
        }
      />

      <AdminToolbar className="lg:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem]">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, código, isapre o zona…"
          className={joinClasses("h-11", ui.input)}
        />
        <select
          value={isapreFilter}
          onChange={(event) => setIsapreFilter(event.target.value)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Filtrar por isapre"
        >
          <option value="all">Todas las isapres</option>
          {ISAPRE_FILTER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={zoneFilter}
          onChange={(event) => setZoneFilter(event.target.value)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Filtrar por zona"
        >
          <option value="all">Todas las zonas</option>
          <option value="none">Sin zona</option>
          {ZONE_FILTER_OPTIONS.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as PlanSortKey)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Ordenar planes"
        >
          <option value="name_asc">Nombre A → Z</option>
          <option value="name_desc">Nombre Z → A</option>
          <option value="isapre_asc">Isapre A → Z</option>
          <option value="price_asc">Menor precio UF</option>
          <option value="price_desc">Mayor precio UF</option>
          <option value="coverage_desc">Más coberturas</option>
          <option value="coverage_asc">Menos coberturas</option>
        </select>
      </AdminToolbar>

      <AdminToolbar className="lg:grid-cols-[11rem_11rem_11rem_1fr]">
        <select
          value={planTypeFilter}
          onChange={(event) => setPlanTypeFilter(event.target.value)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Filtrar por tipo de plan"
        >
          <option value="all">Todos los tipos</option>
          {PLAN_TYPE_FILTER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={pdfFilter}
          onChange={(event) => setPdfFilter(event.target.value as PlanPdfFilter)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Filtrar por PDF"
        >
          <option value="all">PDF: todos</option>
          <option value="with_pdf">Con PDF</option>
          <option value="without_pdf">Sin PDF</option>
        </select>
        <select
          value={coverageFilter}
          onChange={(event) =>
            setCoverageFilter(event.target.value as PlanCoverageFilter)
          }
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Filtrar por cobertura"
        >
          <option value="all">Cobertura: todas</option>
          <option value="with_coverage">Con prestadores</option>
          <option value="without_coverage">Sin prestadores</option>
        </select>
        <div className="flex items-center rounded-xl border bg-bg-layout/50 px-4 text-sm text-muted">
          <span className="font-semibold text-foreground">
            {filteredPlans.length}
          </span>
          <span className="ml-1">de {plans.length} planes</span>
        </div>
      </AdminToolbar>

      <AdminTableCard
        loading={loading}
        empty={!loading && filteredPlans.length === 0}
        emptyTitle="No hay planes para mostrar"
        emptyDescription="Crea un plan nuevo o ajusta la búsqueda y filtros."
        loadingMessage="Cargando planes…"
        footer={`Mostrando ${filteredPlans.length} de ${plans.length} planes.`}
      >
        <AdminTable minWidth="72rem">
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Plan</AdminTableHeaderCell>
              <AdminTableHeaderCell>Código</AdminTableHeaderCell>
              <AdminTableHeaderCell>Isapre</AdminTableHeaderCell>
              <AdminTableHeaderCell>Tipo</AdminTableHeaderCell>
              <AdminTableHeaderCell>Zonas</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Precio base</AdminTableHeaderCell>
              <AdminTableHeaderCell align="center">Coberturas</AdminTableHeaderCell>
              <AdminTableHeaderCell align="center">PDF</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Acciones</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredPlans.map((plan) => {
              const zoneIds = getPlanZoneIds(plan);

              return (
                <AdminTableRow
                  key={plan.unique_code}
                  selected={
                    formMode === "edit" &&
                    draftPlan.unique_code === plan.unique_code
                  }
                >
                  <AdminTableCell>
                    <p className="font-semibold text-foreground">
                      {plan.plan_name}
                    </p>
                    {plan.has_top ? (
                      <p className="mt-1 text-xs text-muted">Incluye TOP</p>
                    ) : null}
                  </AdminTableCell>
                  <AdminTableCell>
                    <code className="rounded bg-bg-layout px-1.5 py-0.5 font-mono text-xs text-muted">
                      {plan.unique_code}
                    </code>
                  </AdminTableCell>
                  <AdminTableCell>{plan.isapre}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge tone="neutral">{getPlanTypeLabel(plan)}</AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <PlanZoneBadgesCompact zoneIds={zoneIds} />
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    <span className="tabular-nums font-semibold text-foreground">
                      {formatPlanUf(plan.base_price_uf)}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell align="center">
                    <AdminBadge
                      tone={plan.coverage.length > 0 ? "info" : "warning"}
                    >
                      {plan.coverage.length}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell align="center">
                    {plan.pdf_url ? (
                      <AdminBadge tone="success">Sí</AdminBadge>
                    ) : (
                      <AdminBadge tone="warning">No</AdminBadge>
                    )}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    <AdminRowActions>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditForm(plan)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => void handleDelete(plan)}
                      >
                        Eliminar
                      </Button>
                    </AdminRowActions>
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>

      <AdminFormModal
        open={formMode !== null}
        title={formMode === "create" ? "Nuevo plan de salud" : "Editar plan de salud"}
        description={
          formMode === "create"
            ? "Completa los datos del plan y sus coberturas por prestador."
            : `Código: ${draftPlan.unique_code}`
        }
        onClose={closeForm}
        size="xl"
      >
        <PlanForm
          initialValue={draftPlan}
          clinics={clinics}
          isEditing={formMode === "edit"}
          saving={saving}
          embedded
          onSubmit={handleSave}
          onCancel={closeForm}
        />
      </AdminFormModal>
    </AdminPanel>
  );
}
