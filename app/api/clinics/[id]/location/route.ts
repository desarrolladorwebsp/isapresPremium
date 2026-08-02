import { NextResponse } from "next/server";
import {
  clearClinicLocation,
  readClinics,
  updateClinicLocation,
} from "@/lib/api/data-store";
import {
  GeocodeUnavailableError,
  geocodeAddressInChile,
  isWithinChile,
} from "@/lib/geocoding/geocode-address";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { apiErrorResponse } from "@/lib/api/api-error";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface LocationPayload {
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  placeId?: unknown;
}

function parseGooglePlacesPayload(payload: LocationPayload): {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
} | null {
  const address = typeof payload.address === "string" ? payload.address.trim() : "";
  const lat = typeof payload.lat === "number" ? payload.lat : Number(payload.lat);
  const lng = typeof payload.lng === "number" ? payload.lng : Number(payload.lng);
  const placeId =
    typeof payload.placeId === "string" && payload.placeId.trim()
      ? payload.placeId.trim()
      : undefined;

  if (address.length < 5 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { address, lat, lng, placeId };
}

async function findClinic(id: string) {
  const clinics = await readClinics();
  return clinics.find((clinic) => clinic.id === id) ?? null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const clinicId = decodeURIComponent(id);

    const payload = (await request.json()) as LocationPayload;
    const googlePlace = parseGooglePlacesPayload(payload);

    const clinic = await findClinic(clinicId);
    if (!clinic) {
      return NextResponse.json(
        { error: "Clínica no encontrada." },
        { status: 404 },
      );
    }

    if (googlePlace) {
      if (!isWithinChile(googlePlace.lat, googlePlace.lng)) {
        return NextResponse.json(
          {
            error:
              "La dirección seleccionada no está dentro de Chile. Elige otra ubicación en Google Maps.",
          },
          { status: 422 },
        );
      }

      await updateClinicLocation(clinicId, {
        address: googlePlace.address,
        lat: googlePlace.lat,
        lng: googlePlace.lng,
        source: "manual",
      });

      return NextResponse.json({
        id: clinic.id,
        name: clinic.name,
        zones: clinic.zones,
        location: {
          address: googlePlace.address,
          lat: googlePlace.lat,
          lng: googlePlace.lng,
          source: "manual",
        },
        queried: googlePlace.address,
        placeId: googlePlace.placeId,
      });
    }

    const address =
      typeof payload.address === "string" ? payload.address.trim() : "";

    if (address.length < 5) {
      return NextResponse.json(
        {
          error:
            "Selecciona una dirección de Google Maps. No se aceptan direcciones escritas manualmente.",
        },
        { status: 400 },
      );
    }

    let geocoded;
    try {
      geocoded = await geocodeAddressInChile(address);
    } catch (error) {
      if (error instanceof GeocodeUnavailableError) {
        return NextResponse.json(
          {
            error:
              "No pudimos verificar la dirección en este momento. Intenta nuevamente en unos segundos.",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    if (!geocoded) {
      return NextResponse.json(
        {
          error:
            "No encontramos esa dirección en Chile. Selecciona una opción de Google Maps.",
        },
        { status: 422 },
      );
    }

    await updateClinicLocation(clinicId, {
      address: geocoded.address,
      lat: geocoded.lat,
      lng: geocoded.lng,
      source: "manual",
    });

    return NextResponse.json({
      id: clinic.id,
      name: clinic.name,
      zones: clinic.zones,
      location: {
        address: geocoded.address,
        lat: geocoded.lat,
        lng: geocoded.lng,
        source: "manual",
      },
      queried: geocoded.queried,
    });
  } catch (error) {
    console.error("PUT /api/clinics/[id]/location", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const clinicId = decodeURIComponent(id);

    const clinic = await findClinic(clinicId);
    if (!clinic) {
      return NextResponse.json(
        { error: "Clínica no encontrada." },
        { status: 404 },
      );
    }

    await clearClinicLocation(clinicId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/clinics/[id]/location", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
