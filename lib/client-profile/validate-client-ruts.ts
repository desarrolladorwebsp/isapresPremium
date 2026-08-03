import { formatRut, isValidRut } from "@/lib/auth/rut";

export interface ClientManagementRutInput {
  rut?: string | null;
  dependents?: Array<{ id?: string; rut?: string | null }>;
  additionalTitulares?: Array<{ id?: string; rut?: string | null }>;
}

export interface ClientManagementRutOptions {
  /**
   * Crear cliente: RUT titular obligatorio (puede ser inválido).
   * Editar: vacío permitido.
   * Un RUT con dígito verificador incorrecto NO bloquea el guardado.
   */
  requireTitularRut: boolean;
}

export interface ClientManagementRutErrors {
  titular?: string;
  dependents: Record<string, string>;
  additionalTitulares: Record<string, string>;
  firstMessage: string | null;
}

const INVALID_RUT_MESSAGE = "El RUT ingresado no es válido.";

/**
 * Errores que bloquean guardado (solo vacío cuando es obligatorio).
 * No bloquear por dígito verificador incorrecto.
 */
export function getClientManagementRutErrors(
  input: ClientManagementRutInput,
  options: ClientManagementRutOptions,
): ClientManagementRutErrors {
  let titular: string | undefined;

  const titularRut = input.rut?.trim() ?? "";
  if (options.requireTitularRut && !titularRut) {
    titular = "El RUT es obligatorio.";
  }

  return {
    titular,
    dependents: {},
    additionalTitulares: {},
    firstMessage: titular ?? null,
  };
}

/**
 * Avisos no bloqueantes (RUT con formato/DV incorrecto).
 */
export function getClientManagementRutWarnings(
  input: ClientManagementRutInput,
): ClientManagementRutErrors {
  const dependents: Record<string, string> = {};
  const additionalTitulares: Record<string, string> = {};
  let titular: string | undefined;

  const titularRut = input.rut?.trim() ?? "";
  if (titularRut && !isValidRut(titularRut)) {
    titular = INVALID_RUT_MESSAGE;
  }

  for (const [index, dependent] of (input.dependents ?? []).entries()) {
    const rut = dependent.rut?.trim() ?? "";
    if (!rut) continue;
    if (!isValidRut(rut)) {
      const key = dependent.id?.trim() || String(index);
      dependents[key] = INVALID_RUT_MESSAGE;
    }
  }

  for (const [index, extra] of (input.additionalTitulares ?? []).entries()) {
    const rut = extra.rut?.trim() ?? "";
    if (!rut) continue;
    if (!isValidRut(rut)) {
      const key = extra.id?.trim() || String(index);
      additionalTitulares[key] = INVALID_RUT_MESSAGE;
    }
  }

  const firstExtraMessage = Object.values(additionalTitulares)[0];
  const firstDependentMessage = Object.values(dependents)[0];
  return {
    titular,
    dependents,
    additionalTitulares,
    firstMessage:
      titular ?? firstExtraMessage ?? firstDependentMessage ?? null,
  };
}

export function assertClientManagementRuts(
  input: ClientManagementRutInput,
  options: ClientManagementRutOptions,
): void {
  const errors = getClientManagementRutErrors(input, options);
  if (errors.firstMessage) {
    throw new Error(errors.firstMessage);
  }
}

/** Formatea RUT si se puede; vacío → null. No exige dígito verificador válido. */
export function formatOptionalClientRut(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return formatRut(trimmed);
}
