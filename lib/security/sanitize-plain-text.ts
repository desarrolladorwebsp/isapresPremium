/**
 * Sanitiza texto plano destinado a notas/CRM (no HTML).
 * Elimina controles, recorta longitud y evita basura de bots.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePlainText(
  value: string | null | undefined,
  maxLength: number,
): string {
  if (!value) return "";
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

const DANGEROUS_METADATA_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "__defineGetter__",
  "__defineSetter__",
]);

export function sanitizeMetadataRecord(
  metadata: Record<string, string | number | boolean | null | undefined> | undefined,
  options?: { maxEntries?: number; maxKeyLength?: number; maxValueLength?: number },
): Record<string, string> {
  if (!metadata) return {};

  const maxEntries = options?.maxEntries ?? 20;
  const maxKeyLength = options?.maxKeyLength ?? 40;
  const maxValueLength = options?.maxValueLength ?? 200;
  const out: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    if (Object.keys(out).length >= maxEntries) break;
    if (rawValue === null || rawValue === undefined) continue;

    const key = sanitizePlainText(rawKey, maxKeyLength).toLowerCase();
    if (!key || DANGEROUS_METADATA_KEYS.has(key)) continue;
    if (!/^[a-z0-9áéíóúñü _./-]{1,40}$/i.test(key)) continue;

    const text =
      typeof rawValue === "boolean" || typeof rawValue === "number"
        ? String(rawValue)
        : sanitizePlainText(String(rawValue), maxValueLength);

    if (!text) continue;
    out[key] = text;
  }

  return out;
}

/** Evita crecimiento ilimitado de pipelineNotes por spam de upserts. */
export function appendBoundedNotes(
  existing: string | null | undefined,
  incoming: string | null,
  maxTotal = 8_000,
): string | null {
  if (!incoming) return existing?.trim() || null;
  if (!existing?.trim()) return incoming.slice(0, maxTotal);

  const merged = `${existing.trim()}\n\n${incoming}`;
  if (merged.length <= maxTotal) return merged;

  // Conserva el final (nota más reciente) y un marcador de truncado.
  const marker = "…[notas anteriores omitidas]\n\n";
  const keep = maxTotal - marker.length;
  return `${marker}${merged.slice(-keep)}`;
}
