/** Normaliza texto para búsqueda: minúsculas, sin acentos ni espacios extra. */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function textIncludesSearch(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) return true;
  return normalizeSearchText(haystack).includes(normalizedNeedle);
}

export function textEqualsSearch(left: string, right: string): boolean {
  return normalizeSearchText(left) === normalizeSearchText(right);
}
