import { NextResponse } from "next/server";
import { readClinics, writeClinics } from "@/lib/api/data-store";
import type { Clinic } from "@/types/clinic";
import {
  requireAdminSession,
  requireExecutiveOrAdminSession,
} from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import {
  staffCanAccessSection,
} from "@/lib/auth/staff-role";
import { apiErrorResponse, ApiError } from "@/lib/api/api-error";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import type { StaffSection } from "@/lib/staff/staff-sections";

function isValidClinic(payload: unknown): payload is Clinic {
  if (!payload || typeof payload !== "object") return false;
  const clinic = payload as Clinic;
  return (
    typeof clinic.id === "string" &&
    clinic.id.trim().length > 0 &&
    typeof clinic.name === "string" &&
    clinic.name.trim().length > 0
  );
}

const CLINICS_READ_SECTIONS: StaffSection[] = [
  "mapa",
  "clinicas",
  "reportes-pdf",
];

export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const access = {
      realm,
      executiveKind:
        realm === AUTH_REALM.executive
          ? (user as ExecutiveSessionUser).executiveKind
          : null,
    };

    const allowed = CLINICS_READ_SECTIONS.some((section) =>
      staffCanAccessSection(access, section),
    );

    if (!allowed) {
      throw new ApiError(
        "No tienes permiso para acceder a este recurso.",
        403,
        "SECTION_FORBIDDEN",
      );
    }

    const clinics = await readClinics();
    return NextResponse.json(clinics);
  } catch (error) {
    console.error("GET /api/clinics", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const payload = (await request.json()) as unknown;

    if (!isValidClinic(payload)) {
      return NextResponse.json(
        { error: "Datos de la clínica inválidos." },
        { status: 400 },
      );
    }

    const clinics = await readClinics();
    const exists = clinics.some((clinic) => clinic.id === payload.id);

    if (exists) {
      return NextResponse.json(
        { error: "Ya existe una clínica con ese identificador." },
        { status: 409 },
      );
    }

    const nextClinics = [...clinics, payload];
    await writeClinics(nextClinics);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("POST /api/clinics", error);
    return NextResponse.json(
      { error: "No se pudo crear la clínica." },
      { status: 500 },
    );
  }
}
