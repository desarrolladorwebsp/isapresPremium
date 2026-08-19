import type { ClientOrigin, ExecutiveKind, Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/api-error";
import { autoAssignClientExecutive } from "@/lib/api/lead-assignment";
import { prisma } from "@/lib/prisma";
import {
  buildEmptyClientProfile,
  splitFullName,
} from "@/lib/client-profile/constants";
import { resolveCurrentCoverageId } from "@/lib/client-profile/current-coverage";
import { isValidPhone, isValidRut, cleanRut } from "@/lib/leads/validation";
import {
  appendBoundedNotes,
  sanitizeMetadataRecord,
  sanitizePlainText,
} from "@/lib/security/sanitize-plain-text";
import type { ClientContactMethod } from "@/types/client-pipeline";

export interface RegisterLeadClientInput {
  fullName: string;
  email: string;
  phone: string;
  rut?: string | null;
  /** Texto libre adicional (se guarda en pipelineNotes). */
  notes?: string | null;
  /** Identificador del formulario/origen (p. ej. isapres-premium, empresas). */
  source?: string | null;
  /** Preferencia de formulario (whatsapp | telefono | email | video-llamada). */
  preferenciaContacto?: string | null;
  /** Campos extra para enriquecer las notas del pipeline. */
  metadata?: Record<string, string | number | boolean | null | undefined>;
  clientOrigin?: Extract<ClientOrigin, "FORMULARIO_WEB">;
  /** Kind de ejecutivo para auto-asignación. Por defecto ISAPRES_PREMIUM. */
  executiveKind?: ExecutiveKind | null;
  autoAssign?: boolean;
}

export interface RegisterLeadClientResult {
  clientId: string;
  email: string;
  created: boolean;
  assignedExecutiveId: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapPreferenciaToContactMethod(
  preferencia: string | null | undefined,
): ClientContactMethod | null {
  const value = preferencia?.trim().toLowerCase();
  if (!value) return null;
  if (value === "whatsapp") return "WHATSAPP";
  if (value === "video-llamada" || value === "zoom") return "ZOOM";
  return null;
}

function formatMetadataLine(key: string, value: string): string {
  return `${key}: ${value}`;
}

function coverageFromLeadMetadata(
  metadata?: Record<string, string>,
): string {
  const raw =
    metadata?.["previsión actual"] ?? metadata?.["prevision actual"] ?? "";
  return resolveCurrentCoverageId(String(raw));
}

function buildLeadClientProfile(input: {
  fullName: string;
  metadata?: Record<string, string>;
}) {
  const fromName = splitFullName(input.fullName);
  return {
    ...buildEmptyClientProfile(),
    firstNames: fromName.firstNames,
    lastNames: fromName.lastNames,
    age: String(input.metadata?.edad ?? "").trim(),
    currentIsapre: coverageFromLeadMetadata(input.metadata),
    rentaImponible: String(input.metadata?.["renta imponible"] ?? "").trim(),
  };
}

function buildPipelineNotes(input: {
  source?: string | null;
  preferenciaContacto?: string | null;
  notes?: string | null;
  metadata?: Record<string, string>;
}): string | null {
  const lines: string[] = [];

  const source = sanitizePlainText(input.source, 80);
  if (source) lines.push(`Origen formulario: ${source}`);

  const preferencia = sanitizePlainText(input.preferenciaContacto, 40);
  if (preferencia) lines.push(`Preferencia contacto: ${preferencia}`);

  const notes = sanitizePlainText(input.notes, 2000);
  if (notes) lines.push(notes);

  if (input.metadata) {
    for (const [key, text] of Object.entries(input.metadata)) {
      lines.push(formatMetadataLine(key, text));
    }
  }

  if (lines.length === 0) return null;

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `[Lead ${stamp}]\n${lines.join("\n")}`;
}

function assertValidInput(input: RegisterLeadClientInput): {
  email: string;
  fullName: string;
  phone: string;
  rut: string | null;
} {
  const fullName = sanitizePlainText(input.fullName, 160);
  const email = normalizeEmail(sanitizePlainText(input.email, 160));
  const phone = sanitizePlainText(input.phone, 40);
  const rutRaw = sanitizePlainText(input.rut, 20);

  if (fullName.length < 2) {
    throw new ApiError("El nombre es obligatorio.", 400, "INVALID_NAME");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError("El email no es válido.", 400, "INVALID_EMAIL");
  }
  if (!isValidPhone(phone)) {
    throw new ApiError("El teléfono no es válido.", 400, "INVALID_PHONE");
  }
  if (rutRaw && !isValidRut(rutRaw)) {
    throw new ApiError("El RUT no es válido.", 400, "INVALID_RUT");
  }

  return {
    email,
    fullName,
    phone,
    rut: rutRaw ? cleanRut(rutRaw) : null,
  };
}

/**
 * Registra o actualiza un cliente CLIENT a partir de un lead de formulario.
 * Pensado para Isapres Premium y otros formularios futuros vía API pública.
 */
export async function registerLeadClient(
  input: RegisterLeadClientInput,
): Promise<RegisterLeadClientResult> {
  const normalized = assertValidInput(input);
  const clientOrigin: ClientOrigin = input.clientOrigin ?? "FORMULARIO_WEB";
  const autoAssign = input.autoAssign !== false;
  const executiveKind = input.executiveKind ?? "ISAPRES_PREMIUM";
  const preferredContactMethod = mapPreferenciaToContactMethod(
    input.preferenciaContacto,
  );
  const safeMetadata = sanitizeMetadataRecord(input.metadata);
  const leadNotes = buildPipelineNotes({
    source: input.source,
    preferenciaContacto: input.preferenciaContacto,
    notes: input.notes,
    metadata: safeMetadata,
  });

  const existing = await prisma.user.findUnique({
    where: { email: normalized.email },
    select: {
      id: true,
      role: true,
      phone: true,
      rut: true,
      fullName: true,
      clientOrigin: true,
      pipelineNotes: true,
      preferredContactMethod: true,
      assignedExecutiveId: true,
    },
  });

  if (existing && existing.role !== "CLIENT") {
    // Mensaje genérico: no revelar cuentas internas.
    throw new ApiError(
      "No se pudo registrar este correo.",
      409,
      "EMAIL_UNAVAILABLE",
    );
  }

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: normalized.email,
        fullName: normalized.fullName,
        phone: normalized.phone,
        rut: normalized.rut,
        role: "CLIENT",
        active: true,
        clientOrigin,
        pipelineNotes: leadNotes,
        preferredContactMethod: preferredContactMethod ?? undefined,
        clientProfile: buildLeadClientProfile({
          fullName: normalized.fullName,
          metadata: safeMetadata,
        }) as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, assignedExecutiveId: true },
    });

    let assignedExecutiveId = created.assignedExecutiveId;
    if (autoAssign) {
      assignedExecutiveId =
        (await autoAssignClientExecutive(created.id, {
          inboundPool: true,
          executiveKind,
        })) ?? assignedExecutiveId;
    }

    return {
      clientId: created.id,
      email: normalized.email,
      created: true,
      assignedExecutiveId,
    };
  }

  const updateData: Prisma.UserUpdateInput = {
    fullName: normalized.fullName,
    phone: normalized.phone || existing.phone,
    rut: normalized.rut || existing.rut,
    pipelineNotes: appendBoundedNotes(existing.pipelineNotes, leadNotes),
  };

  // No sobrescribir origen de cotizador/manual con formulario.
  if (
    existing.clientOrigin === "MANUAL" ||
    existing.clientOrigin === "CAMPANA_LEAD_WHATSAPP"
  ) {
    // Mantener; el lead solo enriquece notas/contacto.
  } else if (existing.clientOrigin !== "COTIZADOR") {
    updateData.clientOrigin = clientOrigin;
  }

  if (preferredContactMethod && !existing.preferredContactMethod) {
    updateData.preferredContactMethod = preferredContactMethod;
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: updateData,
    select: { id: true, assignedExecutiveId: true },
  });

  let assignedExecutiveId = updated.assignedExecutiveId;
  if (autoAssign && !assignedExecutiveId) {
    assignedExecutiveId =
      (await autoAssignClientExecutive(updated.id, {
        inboundPool: true,
        executiveKind,
      })) ?? null;
  }

  return {
    clientId: updated.id,
    email: normalized.email,
    created: false,
    assignedExecutiveId,
  };
}
