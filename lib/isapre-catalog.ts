export interface IsapreCatalogItem {
  id: string;
  name: string;
}

export const ISAPRE_CATALOG: IsapreCatalogItem[] = [
  { id: "consalud", name: "Consalud" },
  { id: "banmedica", name: "Banmédica" },
  { id: "colmena", name: "Colmena" },
  { id: "cruz-blanca", name: "Cruz Blanca" },
  { id: "vida-tres", name: "Vida Tres" },
  { id: "nueva-masvida", name: "Nueva Masvida" },
  { id: "esencial", name: "Esencial" },
];

const nameToId = new Map(
  ISAPRE_CATALOG.map((item) => [item.name.toLowerCase(), item.id]),
);

export function resolveIsapreIdFromName(isapreName: string): string {
  const normalized = isapreName.trim().toLowerCase();
  const exact = nameToId.get(normalized);
  if (exact) return exact;

  const partial = ISAPRE_CATALOG.find((item) =>
    normalized.includes(item.name.toLowerCase()),
  );
  if (partial) return partial.id;

  return normalized
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolveIsapreNameFromId(isapreId: string): string {
  return (
    ISAPRE_CATALOG.find((item) => item.id === isapreId)?.name ?? isapreId
  );
}

const ISAPRE_LOGO_BY_ID: Record<string, string> = {
  consalud: "/images/isapres/isapre-consalud.png",
  banmedica: "/images/isapres/isapre-banmedica.png",
  colmena: "/images/isapres/isapre-colmena.png",
  "cruz-blanca": "/images/isapres/isapre-cruz-blanca.jpeg",
  "vida-tres": "/images/isapres/isapre-vida-tres.png",
  "nueva-masvida": "/images/isapres/isapre-nueva-masvida.png",
  esencial: "/images/isapres/isapre-esencial.png",
};

export function resolveIsapreLogoSrc(isapreName: string): string | null {
  const id = resolveIsapreIdFromName(isapreName);
  return ISAPRE_LOGO_BY_ID[id] ?? null;
}
