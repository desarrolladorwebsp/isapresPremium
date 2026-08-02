/**
 * IDs de clínica duplicados → ID canónico del catálogo final.
 *
 * Reglas (alineadas al cotizador de referencia):
 * - Mantener separados: clínica principal vs Centros Médicos (Santa María, Dávila, UC, RedSalud).
 * - Mantener separados: Clínica Dávila vs Dávila Vespucio (distinta comuna/zona).
 * - Mantener separados: Clínica UC vs Hospital Clínico UC vs Centros Médicos Red UC Christus.
 * - Fusionar: sufijos (A.2)/(A.3), nombres truncados/concatenados y alias de import.
 *
 * No incluye Libre Elección por isapre (mv-/vt-/col-).
 */
export const CLINIC_MERGE_TO_CANONICAL: Record<string, string> = {
  // --- Santa María: clínica vs centros médicos (separados) ---
  "cl-clinica-santa-maria": "cl-santa-maria",
  "cl-hospital-clinico-uc-christus-clinica-santa-maria": "cl-santa-maria",
  "hospital-clinico-uc-christus-clinica-santa-maria": "cl-santa-maria",
  "centros-medicos-clinica-santa-maria": "cm-santa-maria",
  "cl-centros-medicos-santa-maria": "cm-santa-maria",

  // --- Dávila Recoleta: clínica vs centros médicos (separados); Vespucio aparte ---
  "clinica-davila": "cl-davila",
  "cl-clinica-davila": "cl-davila",
  "cl-davila-a3": "cl-davila",
  "cl-clinica-davila-clinica-bupa-santiago": "cl-davila",
  "cl-clinica-davila-clinica-bupa-stgo": "cl-davila",
  "cl-clinica-davila-integramedica": "cl-davila",
  "cl-clinica-los-carrera-clinica-davila": "cl-davila",
  "cm-davila": "cm-red-davila",
  "cl-centros-medicos-davila": "cm-red-davila",
  "clinica-davila-vespucio": "cl-davila-vespucio",

  // --- UC Christus: 3 entidades de referencia ---
  "cl-uc": "hosp-clinico-uc", // Clínica UC
  "hosp-clinico-uc-a2": "hosp-clinico-uc",
  "hospital-clinico-universidad-catolica": "hospital-clinico-uc",
  "centros-medicos-red-uc-christus": "red-uc-christus",
  "cl-red-uc-christus": "red-uc-christus",
  "cl-red-cm-uc-christus-e": "red-uc-christus",
  "red-uc-christus-a3": "red-uc-christus",
  "red-uc-christus-a4": "red-uc-christus",

  // --- RedSalud Santiago / Providencia (ex nombres) ---
  "cl-clinica-redsalud-santiago-ex-bicentenario": "cl-redsalud-santiago",
  "cl-redsalud-santiago-bicentenario": "cl-redsalud-santiago",
  "clinica-redsalud-santiago-ex-bicentenario": "cl-redsalud-santiago",
  "cl-clinica-redsalud-providencia-ex-avansalud": "cl-redsalud-providencia",
  "cl-redsalud-providencia-avansalud": "cl-redsalud-providencia",
  "clinica-redsalud-providencia": "cl-redsalud-providencia",

  // --- Alemana Santiago ---
  "clinica-alemana": "cl-alemana-santiago",
  "cl-alemana-santiago-a": "cl-alemana-santiago",
  "cl-alemana-santiago-a2": "cl-alemana-santiago",
  "cl-alemana-santiago-a3": "cl-alemana-santiago",

  // --- Hospital Clínico U. de Chile ---
  "hosp-clinico-uch-a2": "hosp-clinico-uch",
  "hosp-clinico-uch-a3": "hosp-clinico-uch",
  "hosp-clinico-uch-a4": "hosp-clinico-uch",

  // --- Universidad de Los Andes (nombre partido en imports) ---
  "cl-clinica-universidad-de": "cl-univ-andes",
  "cl-los-andes": "cl-univ-andes",
  "clinica-universidad-de-los-andes": "cl-univ-andes",
  "cl-clinica-universidad-de-los-andes-clinica-uc-san-carlos": "cl-univ-andes",
  "cl-clinica-universidad-de-los-andes-clinica-uc-san-carlos-clinica-las-condes":
    "cl-univ-andes",

  // --- Misma sede / alias regionales ---
  // Los Carrera vs Los Carrera InterClínica: separados en el cotizador de referencia
  "clinica-los-carrera": "cl-los-carrera",
  "clinica-los-carrera-interclinica": "cl-los-carrera-interclinica",
  "cl-clinica-los-carrera-inter": "cl-los-carrera-interclinica",
  "cl-los-carrera-inter": "cl-los-carrera-interclinica",
  "clinica-san-jose-interclinica": "cl-san-jose-interclinica",
  "cl-clinica-san-jose-inter": "cl-san-jose-interclinica",
  "cl-clinica-san-jose": "cl-san-jose-interclinica",
  "cl-san-jose-arica": "cl-san-jose-interclinica",
  "clinica-tarapaca-interclinica": "cl-tarapaca-interclinica",
  "cl-tarapaca": "cl-tarapaca-interclinica",
  "cl-la-portada": "cl-portada-achs",
  "cl-la-portad": "cl-portada-achs",
  "clinica-portada-achs-salud": "cl-portada-achs",
  "cl-clinica-regional-la-portada": "cl-portada-achs",
  "cl-regional-la-portada": "cl-portada-achs",
  "clinica-atacama-achs-salud": "cl-atacama-achs",
  "cl-clinica-atacama-achs-salud": "cl-atacama-achs",
  "cl-atacama": "cl-atacama-achs",
  "clinica-renaca": "cl-bupa-renaca",
  "cl-clinica-renaca": "cl-bupa-renaca",
  "clinica-bupa-renaca": "cl-bupa-renaca",
  "clinica-bupa-antofagasta": "cl-bupa-antofagasta",
  "hosp-clinico-fusat": "hospital-clinico-fusat",
  "hospital-clinico-vina-del-mar": "hosp-vina-del-mar",
  "clinica-biobio": "cl-biobio",
  "clinica-del-sur-achs-salud": "hosp-clinico-del-sur",
  "cl-clinica-biobio-hospital-clinico-del-sur": "cl-biobio",
  "cl-centromed": "centromed",
  // Talca: Centro Médico Andes Salud ≠ Clínica Lircay Achs Salud
  "cm-andes-salud-talca": "centro-medico-andes-salud-talca",
  "cl-andes-salud-talca": "centro-medico-andes-salud-talca",
  // Los Andes Achs Salud (Los Ángeles): unificar alias
  "cl-los-andes-la": "clinica-los-andes-achs-salud",

  // --- Otros alias de import ---
  "clinica-redsalud-valparaiso": "cl-redsalud-valparaiso",
  "clinica-redsalud-iquique": "cl-redsalud-iquique",
  "clinica-alemana-de-temuco": "cl-alemana-temuco",
  "clinica-redsalud-rancagua": "cl-redsalud-rancagua",
  "clinica-redsalud-magallanes": "cl-redsalud-magallanes",
  "clinica-redsalud-elqui": "cl-redsalud-elqui",
  "clinica-redsalud-mayor-temuco": "cl-redsalud-mayor",
  "clinica-san-carlos-de-apoquindo": "cl-san-carlos",
  "clinica-andes-salud-el-loa": "cl-andes-salud-el-loa",
  "clinica-andes-salud-concepcion": "cl-andes-salud-concepcion",
  "clinica-andes-salud-puerto-montt": "cl-andes-salud-puerto-montt",
  "clinica-los-leones": "cl-los-leones",
  "clinica-indisa": "cl-indisa-providencia-anexo",
  "clinica-puerto-varas": "cl-puerto-varas",
  "clinica-puerto-montt-achs-salud": "cl-puerto-montt",
  "clinica-alemana-de-valdivia": "cl-alemana-valdivia",
  "clinica-alemana-de-osorno": "cl-alemana-osorno",
  "clinica-ciudad-del-mar": "cl-ciudad-del-mar",
  "clinica-cordillera": "cl-cordillera",
  "sanatorio-aleman": "clinica-sanatorio-aleman",

  // --- Nombres concatenados (error de parseo Excel) ---
  "cl-clinica-bupa-santiago-integramedica": "cl-bupa-santiago",
  "cl-clinica-bupa-antofagasta-clinica-atacama": "cl-bupa-antofagasta",
  "cl-clinica-rcr-atacama-clinica-bupa-antofagasta": "cl-bupa-antofagasta",
  "cl-clinica-ciudad-del-mar-clinica-bupa-renaca": "cl-ciudad-del-mar",
  "cl-clinica-la-portada-clinica-tarapaca": "cl-tarapaca-interclinica",
  "cl-clinica-tarapaca-clinica-la-portada": "cl-tarapaca-interclinica",
  "cl-integramedica-clinica-los-leones": "cl-los-leones",
  "cl-hospital-clinico-vina-del-mar-clinica-los-leones": "hosp-vina-del-mar",
  "cl-lircay-de-talca-clinica-los-andes-de-los-angeles":
    "clinica-lircay-achs-salud",
  "cl-lircay-de-talca-los-andes-de-los-angeles-clinica-alemana-de-osorno":
    "cl-alemana-osorno",
};

const FLATTENED_MERGE_MAP = flattenClinicMergeMap(CLINIC_MERGE_TO_CANONICAL);

function flattenClinicMergeMap(
  map: Record<string, string>,
): Record<string, string> {
  const flat = { ...map };
  let changed = true;

  while (changed) {
    changed = false;
    for (const [fromId, toId] of Object.entries(flat)) {
      const next = flat[toId];
      if (next && next !== toId) {
        flat[fromId] = next;
        changed = true;
      }
    }
  }

  return flat;
}

export function resolveCanonicalClinicId(clinicId: string): string {
  const trimmed = clinicId.trim();
  if (!trimmed) return trimmed;
  return FLATTENED_MERGE_MAP[trimmed] ?? trimmed;
}

export function isDeprecatedClinicId(clinicId: string): boolean {
  const trimmed = clinicId.trim();
  return Boolean(trimmed && FLATTENED_MERGE_MAP[trimmed]);
}

export function listClinicMergePairs(): Array<{ from: string; to: string }> {
  return Object.entries(FLATTENED_MERGE_MAP).map(([from, to]) => ({ from, to }));
}
