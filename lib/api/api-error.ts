import { Prisma } from "@prisma/client";
import { isDatabaseConnectivityError } from "@/lib/partner-entity/db-guard";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = Array.isArray(error.meta?.target)
      ? (error.meta.target as string[]).join(", ")
      : undefined;
    const model =
      typeof error.meta?.modelName === "string"
        ? error.meta.modelName
        : typeof error.meta?.table === "string"
          ? error.meta.table
          : undefined;

    switch (error.code) {
      case "P2002":
        return new ApiError(
          target?.includes("unique_code")
            ? "Ya existe un plan con ese código único."
            : "Ya existe un registro con esos datos.",
          409,
          error.code,
        );
      case "P2003":
        return new ApiError(
          model?.toLowerCase().includes("plan")
            ? "No se puede guardar el plan porque faltan datos relacionados (isapre o clínica)."
            : "No se puede guardar el registro porque faltan datos relacionados.",
          400,
          error.code,
        );
      case "P2021":
        return new ApiError(
          "Falta una tabla requerida en la base de datos. Contacta a soporte o vuelve a intentar tras el despliegue.",
          503,
          error.code,
        );
      case "P2025":
        return new ApiError(
          model?.toLowerCase().includes("plan")
            ? "El plan solicitado no existe."
            : "El registro solicitado no existe.",
          404,
          error.code,
        );
      default:
        return new ApiError(
          "Error de base de datos al procesar la solicitud.",
          500,
          error.code,
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    const detail = error.message;
    if (
      detail.includes("pipelineStatus") ||
      detail.includes("pipelineChecklist") ||
      detail.includes("pipelineClosedRecord") ||
      detail.includes("pipelineNotes") ||
      detail.includes("assignedExecutiveId") ||
      detail.includes("preferredContactMethod") ||
      detail.includes("lastCallOutcome") ||
      detail.includes("nextCallAt") ||
      detail.includes("clientOrigin") ||
      detail.includes("Unknown argument")
    ) {
      return new ApiError(
        "El servidor está usando una versión desactualizada de la base de datos. Reinicia con `npm run dev`.",
        503,
        "STALE_PRISMA_CLIENT",
      );
    }
    return new ApiError(
      "Los datos enviados no son válidos para la base de datos.",
      400,
    );
  }

  if (error instanceof SyntaxError) {
    return new ApiError("El cuerpo de la solicitud no es JSON válido.", 400);
  }

  if (isDatabaseConnectivityError(error)) {
    return new ApiError(
      "La base de datos no está disponible temporalmente. Intenta nuevamente en unos minutos.",
      503,
      "DATABASE_UNAVAILABLE",
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 500);
  }

  return new ApiError("Ocurrió un error inesperado al procesar la solicitud.", 500);
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("El cuerpo de la solicitud no es JSON válido.", 400);
  }
}

export function apiErrorResponse(error: unknown): {
  body: { error: string; code?: string };
  status: number;
} {
  const apiError = toApiError(error);

  return {
    body: {
      error: apiError.message,
      ...(apiError.code ? { code: apiError.code } : {}),
    },
    status: apiError.status,
  };
}
