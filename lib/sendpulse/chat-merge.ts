const CHAT_HEADER = /^Chat de SendPulse(?: · últimos \d+ de \d+ mensajes)?$/;

function messages(chat: string | null): string[] {
  return (chat ?? "").split("\n").filter(line => line.trim() && !CHAT_HEADER.test(line));
}

/** Legacy conversations are text, so match occurrences rather than unique text. */
export function mergeSendpulseChat(saved: string | null, incoming: string | null, legacyLines?: Map<string, string>) {
  const original = messages(saved);
  const remaining = new Map<string, number>();
  for (const line of original) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  const fetched = messages(incoming);
  let added = 0;
  for (const line of fetched) {
    const key = remaining.get(line) ? line : legacyLines?.get(line) ?? line;
    const count = remaining.get(key) ?? 0;
    if (count) remaining.set(key, count - 1);
    else added++;
  }
  if (!added) return { chat: saved, added };

  const unmatched = original.filter(line => {
    const count = remaining.get(line) ?? 0;
    if (!count) return false;
    remaining.set(line, count - 1);
    return true;
  });
  return { chat: ["Chat de SendPulse", ...unmatched, ...fetched].join("\n"), added };
}
