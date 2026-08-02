/**
 * Mapeo verificado entre IDs del catálogo (tabla clinics) y claves del asset
 * `clinic-locations.json`. Solo incluye equivalencias confirmadas en
 * `scripts/build-clinic-locations.mjs` (curadas / geocodificadas).
 */
export const CLINIC_LOCATION_JSON_ALIASES: Record<string, string> = {
  "clinica-redsalud-rancagua": "cl-redsalud-rancagua",
  "clinica-redsalud-iquique": "cl-redsalud-iquique",
  "clinica-redsalud-elqui": "cl-redsalud-elqui",
  "clinica-andes-salud-el-loa": "cl-andes-salud-el-loa",
  "clinica-cordillera": "cl-cordillera",
  "clinica-san-carlos-de-apoquindo": "cl-san-carlos",
  "clinica-san-jose-interclinica": "cl-san-jose-interclinica",
  "clinica-atacama-achs-salud": "cl-clinica-atacama-achs-salud",
  "clinica-indisa": "cl-indisa-providencia-anexo",
  "clinica-portada-achs-salud": "cl-portada-achs",
  "clinica-lircay-achs-salud": "clinica-lircay-achs-salud",
  "cl-andes-salud-talca": "centro-medico-andes-salud-talca",
  "clinica-los-carrera-interclinica": "cl-los-carrera-interclinica",
  "cl-los-carrera-inter": "cl-los-carrera-interclinica",
  "cl-clinica-los-carrera-inter": "cl-los-carrera-interclinica",
  "cl-los-andes-la": "clinica-los-andes-achs-salud",
  "clinica-del-sur-achs-salud": "hosp-clinico-del-sur",
  "centros-medicos-clinica-santa-maria": "cm-santa-maria",
  "cm-santa-maria": "cm-santa-maria",
  "cl-centros-medicos-santa-maria": "cm-santa-maria",
  "cl-clinica-santa-maria": "cl-santa-maria",
  "cl-hospital-clinico-uc-christus-clinica-santa-maria": "cl-santa-maria",
  "hospital-clinico-uc-christus-clinica-santa-maria": "cl-santa-maria",
  "cm-davila": "cm-red-davila",
  "cm-red-davila": "cm-red-davila",
  "cl-centros-medicos-davila": "cm-red-davila",
  "cl-davila-a3": "cl-davila",
  "clinica-davila": "cl-davila",
  "cl-clinica-davila": "cl-davila",
  "cl-clinica-davila-clinica-bupa-santiago": "cl-davila",
  "cl-clinica-davila-clinica-bupa-stgo": "cl-davila",
  "cl-clinica-davila-integramedica": "cl-davila",
  "cl-clinica-los-carrera-clinica-davila": "cl-davila",
  "clinica-davila-vespucio": "cl-davila-vespucio",
  "cm-andes-salud-talca": "centro-medico-andes-salud-talca",
};

const LIBRE_ELECCION_PATTERN = /libre[\s-]*elecci[oó]n/i;

export function isVirtualClinicId(clinicId: string, clinicName?: string): boolean {
  if (LIBRE_ELECCION_PATTERN.test(clinicId)) return true;
  if (clinicName && LIBRE_ELECCION_PATTERN.test(clinicName)) return true;
  return false;
}

export function resolveClinicLocationJsonKey(clinicId: string): string {
  if (CLINIC_LOCATION_JSON_ALIASES[clinicId]) {
    return CLINIC_LOCATION_JSON_ALIASES[clinicId];
  }
  return clinicId;
}
