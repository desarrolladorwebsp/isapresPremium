/**
 * Pool de ejecutivos para asignación automática de clientes
 * que llegan por formulario web o cotizador (round-robin 1×1).
 *
 * No incluye membresía ni administradores.
 */
export const INBOUND_CLIENT_ASSIGNMENT_EMAILS = [
  "javiera.vega08@gmail.com",
  "isidora.nwolves@gmail.com",
  "catalinabelensaravia@gmail.com",
] as const;

export function normalizeInboundAssignmentEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isInboundAssignmentPoolEmail(email: string): boolean {
  const normalized = normalizeInboundAssignmentEmail(email);
  return INBOUND_CLIENT_ASSIGNMENT_EMAILS.some(
    (allowed) => allowed === normalized,
  );
}
