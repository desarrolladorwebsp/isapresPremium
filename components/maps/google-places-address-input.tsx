"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { ensureGoogleMapsOptions } from "@/lib/maps/google-maps-config";
import { joinClasses } from "@/lib/utils";

export interface GooglePlacesSelection {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface GooglePlacesAddressInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  onPlaceSelect: (place: GooglePlacesSelection | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function GooglePlacesAddressInput({
  id,
  value,
  onValueChange,
  onPlaceSelect,
  placeholder,
  className,
  disabled = false,
}: GooglePlacesAddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || disabled) return;

    const apiKey = ensureGoogleMapsOptions();
    if (!apiKey) {
      setLoadError(
        "Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para autocompletar direcciones.",
      );
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { Autocomplete } = await importLibrary("places");
        if (cancelled || !inputRef.current) return;

        const autocomplete = new Autocomplete(inputRef.current, {
          componentRestrictions: { country: "cl" },
          fields: ["formatted_address", "geometry", "place_id"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          const formattedAddress = place.formatted_address?.trim();

          if (!location || !formattedAddress) {
            onPlaceSelect(null);
            return;
          }

          const selection: GooglePlacesSelection = {
            address: formattedAddress,
            lat: location.lat(),
            lng: location.lng(),
            placeId: place.place_id,
          };

          onValueChange(selection.address);
          onPlaceSelect(selection);
        });

        autocompleteRef.current = autocomplete;
        setLoadError(null);
      } catch {
        if (!cancelled) {
          setLoadError(
            "No se pudo cargar Google Maps Places. Revisa la API key y que Places esté habilitada.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      autocompleteRef.current = null;
    };
  }, [disabled, onPlaceSelect, onValueChange]);

  return (
    <div className="space-y-1.5">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          onPlaceSelect(null);
        }}
        placeholder={placeholder}
        className={joinClasses(className)}
        disabled={disabled || Boolean(loadError)}
        autoComplete="off"
      />
      {loadError ? (
        <p className="text-xs text-red-700" role="alert">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
