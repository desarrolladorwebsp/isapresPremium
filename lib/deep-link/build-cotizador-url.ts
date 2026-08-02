import {
  getActiveCheckboxIds,
  getActiveAmbulatoryClinicIds,
  getActiveHospitalClinicIds,
} from "@/lib/filter-options";
import {
  ISAPRE_FILTER_OPTIONS,
  PLAN_TYPE_FILTER_OPTIONS,
  ZONE_FILTER_OPTIONS,
} from "@/lib/filter-options";
import { getPrimaryContributorAge } from "@/lib/beneficiary-state";
import { DEEP_LINK_PARAMS } from "@/lib/deep-link/params";
import { normalizeIncomeDigits } from "@/lib/deep-link/income";
import {
  PREMIUM_COTIZADOR_PATH,
  resolveAppBaseUrl,
  usesPremiumRouting,
} from "@/lib/platform/routing";
import type {
  ParsedCotizadorDeepLink,
  SolicitarModalTab,
} from "@/lib/deep-link/parse-cotizador-url";

export interface BuildCotizadorUrlInput {
  baseUrl?: string;
  entidad?: string;
  /** Alias explícito de entidad (agent key / embed key). */
  agent?: string;
  region?: string;
  edad?: number;
  sexo?: string;
  ingreso?: string;
  cargas?: number[];
  q?: string;
  precioMin?: number;
  precioMax?: number;
  isapres?: string[];
  zonas?: string[];
  /** @deprecated Usar clinicaH y clinicaA */
  clinica?: string | string[];
  clinicaH?: string | string[];
  clinicaA?: string | string[];
  tipoPlan?: string[];
  coberturaH?: number;
  coberturaA?: number;
  orden?: string;
  moneda?: string;
  auto?: boolean;
  email?: string;
  plan?: string;
  vista?: SolicitarModalTab | "precio" | "solicitar";
  nombre?: string;
  rut?: string;
  telefono?: string;
}

export interface BuildCotizadorUrlOptions {
  /** Siempre usa /cotizador?agent= (salida del widget embebido). */
  forcePremiumPath?: boolean;
}

function resolveVistaParam(
  vista: BuildCotizadorUrlInput["vista"],
): string | undefined {
  if (!vista) return undefined;
  if (vista === "price" || vista === "precio") return "precio";
  if (vista === "request" || vista === "solicitar") return "solicitar";
  return "overview";
}

function appendCotizadorQueryParams(
  params: URLSearchParams,
  input: BuildCotizadorUrlInput,
  usePremiumAgentParam: boolean,
): void {
  const agent = (input.agent ?? input.entidad)?.trim().toLowerCase();

  if (agent) {
    if (usePremiumAgentParam) {
      params.set(DEEP_LINK_PARAMS.agent, agent);
    } else {
      params.set(DEEP_LINK_PARAMS.entidad, agent);
    }
  }
  if (input.region) params.set(DEEP_LINK_PARAMS.region, input.region);
  if (input.edad !== undefined) params.set(DEEP_LINK_PARAMS.edad, String(input.edad));
  if (input.sexo) params.set(DEEP_LINK_PARAMS.sexo, input.sexo);
  if (input.ingreso) {
    const digits = normalizeIncomeDigits(input.ingreso);
    if (digits) params.set(DEEP_LINK_PARAMS.ingreso, digits);
  }
  if (input.cargas?.length) {
    params.set(DEEP_LINK_PARAMS.cargas, input.cargas.join(","));
  }
  if (input.q) params.set(DEEP_LINK_PARAMS.q, input.q);
  if (input.precioMin !== undefined) {
    params.set(DEEP_LINK_PARAMS.precioMin, String(input.precioMin));
  }
  if (input.precioMax !== undefined) {
    params.set(DEEP_LINK_PARAMS.precioMax, String(input.precioMax));
  }
  if (input.isapres?.length) {
    params.set(DEEP_LINK_PARAMS.isapres, input.isapres.join(","));
  }
  if (input.zonas?.length) {
    params.set(DEEP_LINK_PARAMS.zonas, input.zonas.join(","));
  }
  const appendClinicParam = (
    key: "clinica" | "clinicaH" | "clinicaA",
    value: string | string[] | undefined,
  ) => {
    if (!value) return;
    const clinicIds = Array.isArray(value)
      ? value.map((id) => id.trim()).filter(Boolean)
      : value
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
    if (clinicIds.length > 0) {
      params.set(DEEP_LINK_PARAMS[key], clinicIds.join(","));
    }
  };
  appendClinicParam("clinicaH", input.clinicaH);
  appendClinicParam("clinicaA", input.clinicaA);
  if (!input.clinicaH && !input.clinicaA) {
    appendClinicParam("clinica", input.clinica);
  }
  if (input.tipoPlan?.length) {
    params.set(DEEP_LINK_PARAMS.tipoPlan, input.tipoPlan.join(","));
  }
  if (input.coberturaH !== undefined) {
    params.set(DEEP_LINK_PARAMS.coberturaH, String(input.coberturaH));
  }
  if (input.coberturaA !== undefined) {
    params.set(DEEP_LINK_PARAMS.coberturaA, String(input.coberturaA));
  }
  if (input.orden) params.set(DEEP_LINK_PARAMS.orden, input.orden);
  if (input.moneda) params.set(DEEP_LINK_PARAMS.moneda, input.moneda);
  if (input.auto !== undefined) {
    params.set(DEEP_LINK_PARAMS.auto, input.auto ? "1" : "0");
  }
  if (input.email) params.set(DEEP_LINK_PARAMS.email, input.email.trim());
  if (input.plan) params.set(DEEP_LINK_PARAMS.plan, input.plan.trim());
  const vista = resolveVistaParam(input.vista);
  if (vista) params.set(DEEP_LINK_PARAMS.vista, vista);
  if (input.nombre) params.set(DEEP_LINK_PARAMS.nombre, input.nombre.trim());
  if (input.rut) params.set(DEEP_LINK_PARAMS.rut, input.rut.trim());
  if (input.telefono) params.set(DEEP_LINK_PARAMS.telefono, input.telefono.trim());
}

