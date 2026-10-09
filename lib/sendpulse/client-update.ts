export type SendpulseExistingClient = {
  clientOrigin: string;
  fullName: string;
  phone: string | null;
  sendpulseChat: string | null;
  sendpulseBotPhone: string | null;
};

export type SendpulseIncomingClient = {
  contactId: string;
  botPhone: string;
  fullName: string | null;
  phone: string | null;
  chat: string | null;
};

const PLACEHOLDER_NAME = "Contacto SendPulse";

export type SendpulseClientPatch = {
  sendpulseContactId: string;
  fullName?: string;
  phone?: string | null;
  sendpulseBotPhone?: string;
  sendpulseChat?: string;
  clientOrigin?: "SENDPULSE";
};

function hasRealName(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return Boolean(trimmed) && trimmed !== PLACEHOLDER_NAME;
}

/**
 * Arma el update de una ficha ya existente.
 * No cambia el origen si no es SendPulse, no pisa nombre ni teléfono con vacío,
 * y no borra un chat previo si esta lectura no trajo mensajes.
 */
export function buildSendpulseClientPatch(
  existing: SendpulseExistingClient,
  incoming: SendpulseIncomingClient,
): SendpulseClientPatch {
  const keepOrigin = existing.clientOrigin !== "SENDPULSE";
  const patch: SendpulseClientPatch = {
    sendpulseContactId: incoming.contactId,
  };

  if (!keepOrigin) {
    patch.clientOrigin = "SENDPULSE";
    patch.sendpulseBotPhone = incoming.botPhone;
  }

  if (!hasRealName(existing.fullName) && hasRealName(incoming.fullName)) {
    patch.fullName = incoming.fullName!.trim();
  }

  if (!existing.phone?.trim() && incoming.phone?.trim()) {
    patch.phone = incoming.phone.trim();
  }

  if (incoming.chat?.trim()) {
    patch.sendpulseChat = incoming.chat;
  }

  return patch;
}
