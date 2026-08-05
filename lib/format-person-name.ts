/**
 * Muestra solo nombre y apellido (primer y último token).
 * Si hay un solo token, lo deja igual.
 */
export function formatPersonDisplayName(
  fullName: string | null | undefined,
  emptyLabel = "—",
): string {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return emptyLabel;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
