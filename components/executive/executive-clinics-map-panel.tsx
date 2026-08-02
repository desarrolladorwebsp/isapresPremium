"use client";

import { useMemo, useState } from "react";
import { GoogleMapsClinicsMap } from "@/components/maps/google-maps-clinics-map";
import { Input } from "@/components/ui/input";
import {
  AdminBadge,
  AdminPanel,
  AdminPanelHeader,
  AdminRefreshButton,
} from "@/components/admin/admin-data-table";
import { getClinicZoneIds, getZoneLabel } from "@/lib/clinic-admin";
import {
  attachClinicLocations,
  dedupeClinicMapLocations,
} from "@/lib/clinic-locations";
import { ZONE_FILTER_OPTIONS } from "@/lib/filter-options";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { Clinic } from "@/types/clinic";

export interface ExecutiveClinicsMapPanelProps {
  clinics: Clinic[];
  loading: boolean;
  /** Refetch en curso sin vaciar el mapa (stale-while-revalidate). */
  refreshing?: boolean;
  onRefresh: () => Promise<void>;
}

export function ExecutiveClinicsMapPanel({
  clinics,
  loading,
  refreshing = false,
  onRefresh,
}: ExecutiveClinicsMapPanelProps) {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  const markers = useMemo(() => attachClinicLocations(clinics), [clinics]);

  const filteredMarkers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return markers.filter((marker) => {
      const zoneIds = marker.zones.length > 0 ? marker.zones : [];
      const resolvedZones =
        zoneIds.length > 0
          ? zoneIds
          : getClinicZoneIds({ id: marker.id, name: marker.name, zones: [] });

      if (zoneFilter !== "all" && !resolvedZones.includes(zoneFilter)) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        marker.name,
        marker.location.address,
        ...resolvedZones.map((zoneId) => getZoneLabel(zoneId)),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [markers, search, zoneFilter]);

  const uniqueLocations = useMemo(
    () => dedupeClinicMapLocations(filteredMarkers),
    [filteredMarkers],
  );

  const withoutLocation = clinics.length - markers.length;

  const handleSelectClinic = (clinicId: string, locationKey: string) => {
    setSelectedClinicId(clinicId);
    setSelectedLocationKey(locationKey);
  };

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Mapa de clínicas"
        description="Ubicaciones verificadas de prestadores del catálogo. Cada pin representa una sede física real; si varios planes comparten el mismo lugar, se agrupan en un solo marcador."
        actions={
          <AdminRefreshButton
            loading={refreshing}
            onClick={() => void onRefresh()}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:items-start">
        <GoogleMapsClinicsMap
          locations={uniqueLocations}
          selectedLocationKey={selectedLocationKey}
          selectedClinicId={selectedClinicId}
          onSelectLocation={(locationKey, clinicId) =>
            handleSelectClinic(clinicId, locationKey)
          }
        />

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <AdminBadge tone="success">{uniqueLocations.length} sedes</AdminBadge>
              <AdminBadge tone="neutral">{filteredMarkers.length} en mapa</AdminBadge>
              <AdminBadge tone="neutral">{clinics.length} clínicas</AdminBadge>
              {withoutLocation > 0 ? (
                <AdminBadge tone="warning">{withoutLocation} sin ubicación</AdminBadge>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar clínica, comuna o dirección…"
                className={joinClasses("h-11", ui.input)}
              />
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Zona
                </span>
                <select
                  value={zoneFilter}
                  onChange={(event) => setZoneFilter(event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="all">Todas las zonas</option>
                  {ZONE_FILTER_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="max-h-[min(56vh,520px)] overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Sedes por ubicación</p>
              <p className="text-xs text-muted">
                Selecciona una sede para centrarla en el mapa.
              </p>
            </div>
            <ul className="max-h-[calc(min(56vh,520px)-64px)] overflow-y-auto">
              {loading ? (
                <li className="px-4 py-8 text-center text-sm text-muted">
                  Cargando clínicas…
                </li>
              ) : uniqueLocations.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted">
                  No hay sedes con los filtros actuales.
                </li>
              ) : (
                uniqueLocations.map((entry) => {
                  const primary = entry.clinics[0];
                  const zoneIds =
                    primary.zones.length > 0
                      ? primary.zones
                      : getClinicZoneIds({
                          id: primary.id,
                          name: primary.name,
                          zones: [],
                        });
                  const isSelected = selectedLocationKey === entry.locationKey;
                  const extraCount = entry.clinics.length - 1;

                  return (
                    <li key={entry.locationKey}>
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectClinic(primary.id, entry.locationKey)
                        }
                        className={joinClasses(
                          "w-full border-b border-border/70 px-4 py-3 text-left transition",
                          isSelected
                            ? "bg-primary/8"
                            : "hover:bg-secondary-muted/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {primary.name}
                          </p>
                          {extraCount > 0 ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              +{extraCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {entry.location.address}
                        </p>
                        {extraCount > 0 ? (
                          <p className="mt-1.5 text-[11px] text-muted/90">
                            También:{" "}
                            {entry.clinics
                              .slice(1, 3)
                              .map((c) => c.name)
                              .join(" · ")}
                            {extraCount > 2 ? ` · +${extraCount - 2} más` : ""}
                          </p>
                        ) : null}
                        {zoneIds[0] ? (
                          <p className="mt-2 text-[11px] font-medium text-primary">
                            {getZoneLabel(zoneIds[0])}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {withoutLocation > 0 ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-900">
              {withoutLocation} entrada{withoutLocation === 1 ? "" : "s"} del catálogo no tienen
              sede física (p. ej. Libre Elección) y no aparecen en el mapa.
            </div>
          ) : null}
        </aside>
      </div>
    </AdminPanel>
  );
}
