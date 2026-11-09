const SENDPULSE_API = "https://api.sendpulse.com";
export const SENDPULSE_CRM_TAG = "CRM Isapres Premium";
const PAGE_SIZE = 100;
const MAX_PAGES = 3;
const MAX_CHAT_CHARS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;

export type SendpulseRemoteContact = {
  name: string | null;
  phone: string | null;
};

export type SendpulseRemoteSnapshot = {
  contact: SendpulseRemoteContact | null;
  chat: string | null;
  /** El GET del contacto respondió bien. Un chat vacío no cuenta como fallo. */
  contactRead: boolean;
  legacyLines?: Map<string, string>;
};

type MessageRow = {
  id?: unknown;
  direction?: unknown;
  type?: unknown;
  created_at?: unknown;
  data?: unknown;
};

function usableKey(apiKey: string | null | undefined): string | null {
  const key = apiKey?.trim() ?? "";
  return key || null;
}

function isSendpulseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.sendpulse.com";
  } catch {
    return false;
  }
}

async function sendpulseGet(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; body: unknown | null }> {
  if (!isSendpulseUrl(url)) return { ok: false, body: null };

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, body: null };
    return { ok: true, body: (await response.json()) as unknown };
  } catch (error) {
    console.error("[sendpulse] lectura remota", error instanceof Error ? error.message : "falló");
    return { ok: false, body: null };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function contactFromPayload(payload: unknown): SendpulseRemoteContact | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  if (!data) return null;

  const channel = asRecord(data.channel_data);
  const variables = asRecord(data.variables);
  let variableName: string | null = null;
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      if (key.trim().toLowerCase() === "nombre y apellido") {
        variableName = textValue(value);
        break;
      }
    }
  }

  return {
    name: textValue(channel?.name) ?? variableName,
    phone: textValue(channel?.phone) ?? textValue(variables?.phone),
  };
}

function speaker(direction: unknown): "Cliente" | "Bot" {
  if (direction === 1 || direction === "1" || direction === "in" || direction === "incoming") {
    return "Cliente";
  }
  return "Bot";
}

function nestedText(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return textValue(value);
  return (
    textValue(record.body) ??
    textValue(record.title) ??
    textValue(record.text) ??
    textValue(record.caption)
  );
}

function messageBody(row: MessageRow, full = false): string | null {
  const data = asRecord(row.data);
  const text = asRecord(data?.text);
  const interactive = asRecord(data?.interactive);
  const body =
    textValue(text?.body) ??
    textValue(data?.text) ??
    nestedText(interactive?.button_reply) ??
    nestedText(interactive?.list_reply) ??
    nestedText(interactive?.body);
  if (body) return full ? body : body.slice(0, 500);

  const type = typeof row.type === "string" ? row.type : "";
  if (type === "image") return "[imagen]";
  if (type === "audio") return "[audio]";
  if (type === "video") return "[video]";
  if (type === "document") return "[documento]";
  if (type === "interactive") return "[mensaje interactivo]";
  return null;
}

