import type { SubscriptionStatus } from "@prisma/client";

const ACTIVE_STATUSES: SubscriptionStatus[] = ["TRIAL", "ACTIVE"];

export function isSubscriptionActive(input: {
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();

  if (!ACTIVE_STATUSES.includes(input.subscriptionStatus)) {
    return false;
  }

  if (
    input.subscriptionExpiresAt &&
    input.subscriptionExpiresAt.getTime() <= now.getTime()
  ) {
    return false;
  }

  return true;
}

export function getSubscriptionBlockReason(input: {
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: Date | null;
  now?: Date;
}): string | null {
  if (isSubscriptionActive(input)) return null;

  if (
    input.subscriptionExpiresAt &&
    input.subscriptionExpiresAt.getTime() <= (input.now ?? new Date()).getTime()
  ) {
    return "Tu suscripción ha expirado. Renueva tu plan para continuar.";
  }

  switch (input.subscriptionStatus) {
    case "PAST_DUE":
      return "Tu suscripción tiene un pago pendiente. Regulariza tu cuenta para continuar.";
    case "CANCELLED":
      return "Tu suscripción fue cancelada. Reactívala para acceder al cotizador.";
    case "EXPIRED":
      return "Tu suscripción expiró. Contrata un plan para seguir usando el sistema.";
    default:
      return "No tienes una suscripción activa.";
  }
}
