"use client";

import { useMemo, useState } from "react";
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
import {
  ClinicPlansModalContent,
  ClinicZoneBadges,
} from "@/components/admin/clinic-plans-modal";
import { ClinicLocationModalContent } from "@/components/admin/clinic-location-modal";
import {
  createClinic,
  createEmptyClinic,
  deleteClinic,
  updateClinic,
} from "@/lib/api/admin-client";
import { resolveClinicLocation } from "@/lib/clinic-locations";
import {
  clinicMatchesZoneFilter,
  countCoverageEntries,
  getClinicZoneIds,
  getPlansForClinic,
  sortClinics,
  type ClinicSortKey,
} from "@/lib/clinic-admin";
import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { Clinic, HealthPlan } from "@/domain";
import { ClinicForm } from "./clinic-form";

export interface ClinicsPanelProps {
  clinics: Clinic[];
  plans: HealthPlan[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, tone?: "success" | "error") => void;
  canManage?: boolean;
}

type FormMode = "create" | "edit" | null;

export function ClinicsPanel({
  clinics,
  plans,
  loading,
  onRefresh,
  onNotify,
  canManage = true,
}: ClinicsPanelProps) {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<ClinicSortKey>("name_asc");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [draftClinic, setDraftClinic] = useState<Clinic>(createEmptyClinic());
  const [plansModalClinic, setPlansModalClinic] = useState<Clinic | null>(null);
  const [locationModalClinic, setLocationModalClinic] =
    useState<Clinic | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredClinics = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = clinics.filter((clinic) => {
      if (!clinicMatchesZoneFilter(clinic, zoneFilter)) return false;
      if (!query) return true;

      const zoneLabels = getClinicZoneIds(clinic).join(" ");
      return (
        clinic.name.toLowerCase().includes(query) ||
        clinic.id.toLowerCase().includes(query) ||
        zoneLabels.toLowerCase().includes(query)
      );
    });

    return sortClinics(matched, plans, sortKey);
  }, [clinics, plans, search, zoneFilter, sortKey]);

  const activeLocationClinic = useMemo(() => {
    if (!locationModalClinic) return null;
    return (
      clinics.find((clinic) => clinic.id === locationModalClinic.id) ??
      locationModalClinic
    );
  }, [clinics, locationModalClinic]);

  function openCreateForm() {
    setDraftClinic(createEmptyClinic());
    setFormMode("create");
  }

  function openEditForm(clinic: Clinic) {
    setDraftClinic(clinic);
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode(null);
  }

  async function handleSave(clinic: Clinic) {
    setSaving(true);
    try {
      if (formMode === "create") {
        await createClinic(clinic);
        onNotify("Clínica creada correctamente.");
      } else {
        await updateClinic(clinic);
        onNotify("Clínica actualizada. Los planes vinculados se sincronizaron.");
      }
      await onRefresh();
      closeForm();
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la clínica.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(clinic: Clinic) {
    const usage = countCoverageEntries(plans, clinic.id);
    if (usage > 0) {
      onNotify(
        `No se puede eliminar: está asociada a ${usage} cobertura(s).`,
        "error",
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la clínica "${clinic.name}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteClinic(clinic.id);
      onNotify("Clínica eliminada.");
      if (formMode === "edit" && draftClinic.id === clinic.id) {
        closeForm();
      }
      await onRefresh();
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la clínica.",
        "error",
      );
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Clínicas y prestadores"
        description="Prestadores reutilizables al configurar coberturas en los planes de salud."
        actions={
          <>
            <AdminRefreshButton onClick={() => void onRefresh()} />
            {canManage ? (
              <Button size="sm" onClick={openCreateForm}>
                Agregar clínica
              </Button>
            ) : null}
          </>
        }
      />

      <AdminToolbar className="lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, identificador o zona…"
          className={joinClasses("h-11", ui.input)}
        />
        <select
          value={zoneFilter}
          onChange={(event) => setZoneFilter(event.target.value)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Filtrar por zona"
        >
          <option value="all">Todas las zonas</option>
          <option value="none">Sin zona asignada</option>
          {ZONE_FILTER_OPTIONS.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as ClinicSortKey)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          aria-label="Ordenar clínicas"
        >
          <option value="name_asc">Nombre A → Z</option>
          <option value="name_desc">Nombre Z → A</option>
          <option value="zone_asc">Zona (A → Z)</option>
          <option value="plans_desc">Más planes primero</option>
          <option value="plans_asc">Menos planes primero</option>
        </select>
      </AdminToolbar>

      <AdminTableCard
        loading={loading}
        empty={!loading && filteredClinics.length === 0}
        emptyTitle="No hay clínicas para mostrar"
        emptyDescription="Agrega un prestador o ajusta la búsqueda y filtros."
        loadingMessage="Cargando clínicas…"
        footer={`Mostrando ${filteredClinics.length} de ${clinics.length} prestadores.`}
      >
        <AdminTable minWidth="76rem">
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Nombre</AdminTableHeaderCell>
              <AdminTableHeaderCell>Identificador</AdminTableHeaderCell>
              <AdminTableHeaderCell>Dirección (mapa)</AdminTableHeaderCell>
              <AdminTableHeaderCell>Zonas geográficas</AdminTableHeaderCell>
              <AdminTableHeaderCell align="center">Planes</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Acciones</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredClinics.map((clinic) => {
              const zoneIds = getClinicZoneIds(clinic);
              const linkedPlans = getPlansForClinic(plans, clinic.id);
              const coverageCount = countCoverageEntries(plans, clinic.id);
              const resolvedLocation = resolveClinicLocation(clinic);
              const locationSource = clinic.location?.source ?? resolvedLocation?.source;

              return (
                <AdminTableRow
                  key={clinic.id}
                  selected={formMode === "edit" && draftClinic.id === clinic.id}
                >
                  <AdminTableCell>
                    <p className="font-semibold text-foreground">{clinic.name}</p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <code className="rounded bg-bg-layout px-1.5 py-0.5 font-mono text-xs text-muted">
                      {clinic.id}
                    </code>
                  </AdminTableCell>
                  <AdminTableCell>
                    {resolvedLocation ? (
                      <div className="max-w-[18rem]">
                        <span className="block truncate text-sm text-foreground">
                          {resolvedLocation.address}
                        </span>
                        {!clinic.location ? (
                          <span className="mt-0.5 block text-[10px] text-muted">
                            Referencia (pendiente en BD)
                          </span>
                        ) : locationSource ? (
                          <span className="mt-0.5 block text-[10px] text-muted">
                            Fuente: {locationSource}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600">
                        Sin dirección
                      </span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <ClinicZoneBadges zoneIds={zoneIds} />
                  </AdminTableCell>
                  <AdminTableCell align="center">
                    <div className="flex flex-col items-center gap-2">
                      <AdminBadge tone={linkedPlans.length > 0 ? "info" : "neutral"}>
                        {linkedPlans.length}
                      </AdminBadge>
                      {coverageCount > linkedPlans.length ? (
                        <span className="text-[10px] text-muted">
                          {coverageCount} coberturas
                        </span>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={linkedPlans.length === 0}
                        onClick={() => setPlansModalClinic(clinic)}
                      >
                        Ver planes
                      </Button>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {canManage ? (
                      <AdminRowActions>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setLocationModalClinic(clinic)}
                        >
                          Ubicación
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditForm(clinic)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={coverageCount > 0}
                          onClick={() => void handleDelete(clinic)}
                        >
                          Eliminar
                        </Button>
                      </AdminRowActions>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>

      {canManage ? (
        <AdminFormModal
          open={formMode !== null}
          title={formMode === "create" ? "Nueva clínica" : "Editar clínica"}
        description={
          formMode === "edit"
            ? `Identificador: ${draftClinic.id}`
            : "El identificador se usa en las coberturas de los planes."
        }
        onClose={closeForm}
        size="md"
      >
        <ClinicForm
          initialValue={draftClinic}
          isEditing={formMode === "edit"}
          saving={saving}
          embedded
          onSubmit={handleSave}
          onCancel={closeForm}
        />
      </AdminFormModal>
      ) : null}

      <AdminFormModal
        open={plansModalClinic !== null}
        title={plansModalClinic ? `Planes — ${plansModalClinic.name}` : "Planes"}
        description={
          plansModalClinic
            ? `Prestador ${plansModalClinic.id}`
            : undefined
        }
        onClose={() => setPlansModalClinic(null)}
        size="xl"
      >
        {plansModalClinic ? (
          <ClinicPlansModalContent clinic={plansModalClinic} plans={plans} />
        ) : null}
      </AdminFormModal>

      {canManage ? (
        <AdminFormModal
          open={locationModalClinic !== null}
          title={
            locationModalClinic
              ? `Ubicación — ${locationModalClinic.name}`
              : "Ubicación"
          }
          description="Valida y actualiza la dirección que se muestra en el mapa."
          onClose={() => setLocationModalClinic(null)}
          size="md"
        >
          {activeLocationClinic ? (
            <ClinicLocationModalContent
              clinic={activeLocationClinic}
              onSaved={onRefresh}
              onNotify={onNotify}
              onClose={() => setLocationModalClinic(null)}
            />
          ) : null}
        </AdminFormModal>
      ) : null}
    </AdminPanel>
  );
}
