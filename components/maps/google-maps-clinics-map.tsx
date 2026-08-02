"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { ensureGoogleMapsOptions } from "@/lib/maps/google-maps-config";
import type { UniqueClinicMapLocation } from "@/types/clinic-location";

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 };
const DEFAULT_ZOOM = 6;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "simplified" }] },
];

interface GoogleMapsClinicsMapProps {
  locations: UniqueClinicMapLocation[];
  selectedLocationKey?: string | null;
  selectedClinicId?: string | null;
  onSelectLocation?: (locationKey: string, clinicId: string) => void;
  className?: string;
}

function getMapsApiKey(): string | null {
  return ensureGoogleMapsOptions();
}

function buildInfoWindowContent(location: UniqueClinicMapLocation): string {
  const primary = location.clinics[0];
  const extraCount = location.clinics.length - 1;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.location.lat},${location.location.lng}`;
  const namesHtml =
    extraCount > 0
      ? `<ul style="margin:8px 0 0;padding-left:16px;font-size:11px;color:#4a6274;line-height:1.5">
          ${location.clinics
            .slice(0, 4)
            .map((c) => `<li>${c.name}</li>`)
            .join("")}
          ${extraCount > 3 ? `<li>+${extraCount - 3} más en catálogo</li>` : ""}
        </ul>`
      : "";

  return `<div style="max-width:260px;padding:4px 2px;font-family:system-ui,sans-serif">
    <p style="margin:0 0 4px;font-weight:700;color:#0b2545;font-size:14px">${primary.name}${extraCount > 0 ? ` <span style="font-weight:500;color:#6b8494">(+${extraCount})</span>` : ""}</p>
    <p style="margin:0;font-size:12px;color:#6b8494;line-height:1.45">${location.location.address}</p>
    ${namesHtml}
    <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:10px;font-size:12px;font-weight:600;color:#1d6fa5;text-decoration:none">Cómo llegar →</a>
  </div>`;
}

function createMarkerIcon(count: number): google.maps.Symbol {
  const scale = count > 1 ? 11 : 9;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: count > 1 ? "#0d6e8f" : "#1d6fa5",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale,
  };
}

export function GoogleMapsClinicsMap({
  locations,
  selectedLocationKey = null,
  selectedClinicId = null,
  onSelectLocation,
  className,
}: GoogleMapsClinicsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerByKeyRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getMapsApiKey();
    if (!apiKey) {
      setLoadState("error");
      setErrorMessage(
        "Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para mostrar el mapa.",
      );
      return;
    }

    if (!containerRef.current) return;

    let cancelled = false;

    void importLibrary("maps")
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: MAP_STYLES,
        });

        mapRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar Google Maps.",
        );
      });

    return () => {
      cancelled = true;
      clustererRef.current?.clearMarkers();
      markerByKeyRef.current.clear();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadState !== "ready") return;

    clustererRef.current?.clearMarkers();
    markerByKeyRef.current.clear();

    const infoWindow = infoWindowRef.current;
    const nextMarkers: google.maps.Marker[] = [];

    for (const location of locations) {
      const primary = location.clinics[0];
      const marker = new google.maps.Marker({
        map,
        position: { lat: location.location.lat, lng: location.location.lng },
        title: primary.name,
        icon: createMarkerIcon(location.clinics.length),
        label:
          location.clinics.length > 1
            ? {
                text: String(location.clinics.length),
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: "700",
              }
            : undefined,
      });

      marker.addListener("click", () => {
        onSelectLocation?.(location.locationKey, primary.id);
        if (infoWindow) {
          infoWindow.setContent(buildInfoWindowContent(location));
          infoWindow.open({ map, anchor: marker });
        }
      });

      markerByKeyRef.current.set(location.locationKey, marker);
      nextMarkers.push(marker);
    }

    clustererRef.current = new MarkerClusterer({
      map,
      markers: nextMarkers,
      renderer: {
        render: ({ count, position }) =>
          new google.maps.Marker({
            position,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#0b2545",
              fillOpacity: 0.92,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: Math.min(18, 12 + Math.log2(count)),
            },
            label: {
              text: String(count),
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          }),
      },
    });

    if (locations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const location of locations) {
        bounds.extend({
          lat: location.location.lat,
          lng: location.location.lng,
        });
      }
      map.fitBounds(bounds, 56);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [locations, loadState, onSelectLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    if (!map || !infoWindow || !selectedLocationKey) return;

    const marker = markerByKeyRef.current.get(selectedLocationKey);
    const location = locations.find((item) => item.locationKey === selectedLocationKey);
    if (!marker || !location) return;

    map.panTo({ lat: location.location.lat, lng: location.location.lng });
    map.setZoom(Math.max(map.getZoom() ?? 12, 14));
    infoWindow.setContent(buildInfoWindowContent(location));
    infoWindow.open({ map, anchor: marker });
  }, [selectedLocationKey, selectedClinicId, locations]);

  if (loadState === "error") {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-secondary-muted/40 p-6 text-center text-sm text-muted ${className ?? ""}`}
      >
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border shadow-sm ${className ?? ""}`}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-sm text-muted">
          Cargando mapa…
        </div>
      ) : null}
      <div ref={containerRef} className="h-[min(72vh,620px)] w-full bg-secondary-muted/30" />
      {loadState === "ready" && locations.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-[11px] text-muted shadow-sm backdrop-blur-sm">
          <span className="font-semibold text-foreground">{locations.length}</span> ubicaciones · arrastra para explorar
        </div>
      ) : null}
    </div>
  );
}
