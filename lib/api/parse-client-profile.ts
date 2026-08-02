import type { ClientProfileInput } from "@/types/client-profile";

export function parseClientProfilePayload(payload: unknown): ClientProfileInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Datos de perfil inválidos.");
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.email !== "string") {
    throw new Error("El correo electrónico es obligatorio.");
  }
  if (typeof data.firstNames !== "string" || typeof data.lastNames !== "string") {
    throw new Error("Nombres y apellidos del titular son obligatorios.");
  }

  const dependents = Array.isArray(data.dependents)
    ? data.dependents
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const dependent = item as Record<string, unknown>;
          return {
            id: typeof dependent.id === "string" ? dependent.id : "",
            rut: typeof dependent.rut === "string" ? dependent.rut : "",
            birthDate:
              typeof dependent.birthDate === "string" ? dependent.birthDate : "",
            heightCm:
              typeof dependent.heightCm === "string" ? dependent.heightCm : "",
            weightKg:
              typeof dependent.weightKg === "string" ? dependent.weightKg : "",
          };
        })
    : [];

  return {
    email: data.email,
    phone: typeof data.phone === "string" ? data.phone : null,
    rut: typeof data.rut === "string" ? data.rut : null,
    firstNames: data.firstNames,
    lastNames: data.lastNames,
    birthDate: typeof data.birthDate === "string" ? data.birthDate : null,
    currentIsapre:
      typeof data.currentIsapre === "string" ? data.currentIsapre : null,
    heightCm: typeof data.heightCm === "string" ? data.heightCm : null,
    weightKg: typeof data.weightKg === "string" ? data.weightKg : null,
    maritalStatus:
      typeof data.maritalStatus === "string" ? data.maritalStatus : null,
    address: typeof data.address === "string" ? data.address : null,
    commune: typeof data.commune === "string" ? data.commune : null,
    dependents,
  };
}