function formatStamp(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMessages(rows: MessageRow[], total: number | null, full = false, legacyLines?: Map<string, string>): string | null {
  const lines: string[] = [];
  for (const row of rows) {
    const body = messageBody(row, Boolean(legacyLines));
    if (!body) continue;
    const stamp = formatStamp(row.created_at);
    const prefix = stamp ? `${stamp} · ` : "";
    const label = `${prefix}${speaker(row.direction)}: `;
    const line = label + body.replace(/\s+/g, " ");
    lines.push(line);
    const legacy = messageBody(row);
    if (legacy && legacy !== body) legacyLines?.set(line, label + legacy.replace(/\s+/g, " "));
  }
  if (lines.length === 0) return null;

  const shown = lines.length;
  const header =
    total != null && total > shown
      ? `Chat de SendPulse · últimos ${shown} de ${total} mensajes`
      : "Chat de SendPulse";
  let text = `${header}\n${lines.join("\n")}`;
  if (!full && text.length > MAX_CHAT_CHARS) {
    text = `…[mensajes anteriores omitidos]\n${text.slice(-MAX_CHAT_CHARS)}`;
  }
  return text;
}

async function fetchMessages(contactId: string, apiKey: string, full = false, legacyLines?: Map<string, string>): Promise<string | null> {
  const firstUrl = `${SENDPULSE_API}/whatsapp/chats/messages?contact_id=${encodeURIComponent(contactId)}&size=${PAGE_SIZE}&order=desc`;
  const collected: MessageRow[] = [];
  let nextUrl: string | null = firstUrl;
  let total: number | null = null;
  let pages = 0;

  const visited = new Set<string>();
  const messageIds = new Set<string>();
  while (nextUrl && (full || pages < MAX_PAGES)) {
    if (visited.has(nextUrl)) throw new Error("Paginación repetida de SendPulse.");
    visited.add(nextUrl);
    const payload = await sendpulseGet(nextUrl, apiKey);
    const root = asRecord(payload.body);
    const data = root?.data;
    if (full && (!payload.ok || !Array.isArray(data))) {
      throw new Error("No se pudo leer una página de SendPulse.");
    }
    if (!Array.isArray(data) || data.length === 0) break;

    const meta = asRecord(root?.meta);
    if (typeof meta?.total === "number") total = meta.total;

    for (const row of data) {
      const record = asRecord(row);
      if (!record) continue;
      const id = textValue(record.id);
      if (full && id && messageIds.has(id)) continue;
      if (id) messageIds.add(id);
      collected.push(record);
    }

    pages += 1;
    const links = asRecord(root?.links);
    const next = textValue(links?.next);
    if (full && next && !isSendpulseUrl(next)) throw new Error("Página inválida de SendPulse.");
    nextUrl = next && isSendpulseUrl(next) ? next : null;
  }

  collected.reverse();
  return formatMessages(collected, total, full, legacyLines);
}

export async function fetchFullSendpulseChat(contactId: string, apiKey: string) {
  const legacyLines = new Map<string, string>();
  const chat = await fetchMessages(contactId, apiKey, true, legacyLines);
  return { chat, legacyLines };
}

/** Lee contacto y chat. Si SendPulse falla o no hay clave, devuelve vacío y no lanza. */
export async function fetchSendpulseSnapshot(
  contactId: string,
  apiKey: string | null | undefined,
): Promise<SendpulseRemoteSnapshot> {
  const key = usableKey(apiKey);
  if (!key) {
    return { contact: null, chat: null, contactRead: false };
  }

  const legacyLines = new Map<string, string>();
  const [contactResponse, chat] = await Promise.all([
    sendpulseGet(
      `${SENDPULSE_API}/whatsapp/contacts/get?id=${encodeURIComponent(contactId)}`,
      key,
    ),
    fetchMessages(contactId, key, false, legacyLines),
  ]);

  return {
    contact: contactFromPayload(contactResponse.body),
    chat,
    contactRead: contactResponse.ok,
    legacyLines,
  };
}

export type SendpulseTagResult = "tagged" | "missing-key" | "failed";

/** Marca el contacto en SendPulse. No reemplaza las etiquetas que ya tenga. */
export async function tagSendpulseContactInCrm(
  contactId: string,
  apiKey: string | null | undefined,
): Promise<SendpulseTagResult> {
  const key = usableKey(apiKey);
  const id = contactId.trim();
  if (!key) return "missing-key";
  if (!id) return "failed";

  try {
    const response = await fetch(`${SENDPULSE_API}/whatsapp/contacts/setTag`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contact_id: id,
        tags: [SENDPULSE_CRM_TAG],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[sendpulse] etiqueta", response.status);
      return "failed";
    }
    return "tagged";
  } catch (error) {
    console.error(
      "[sendpulse] etiqueta",
      error instanceof Error ? error.message : "falló",
    );
    return "failed";
  }
}
