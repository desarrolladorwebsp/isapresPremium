import { NextResponse } from "next/server";
import {
  countClinicUsage,
  readClinics,
  readPlans,
  syncClinicNameInPlans,
  writeClinics,
} from "@/lib/api/data-store";
import type { Clinic } from "@/types/clinic";
import { requireAdminSession } from "@/lib/auth/require-auth";
import { apiErrorResponse } from "@/lib/api/api-error";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isValidClinic(payload: unknown): payload is Clinic {
  if (!payload || typeof payload !== "object") return false;
  const clinic = payload as Clinic;
  return (
    typeof clinic.id === "string" &&
    typeof clinic.name === "string" &&
    clinic.name.trim().length > 0
  );
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const payload = (await request.json()) as unknown;

    if (!isValidClinic(payload)) {
      return NextResponse.json(
        { error: "Datos de la clínica inválidos." },
        { status: 400 },
      );
    }

    if (payload.id !== decodedId) {
      return NextResponse.json(
        { error: "El identificador de la URL no coincide con el del cuerpo." },
        { status: 400 },
      );
    }

    const clinics = await readClinics();
    const index = clinics.findIndex((clinic) => clinic.id === decodedId);

    if (index === -1) {
      return NextResponse.json(
        { error: "Clínica no encontrada." },
        { status: 404 },
      );
    }

    const nextClinics = [...clinics];
    nextClinics[index] = payload;
    await writeClinics(nextClinics);
    await syncClinicNameInPlans(payload.id, payload.name);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("PUT /api/clinics/[id]", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la clínica." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const plans = await readPlans();
    const usage = countClinicUsage(plans, decodedId);

    if (usage > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: la clínica está asociada a ${usage} cobertura(s) en planes activos.`,
        },
        { status: 409 },
      );
    }

    const clinics = await readClinics();
    const nextClinics = clinics.filter((clinic) => clinic.id !== decodedId);

    if (nextClinics.length === clinics.length) {
      return NextResponse.json(
        { error: "Clínica no encontrada." },
        { status: 404 },
      );
    }

    await writeClinics(nextClinics);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/clinics/[id]", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la clínica." },
      { status: 500 },
    );
  }
}