export function buildCotizadorUrl(
  input: BuildCotizadorUrlInput,
  options: BuildCotizadorUrlOptions = {},
): string {
  const base = resolveAppBaseUrl(input.baseUrl);
  const usePremiumPath =
    options.forcePremiumPath ?? usesPremiumRouting(base);
  const params = new URLSearchParams();

  appendCotizadorQueryParams(params, input, usePremiumPath);

  const query = params.toString();

  if (usePremiumPath) {
    return query
      ? `${base}${PREMIUM_COTIZADOR_PATH}?${query}`
      : `${base}${PREMIUM_COTIZADOR_PATH}`;
  }

  const agent = (input.agent ?? input.entidad)?.trim().toLowerCase();
  const path = agent ? `/${agent}` : "";
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

export function buildCotizadorUrlFromParsed(
  parsed: ParsedCotizadorDeepLink,
  baseUrl?: string,
  options: BuildCotizadorUrlOptions = {},
): string {
  return buildCotizadorUrl({
    baseUrl,
    entidad: parsed.entidad,
    region: parsed.criteria.region,
    edad: getPrimaryContributorAge(parsed.beneficiaries) ?? undefined,
    sexo: parsed.criteria.sex || undefined,
    ingreso: parsed.criteria.monthlyIncome || undefined,
    cargas: parsed.beneficiaries.dependents
      .map((dep) => dep.age)
      .filter((age): age is number => age !== null),
    q: parsed.q,
    precioMin: parsed.priceMin,
    precioMax: parsed.priceMax,
    isapres: getActiveCheckboxIds(parsed.filters.isapres),
    zonas: getActiveCheckboxIds(parsed.filters.zones),
    clinicaH: getActiveHospitalClinicIds(parsed.filters),
    clinicaA: getActiveAmbulatoryClinicIds(parsed.filters),
    tipoPlan: getActiveCheckboxIds(parsed.filters.planTypes),
    coberturaH: parsed.filters.hospitalCoveragePercent ?? undefined,
    coberturaA: parsed.filters.ambulatoryCoveragePercent ?? undefined,
    orden: parsed.sortKey,
    moneda: parsed.currency,
    auto: parsed.shouldAutoSearch,
    email: parsed.email,
    plan: parsed.planCode,
    vista: parsed.modalTab,
    nombre: parsed.requestPrefill?.name,
    rut: parsed.requestPrefill?.rut,
    telefono: parsed.requestPrefill?.phone,
  }, options);
}

export function buildSolicitarUrl(
  input: BuildCotizadorUrlInput & { plan: string },
  options: BuildCotizadorUrlOptions = {},
): string {
  return buildCotizadorUrl({
    ...input,
    vista: input.vista ?? "solicitar",
    q: input.q ?? input.plan,
    auto: input.auto ?? Boolean(input.region || input.edad !== undefined),
  }, options);
}

export function getSolicitarDeepLinkDocumentation(
  baseUrl = "https://cotizador.cotizaloantes.cl",
) {
  const cotizadorBase = baseUrl.replace(/\/$/, "");

  const exampleSolicitar = buildSolicitarUrl({
    baseUrl: cotizadorBase,
    entidad: "cotizaloantes",
    plan: "CONSALUD-PLAN-EJEMPLO",
    region: "rm",
    edad: 34,
    sexo: "m",
    ingreso: "1500000",
    cargas: [8],
    nombre: "María González",
    rut: "12345678-9",
    email: "maria@ejemplo.cl",
    telefono: "+56912345678",
    auto: true,
  });

  return {
    title: "Deep link — solicitar plan desde sitio externo",
    summary:
      "Cuando el usuario hace clic en «Solicitar» en un card de plan en cotizaloantes.cl (u otro sitio aliado), redirígelo al cotizador con el parámetro plan y los datos del cotizante. El cotizador abrirá automáticamente el modal de solicitud en la pestaña «Solicitar» con el formulario prellenado.",
    cotizador_base_url: cotizadorBase,
    required_parameters: [
      {
        name: DEEP_LINK_PARAMS.plan,
        type: "string",
        description:
          "Código único del plan (unique_code). Obligatorio para abrir el modal de solicitud.",
        example: "CONSALUD-PLAN-EJEMPLO",
      },
    ],
    recommended_parameters: [
      {
        name: DEEP_LINK_PARAMS.entidad,
        description: "Slug del aliado para branding y atribución.",
        example: "cotizaloantes",
      },
      {
        name: DEEP_LINK_PARAMS.vista,
        description:
          "Pestaña inicial del modal. Por defecto solicitar si plan está presente.",
        example: "solicitar",
        allowed_values: [
          "solicitar",
          "request",
          "precio",
          "price",
          "overview",
          "general",
        ],
      },
      {
        name: DEEP_LINK_PARAMS.region,
        description: "Región del cotizante (para calcular precio en el modal).",
        example: "rm",
      },
      {
        name: DEEP_LINK_PARAMS.edad,
        description: "Edad del cotizante principal.",
        example: "34",
      },
      {
        name: DEEP_LINK_PARAMS.sexo,
        description:
          "Opcional y obsoleto. Sexo del cotizante (m/f). Ya no se muestra en la UI; se ignora salvo compatibilidad con enlaces antiguos.",
        example: "m",
        deprecated: true,
      },
      {
        name: DEEP_LINK_PARAMS.ingreso,
        description: "Ingreso mensual líquido en CLP (solo dígitos).",
        example: "1500000",
      },
      {
        name: DEEP_LINK_PARAMS.cargas,
        description: "Edades de cargas familiares separadas por coma.",
        example: "32,8",
      },
      {
        name: DEEP_LINK_PARAMS.nombre,
        description: "Nombre del solicitante (prellena el formulario).",
        example: "María González",
      },
      {
        name: DEEP_LINK_PARAMS.rut,
        description: "RUT del solicitante.",
        example: "12345678-9",
      },
      {
        name: DEEP_LINK_PARAMS.email,
        description: "Correo del solicitante.",
        example: "maria@ejemplo.cl",
      },
      {
        name: DEEP_LINK_PARAMS.telefono,
        description: "Teléfono de contacto.",
        example: "+56912345678",
      },
      {
        name: DEEP_LINK_PARAMS.auto,
        description:
          "1 para ejecutar búsqueda de planes al cargar (recomendado si envías criterios de cotización).",
        example: "1",
      },
    ],
    user_flow: [
      "1. Usuario cotiza en cotizaloantes.cl y ve cards de planes.",
      "2. Hace clic en «Solicitar» en un plan.",
      "3. El sitio externo redirige al cotizador con plan=<unique_code> y datos del usuario.",
      "4. El cotizador abre el modal del plan en la pestaña Solicitar.",
      "5. El usuario completa los campos faltantes y envía la solicitud.",
      "6. La solicitud se guarda vía POST /api/quotes y se notifica por correo.",
    ],
    modal_tabs: [
      {
        id: "overview",
        url_values: ["overview", "general", "vista-general"],
        label: "Vista general",
      },
      {
        id: "price",
        url_values: ["precio", "price"],
        label: "Precio",
      },
      {
        id: "request",
        url_values: ["solicitar", "request"],
        label: "Solicitar",
      },
    ],
    examples: {
      solicitar_link: exampleSolicitar,
      html_anchor: `<a href="${exampleSolicitar}">Solicitar este plan</a>`,
      javascript_redirect: `window.location.href = ${JSON.stringify(exampleSolicitar)};`,
      build_with_api: `POST ${cotizadorBase}/api/public/v1/solicitar/url`,
    },
    api_builder: {
      method: "POST",
      path: "/api/public/v1/solicitar/url",
      auth_required: true,
      description:
        "Genera la URL de redirección con validación de parámetros. Recomendado para backends que no quieren armar la URL manualmente.",
    },
    notes_for_integrators: [
      "El parámetro plan es obligatorio para el flujo de solicitud.",
      "En cotizaloantes.cl, antes de redirigir al cotizador el sitio debe validar que el usuario completó región, ingreso mensual y edad en la barra superior.",
      "Si faltan datos, mostrar alerta: «Para solicitar el plan y recibir un precio adecuado, completa región, ingreso mensual líquido y edad en la barra superior».",
      "Si solo envías plan sin criterios de cotización, el modal se abre igual; el precio estimado puede requerir que el usuario complete edad/región.",
      "Usa POST /api/public/v1/solicitar/url desde tu backend para construir la URL de forma segura.",
      "El unique_code del plan lo obtienes de GET /api/public/v1/plans o /plans/preview.",
      "No expongas PUBLIC_API_SECRET en el frontend del sitio externo.",
    ],
    cotizalo_antes_client_validation: {
      required_before_solicitar: ["region", "ingreso", "edad"],
      alert_title: "Completa los datos del cotizador",
      alert_message:
        "Para solicitar el plan y recibir un precio adecuado, completa los datos de la barra superior: región, ingreso mensual líquido y edad.",
      proxy_endpoints: {
        plans: "/api/cotizador/plans/preview",
        solicitar: "/api/cotizador/solicitar",
      },
    },
  };
}

export function getDeepLinkDocumentation(baseUrl = "https://cotizador.cotizaloantes.cl") {
  const cotizadorBase = baseUrl.replace(/\/$/, "");

  const exampleFull = buildCotizadorUrl({
    baseUrl: cotizadorBase,
    entidad: "cotizaloantes",
    region: "rm",
    edad: 34,
    sexo: "m",
    ingreso: "1500000",
    cargas: [32, 8],
    isapres: ["consalud", "colmena"],
    zonas: ["rm-metropolitana", "rm-centro"],
    precioMin: 2,
    precioMax: 6,
    coberturaH: 70,
    coberturaA: 60,
    clinicaH: ["clinica-alemana", "clinica-indisa"],
    clinicaA: ["clinica-redsalud-providencia"],
    orden: "price_asc",
    moneda: "clp",
    auto: true,
  });

  const exampleMinimal = buildCotizadorUrl({
    baseUrl: cotizadorBase,
    entidad: "cotizaloantes",
    region: "rm",
    edad: 34,
    auto: true,
  });

  const examplePathEntity = `${cotizadorBase}/cotizaloantes?region=rm&edad=34&sexo=m&auto=1`;

  return {
    title: "Deep link — enviar datos al cotizador vía URL",
    summary:
      "Para abrir el cotizador con datos prellenados y búsqueda automática, redirige al usuario con query params en la URL. No requiere autenticación API: es un enlace web directo.",
    cotizador_base_url: cotizadorBase,
    url_formats: [
      {
        format: "query_string",
        pattern: `${cotizadorBase}/?<parametros>`,
        description:
          "Formato recomendado. El primer parámetro relevante suele ser entidad (cliente aliado).",
        example: exampleFull,
      },
      {
        format: "path_entity",
        pattern: `${cotizadorBase}/<entidad>?<parametros>`,
        description:
          "Alternativa: la entidad va en la ruta y los filtros en query string.",
        example: examplePathEntity,
      },
      {
        format: "redirect_entidad",
        pattern: `${cotizadorBase}/?entidad=<slug>&<parametros>`,
        description:
          "Si usas ?entidad=, el middleware redirige a /<slug> y persiste la cookie de entidad.",
        example: exampleMinimal,
      },
    ],
    how_to_send: {
      steps: [
        "1. Define la entidad aliada en el parámetro entidad (ej. cotizaloantes) o en la ruta /cotizaloantes.",
        "2. Agrega los datos del cotizante: region, edad, ingreso, cargas (sexo opcional/legacy).",
        "3. Agrega filtros opcionales: isapres, zonas, tipoPlan, clinicaH, clinicaA, precioMin, precioMax, coberturaH, coberturaA.",
        "4. Incluye auto=1 para ejecutar la búsqueda al cargar (recomendado cuando envías datos).",
        "5. Redirige al usuario con window.location.href, <a href>, o HTTP 302 desde tu backend.",
      ],
      encoding_rules: [
        "Usa URLSearchParams o encodeURIComponent para valores especiales.",
        "Listas múltiples van separadas por coma sin espacios (ej. isapres=consalud,colmena).",
        "Edades de cargas separadas por coma (ej. cargas=32,8,15).",
        "Valores inválidos se ignoran; el cotizador no falla.",
        "Si no envías parámetros, el cotizador usa Cotízalo Antes por defecto.",
      ],
      auto_search: {
        auto_1: "Busca automáticamente al cargar la página (recomendado).",
        auto_0: "Solo prellena el formulario; el usuario debe pulsar «Buscar mejor plan».",
        default: "Si omites auto, se busca automáticamente al cargar.",
      },
    },
    parameters: [
      {
        name: DEEP_LINK_PARAMS.entidad,
        required: false,
        type: "string",
        description: "Slug del cliente aliado (white-label). Define logo, colores, WhatsApp y link de salida.",
        example: "cotizaloantes",
        default: "cotizaloantes",
      },
      {
        name: DEEP_LINK_PARAMS.region,
        required: false,
        type: "string",
        description: "Región del cotizante.",
        example: "rm",
        allowed_values: [
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
        ],
      },
      {
        name: DEEP_LINK_PARAMS.edad,
        required: false,
        type: "integer",
        description: "Edad del cotizante principal (0–120).",
        example: "34",
      },
      {
        name: DEEP_LINK_PARAMS.sexo,
        required: false,
        type: "string",
        description:
          "Opcional y obsoleto. Sexo del cotizante (m/f). Ya no se usa en la UI del cotizador.",
        example: "m",
        allowed_values: ["m", "f"],
      },
      {
        name: DEEP_LINK_PARAMS.ingreso,
        required: false,
        type: "string",
        description: "Ingreso mensual líquido en pesos chilenos (sin puntos ni símbolos).",
        example: "1500000",
      },
      {
        name: DEEP_LINK_PARAMS.cargas,
        required: false,
        type: "string",
        description: "Edades de cargas familiares, separadas por coma.",
        example: "32,8",
      },
      {
        name: DEEP_LINK_PARAMS.q,
        required: false,
        type: "string",
        description: "Texto libre para filtrar por nombre, código o Isapre.",
        example: "consalud",
      },
      {
        name: DEEP_LINK_PARAMS.precioMin,
        required: false,
        type: "number",
        description: "Precio mínimo del plan en UF.",
        example: "2.5",
      },
      {
        name: DEEP_LINK_PARAMS.precioMax,
        required: false,
        type: "number",
        description: "Precio máximo del plan en UF.",
        example: "6",
      },
      {
        name: DEEP_LINK_PARAMS.isapres,
        required: false,
        type: "string",
        description: "Isapres activas, ids separados por coma.",
        example: "consalud,colmena",
        allowed_values: ISAPRE_FILTER_OPTIONS.map((option) => option.id),
      },
      {
        name: DEEP_LINK_PARAMS.zonas,
        required: false,
        type: "string",
        description:
          "Zonas geográficas activas, ids separados por coma. Cada id corresponde a un sector RM o región (ver guía GET /api/public/v1/ui/filters).",
        example: "rm-metropolitana,rm-centro",
        allowed_values: ZONE_FILTER_OPTIONS.map((option) => option.id),
        documentation_url: "/api/public/v1/ui/filters",
      },
      {
        name: DEEP_LINK_PARAMS.tipoPlan,
        required: false,
        type: "string",
        description: "Tipos de plan activos, ids separados por coma.",
        example: "closed,preferred",
        allowed_values: PLAN_TYPE_FILTER_OPTIONS.map((option) => option.id),
      },
      {
        name: DEEP_LINK_PARAMS.clinicaH,
        required: false,
        type: "string",
        description:
          "Clínicas para filtrar cobertura hospitalaria (clinic_id separados por coma). Ver GET /api/plans/clinics y guía GET /api/public/v1/ui/filters (clinic_filter).",
        example: "clinica-alemana,clinica-indisa",
        documentation_url: "/api/public/v1/ui/filters",
      },
      {
        name: DEEP_LINK_PARAMS.clinicaA,
        required: false,
        type: "string",
        description:
          "Clínicas para filtrar cobertura ambulatoria (clinic_id separados por coma). Independiente de clinicaH.",
        example: "clinica-redsalud-providencia",
        documentation_url: "/api/public/v1/ui/filters",
      },
      {
        name: DEEP_LINK_PARAMS.clinica,
        required: false,
        type: "string",
        description:
          "Legacy — aplica la misma lista de clínicas a hospitalario y ambulatorio. Ignorado si envías clinicaH o clinicaA.",
        example: "clinica-alemana",
        documentation_url: "/api/public/v1/ui/filters",
      },
      {
        name: DEEP_LINK_PARAMS.coberturaH,
        required: false,
        type: "integer",
        description: "Cobertura hospitalaria mínima (%).",
        example: "70",
        allowed_values: [40, 50, 60, 70, 80, 90, 100],
      },
      {
        name: DEEP_LINK_PARAMS.coberturaA,
        required: false,
        type: "integer",
        description: "Cobertura ambulatoria mínima (%).",
        example: "60",
        allowed_values: [40, 50, 60, 70, 80, 90, 100],
      },
      {
        name: DEEP_LINK_PARAMS.orden,
        required: false,
        type: "string",
        description: "Orden de resultados.",
        example: "price_asc",
        allowed_values: ["price_asc", "price_desc", "coverage"],
      },
      {
        name: DEEP_LINK_PARAMS.moneda,
        required: false,
        type: "string",
        description: "Moneda de visualización de precios.",
        example: "clp",
        allowed_values: ["clp", "uf"],
      },
      {
        name: DEEP_LINK_PARAMS.auto,
        required: false,
        type: "string",
        description: "Control de búsqueda automática al cargar.",
        example: "1",
        allowed_values: ["0", "1"],
      },
    ],
    examples: {
      full_link: exampleFull,
      minimal_link: exampleMinimal,
      path_entity_link: examplePathEntity,
      html_anchor: `<a href="${exampleFull}">Cotizar plan de salud</a>`,
      javascript_redirect: `window.location.href = ${JSON.stringify(exampleFull)};`,
      javascript_build: `const params = new URLSearchParams({
  entidad: "cotizaloantes",
  region: "rm",
  edad: "34",
  sexo: "m",
  ingreso: "1500000",
  cargas: "32,8",
  isapres: "consalud,colmena",
  auto: "1"
});
window.location.href = "${cotizadorBase}/?" + params.toString();`,
      php_redirect: `<?php
$params = http_build_query([
  'entidad' => 'cotizaloantes',
  'region' => 'rm',
  'edad' => 34,
  'sexo' => 'm',
  'auto' => 1,
]);
header('Location: ${cotizadorBase}/?' . $params);
exit;`,
    },
    api_builder: {
      method: "POST",
      path: "/api/public/v1/cotizador/url",
      auth_required: true,
      description:
        "Genera la URL de redirección al cotizador completo con validación de parámetros. Misma lógica que el widget embebido al pulsar «Buscar mejor plan».",
    },
    notes_for_integrators: [
      "El deep link es público: no necesitas PUBLIC_API_SECRET para redirigir usuarios al cotizador.",
      "La API REST (/api/public/v1/plans) sí requiere PUBLIC_API_SECRET para consumir datos de planes programáticamente.",
      "Para integraciones ligeras usa GET /api/public/v1/plans/preview (6 planes con resumen de coberturas).",
      "Usa entidad=cotizaloantes para el branding de Cotízalo Antes (logo naranja, WhatsApp y botón volver).",
      "Si envías isapres o zonas, solo quedan activos los ids listados; el resto se desactiva.",
      "Usa clinicaH y clinicaA para filtrar clínicas por tipo de cobertura; clinica (legacy) aplica la misma lista a ambos.",
      "Los clinic_id válidos están en GET /api/plans/clinics (id + name).",
      "Para el significado de cada zona/sector (RM Oriente, Norte, etc.) y textos del ícono informativo, consulta GET /api/public/v1/ui/filters (público, sin API key).",
      "Parámetros desconocidos o mal formados se ignoran silenciosamente.",
    ],
  };
}
