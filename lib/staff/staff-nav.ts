import type { StaffSection } from "@/lib/staff/staff-sections";

/** Trabajo diario: siempre pestañas sueltas si el rol las tiene. */
export const STAFF_NAV_PRIMARY: StaffSection[] = [
  "inicio",
  "clientes",
  "calendario",
  "cotizador",
];

/** Catálogo: dropdown si hay más de un ítem; si solo es Mapa, queda pestaña. */
export const STAFF_NAV_CATALOG: StaffSection[] = [
  "mapa",
  "clinicas",
  "reportes-pdf",
  "convenios",
  "ges",
];

/** Equipo / administración de personas. */
export const STAFF_NAV_TEAM: StaffSection[] = [
  "usuarios",
  "prospectos",
  "cotizaciones",
];

export type StaffNavGroupId = "catalogo" | "equipo";

export type StaffNavEntry =
  | { kind: "item"; id: StaffSection }
  | {
      kind: "group";
      id: StaffNavGroupId;
      label: string;
      shortLabel: string;
      sections: StaffSection[];
    };

function filterAllowed(
  order: readonly StaffSection[],
  allowed: ReadonlySet<StaffSection>,
): StaffSection[] {
  return order.filter((id) => allowed.has(id));
}

function pushGroupOrItem(
  entries: StaffNavEntry[],
  sections: StaffSection[],
  group: { id: StaffNavGroupId; label: string; shortLabel: string },
): void {
  if (sections.length === 0) return;
  if (sections.length === 1) {
    entries.push({ kind: "item", id: sections[0] });
    return;
  }
  entries.push({
    kind: "group",
    id: group.id,
    label: group.label,
    shortLabel: group.shortLabel,
    sections,
  });
}

/**
 * Arma el menú visual sin cambiar permisos.
 * `perfil` se omite: vive en el menú del avatar.
 */
export function buildStaffNav(allowedSections: readonly StaffSection[]): StaffNavEntry[] {
  const allowed = new Set<StaffSection>(
    allowedSections.filter((section) => section !== "perfil"),
  );
  const entries: StaffNavEntry[] = [];

  for (const id of filterAllowed(STAFF_NAV_PRIMARY, allowed)) {
    entries.push({ kind: "item", id });
  }

  pushGroupOrItem(entries, filterAllowed(STAFF_NAV_CATALOG, allowed), {
    id: "catalogo",
    label: "Catálogo",
    shortLabel: "Catálogo",
  });

  pushGroupOrItem(entries, filterAllowed(STAFF_NAV_TEAM, allowed), {
    id: "equipo",
    label: "Equipo",
    shortLabel: "Equipo",
  });

  const placed = new Set<StaffSection>([
    ...STAFF_NAV_PRIMARY,
    ...STAFF_NAV_CATALOG,
    ...STAFF_NAV_TEAM,
    "perfil" satisfies StaffSection,
  ]);

  for (const id of allowedSections) {
    if (!placed.has(id) && allowed.has(id)) {
      entries.push({ kind: "item", id });
    }
  }

  return entries;
}

export function staffNavGroupIsActive(
  entry: StaffNavEntry,
  activeSection: StaffSection,
): boolean {
  return entry.kind === "group" && entry.sections.includes(activeSection);
}
