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
};

type MessageRow = {
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

async function sendpulseGet(url: string, apiKey: string): Promise<unknown | null> {
  if (!isSendpulseUrl(url)) return null;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch (error) {
    console.error("[sendpulse] lectura remota", error instanceof Error ? error.message : "falló");
    return null;
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

function messageBody(row: MessageRow): string | null {
  const data = asRecord(row.data);
  const text = asRecord(data?.text);
  const interactive = asRecord(data?.interactive);
  const body =
    textValue(text?.body) ??
    textValue(data?.text) ??
    nestedText(interactive?.button_reply) ??
    nestedText(interactive?.list_reply) ??
    nestedText(interactive?.body);
  if (body) return body.slice(0, 500);

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

function formatMessages(rows: MessageRow[], total: number | null): string | null {
  const lines: string[] = [];
  for (const row of rows) {
    const body = messageBody(row);
    if (!body) continue;
    const stamp = formatStamp(row.created_at);
    const prefix = stamp ? `${stamp} · ` : "";
    lines.push(`${prefix}${speaker(row.direction)}: ${body.replace(/\s+/g, " ")}`);
  }
  if (lines.length === 0) return null;

  const shown = lines.length;
  const header =
    total != null && total > shown
      ? `Chat de SendPulse · últimos ${shown} de ${total} mensajes`
      : "Chat de SendPulse";
  let text = `${header}\n${lines.join("\n")}`;
  if (text.length > MAX_CHAT_CHARS) {
    text = `…[mensajes anteriores omitidos]\n${text.slice(-MAX_CHAT_CHARS)}`;
  }
  return text;
}

async function fetchMessages(contactId: string, apiKey: string): Promise<string | null> {
  const firstUrl = `${SENDPULSE_API}/whatsapp/chats/messages?contact_id=${encodeURIComponent(contactId)}&size=${PAGE_SIZE}&order=desc`;
  const collected: MessageRow[] = [];
  let nextUrl: string | null = firstUrl;
  let total: number | null = null;
  let pages = 0;

  while (nextUrl && pages < MAX_PAGES) {
    const payload = await sendpulseGet(nextUrl, apiKey);
    const root = asRecord(payload);
    const data = root?.data;
    if (!Array.isArray(data) || data.length === 0) break;

    const meta = asRecord(root?.meta);
    if (typeof meta?.total === "number") total = meta.total;

    for (const row of data) {
      const record = asRecord(row);
      if (record) collected.push(record);
    }

    pages += 1;
    const links = asRecord(root?.links);
    const next = textValue(links?.next);
    nextUrl = next && isSendpulseUrl(next) ? next : null;
  }

  collected.reverse();
  return formatMessages(collected, total);
}

/** Lee contacto y chat. Si SendPulse falla o no hay clave, devuelve vacío y no lanza. */
export async function fetchSendpulseSnapshot(
  contactId: string,
  apiKey: string | null | undefined,
): Promise<SendpulseRemoteSnapshot> {
  const key = usableKey(apiKey);
  if (!key) {
    return { contact: null, chat: null };
  }

  const [contactPayload, chat] = await Promise.all([
    sendpulseGet(
      `${SENDPULSE_API}/whatsapp/contacts/get?id=${encodeURIComponent(contactId)}`,
      key,
    ),
    fetchMessages(contactId, key),
  ]);

  return {
    contact: contactFromPayload(contactPayload),
    chat,
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
