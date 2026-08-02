/** Nombres de query params para deep linking del cotizador público. */
export const DEEP_LINK_PARAMS = {
  agent: "agent",
  entidad: "entidad",
  region: "region",
  edad: "edad",
  sexo: "sexo",
  ingreso: "ingreso",
  tipoCotizante: "tipoCotizante",
  cargas: "cargas",
  q: "q",
  precioMin: "precioMin",
  precioMax: "precioMax",
  isapres: "isapres",
  zonas: "zonas",
  clinica: "clinica",
  clinicaH: "clinicaH",
  clinicaA: "clinicaA",
  tipoPlan: "tipoPlan",
  coberturaH: "coberturaH",
  coberturaA: "coberturaA",
  orden: "orden",
  moneda: "moneda",
  auto: "auto",
  email: "email",
  plan: "plan",
  vista: "vista",
  nombre: "nombre",
  rut: "rut",
  telefono: "telefono",
} as const;

/** Valores aceptados en el parámetro vista (pestaña del modal de solicitud). */
export const VALID_MODAL_VIEWS = new Set([
  "overview",
  "general",
  "vista-general",
  "price",
  "precio",
  "request",
  "solicitar",
]);

export const VALID_REGIONS = new Set([
  "rm",
  "arica",
  "tarapaca",
  "antofagasta",
  "atacama",
  "coquimbo",
  "valparaiso",
  "ohiggins",
  "maule",
  "nuble",
  "biobio",
  "araucania",
  "los_rios",
  "los_lagos",
  "aysen",
  "magallanes",
]);

export const VALID_SEX_VALUES = new Set(["m", "f"]);

export const VALID_SORT_KEYS = new Set([
  "price_asc",
  "price_desc",
  "coverage",
]);

export const VALID_CURRENCY = new Set(["clp", "uf"]);

export const VALID_CONTRIBUTOR_TYPES = new Set([
  "dependiente",
  "independiente",
  "voluntario",
]);

/** Params que no deben persistirse al limpiar la URL tras hidratar. */
export const DEEP_LINK_BOOTSTRAP_PARAMS = new Set([
  DEEP_LINK_PARAMS.agent,
  DEEP_LINK_PARAMS.entidad,
  DEEP_LINK_PARAMS.auto,
  DEEP_LINK_PARAMS.plan,
  DEEP_LINK_PARAMS.vista,
  DEEP_LINK_PARAMS.nombre,
  DEEP_LINK_PARAMS.rut,
  DEEP_LINK_PARAMS.telefono,
  DEEP_LINK_PARAMS.email,
]);
