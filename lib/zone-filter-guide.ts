import {
  PLAN_TYPE_FILTER_DEFAULT_IDS,
  PLAN_TYPE_FILTER_OPTIONS,
  ZONE_FILTER_OPTIONS,
} from "@/lib/filter-options";
import { FILTER_HELP } from "@/lib/filter-help-content";
import { PUBLIC_API_VERSION } from "@/lib/public-api/constants";
import {
  ZONE_FILTER_DEFINITIONS,
  ZONE_FILTER_HELP_UI,
} from "@/lib/zone-filter-definitions";

export type { ZoneFilterDefinition, ZoneFilterGroup } from "@/lib/zone-filter-definitions";
export { ZONE_FILTER_DEFINITIONS, ZONE_FILTER_HELP_UI } from "@/lib/zone-filter-definitions";

function resolveGuideUrl(request: Request): string {
  const configured = process.env.PUBLIC_API_BASE_URL?.trim();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = configured
    ? configured.replace(/\/api\/public\/v1\/?$/, "")
    : host
      ? `${protocol}://${host}`
      : "https://cotizador.cotizaloantes.cl";

  return `${origin.replace(/\/$/, "")}/api/public/${PUBLIC_API_VERSION}/ui/filters`;
}

export function buildZoneFilterApiGuide(request: Request) {
  const guideUrl = resolveGuideUrl(request);

  return {
    version: "1.0.0",
    component: "zone_filter",
    title: "Guía — Filtro por zona geográfica",
    description:
      "Especificación de zonas/sectores del cotizador para integradores (Cotízalo Antes, buscadores externos) y agentes de IA. Define qué significa cada zona y cómo filtrar planes.",
    canonical_url: guideUrl,
    filter_logic: {
      matching_rule:
        "OR — el plan se incluye si su conjunto de zonas intersecta con al menos una zona activa en el filtro.",
      plan_zone_resolution: [
        "1. Unión de zonas de todas las clínicas en coverage[] del plan.",
        "2. Unión con zones[] explícitas del plan (importación o backfill).",
        "3. Si el plan no tiene zonas resueltas, no aparece cuando hay filtro de zona activo.",
      ],
      clinic_zone_source:
        "Mapa estático clinic_id → zone_ids en src/lib/clinic-zones.ts (sincronizado a BD en clinics.zones).",
      default_active_zone_ids: [
        "rm-metropolitana",
        "rm-oriente",
        "rm-centro",
      ],
      no_zone_filter_active:
        "Si ninguna zona está marcada, no se aplica filtro geográfico (muestra todos los planes).",
    },
    groups: {
      rm_wide: {
        label: "Región Metropolitana (amplia)",
        description: "Cobertura en cualquier sector de la RM.",
      },
      rm_sector: {
        label: "Sectores RM",
        description:
          "Subdivisiones orientativas de Santiago/RM. Cada sector suele incluir también rm-metropolitana en la resolución de clínicas.",
      },
      region: {
        label: "Regiones fuera de RM",
        description: "Norte, Valparaíso, sur y zonas interregionales.",
      },
    },
    zones: ZONE_FILTER_DEFINITIONS.map((zone) => ({
      id: zone.id,
      label: zone.label,
      group: zone.group,
      description: zone.description,
      areas: zone.areas,
      example_providers: zone.example_providers,
      parent_zone_id: zone.parent_zone_id ?? null,
    })),
    filter_options: ZONE_FILTER_OPTIONS,
    deep_link: {
      param: "zonas",
      format: "Lista separada por comas de zone id (ej. zonas=rm-oriente,rm-centro,norte)",
      example: "zonas=rm-metropolitana,rm-oriente,norte",
      behavior:
        "Al abrir el cotizador vía URL, solo quedan activas las zonas listadas; las demás se desactivan.",
    },
    ui_help: ZONE_FILTER_HELP_UI,
    integrator_notes: [
      "Replica el ícono informativo (ℹ) junto al título «Filtrado por Zona» usando ui_help.",
      "Usa zones[].id como valor de checkbox y en el parámetro zonas del deep link.",
      "Para Cotízalo Antes: consumir GET /api/public/v1/ui/filters (sin autenticación).",
      "Los planes en la API incluyen zones[] cuando están persistidos; el filtrado en servidor usa cobertura + zones.",
    ],
    related_endpoints: {
      plans_search: "/api/plans/search",
      plan_card_ui: "/api/public/v1/ui/plan-card",
      docs: "/api/public/v1/docs",
    },
  } as const;
}

export const FILTER_CLEARING_HELP_UI = {
  title: "¿Cómo limpiar filtros y ver todos los planes?",
    paragraphs: [
      "El botón «Limpiar filtros» del panel desactiva Isapres, zonas, tipos de plan, clínicas (hospitalaria y ambulatoria) y umbrales de cobertura.",
    "En cada grupo de checkboxes, si ninguna opción está marcada, ese filtro no se aplica (se incluyen todos los valores de ese eje).",
    "«Limpiar todo» en la barra superior además resetea región, ingreso, edad, cargas, precio y resultados de búsqueda.",
  ],
  button_labels: {
    clear_filters: "Limpiar filtros",
    reset_all: "Limpiar todo",
  },
} as const;

export function buildPlanTypeFilterApiGuide() {
  return {
    version: "1.0.0",
    component: "plan_type_filter",
    title: "Guía — Filtro por tipo de plan",
    filter_logic: {
      matching_rule:
        "OR — el plan se incluye si su tipo inferido coincide con al menos un tipo marcado.",
      inference_rules: [
        "preferred: has_top, o nombre/notas contienen «preferente».",
        "free_choice: nombre/notas contienen «libre elección» o patrón «le ».",
        "closed: nombre contiene «cerrado» o «-sf», o notas contienen «cerrado».",
        "Si no se infiere ninguno, se asume free_choice.",
      ],
      no_plan_type_filter_active:
        "Si ningún tipo está marcado, no se aplica filtro por modalidad (muestra todos los planes).",
      default_active_type_ids: PLAN_TYPE_FILTER_DEFAULT_IDS,
    },
    types: PLAN_TYPE_FILTER_OPTIONS.map((option) => {
      const helpItem = FILTER_HELP.planType.items.find((item) => {
        const normalized = item.label
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        const optionLabel = option.label
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        return normalized === optionLabel;
      });
      return {
        id: option.id,
        label: option.label,
        description: helpItem?.text ?? option.label,
      };
    }),
    deep_link: {
      param: "tipoPlan",
      format: "Lista separada por comas de plan type id (ej. tipoPlan=closed,preferred)",
      example: "tipoPlan=closed,free_choice,preferred",
      behavior:
        "Al abrir el cotizador vía URL, solo quedan activos los tipos listados; los demás se desactivan.",
    },
    ui_help: FILTER_HELP.planType,
  } as const;
}

export function buildClinicFilterApiGuide() {
  return {
    version: "1.0.0",
    component: "clinic_filter",
    title: "Guía — Filtro por clínica (hospitalaria y ambulatoria)",
    description:
      "El cotizador permite seleccionar prestadores de forma independiente para cobertura hospitalaria y ambulatoria.",
    filter_logic: {
      hospital_clinics: {
        matching_rule:
          "AND — el plan se incluye solo si tiene cobertura hospitalaria en todas las clínicas seleccionadas.",
        with_coverage_percent:
          "Si también envías coberturaH, cada clínica hospitalaria seleccionada debe cumplir ese porcentaje mínimo.",
      },
      ambulatory_clinics: {
        matching_rule:
          "AND — el plan se incluye solo si tiene cobertura ambulatoria en todas las clínicas seleccionadas.",
        with_coverage_percent:
          "Si también envías coberturaA, cada clínica ambulatoria seleccionada debe cumplir ese porcentaje mínimo.",
      },
      combined_behavior:
        "Si envías clínicas en ambos tipos, el plan debe cumplir hospitalario y ambulatorio por separado (AND entre tipos).",
      no_clinic_filter_active:
        "Si no envías clinicaH ni clinicaA, no se aplica filtro por clínica en ese tipo.",
    },
    clinic_ids: {
      source_endpoint: "/api/plans/clinics",
      auth_required: false,
      shape: { id: "string — clinic_id slug", name: "string — nombre visible" },
      note: "Usa el campo id en clinicaH y clinicaA. Lista ordenada alfabéticamente por nombre.",
    },
    deep_link: {
      clinicaH: {
        param: "clinicaH",
        format: "Lista separada por comas de clinic_id (cobertura hospitalaria)",
        example: "clinicaH=clinica-alemana,clinica-indisa",
      },
      clinicaA: {
        param: "clinicaA",
        format: "Lista separada por comas de clinic_id (cobertura ambulatoria)",
        example: "clinicaA=clinica-redsalud-providencia",
      },
      clinica_legacy: {
        param: "clinica",
        format: "Legacy — aplica la misma lista a hospitalario y ambulatorio",
        example: "clinica=clinica-alemana",
        behavior:
          "Solo se usa si no envías clinicaH ni clinicaA. Preferir clinicaH/clinicaA para selecciones distintas por tipo.",
      },
    },
    ui_help: FILTER_HELP.coverage,
    integrator_notes: [
      "clinicaH y clinicaA son independientes: puedes filtrar una clínica en hospitalario y otra en ambulatorio.",
      "Combina con coberturaH / coberturaA para exigir un porcentaje mínimo en clínicas del tipo correspondiente.",
      "En POST /api/public/v1/cotizador/url usa clinicaH y clinicaA como string[] (ids de clínica).",
    ],
  } as const;
}

export function buildFilterClearingApiGuide() {
  return {
    version: "1.0.0",
    component: "filter_clearing",
    title: "Guía — Limpiar filtros y mostrar todos los planes",
    cleared_filters_state: {
      isapres: "ninguna isapre marcada → sin filtro por isapre",
      zones: "ninguna zona marcada → sin filtro geográfico",
      plan_types: "ningún tipo marcado → sin filtro por modalidad",
      hospital_clinic_ids: [],
      ambulatory_clinic_ids: [],
      hospital_coverage_percent: null,
      ambulatory_coverage_percent: null,
    },
    default_filters_state: {
      note: "Estado inicial al abrir el cotizador o al usar «Limpiar todo» (solo la parte de filtros).",
      isapres: ["consalud"],
      zones: ["rm-metropolitana", "rm-oriente", "rm-centro"],
      plan_types: PLAN_TYPE_FILTER_DEFAULT_IDS,
      hospital_clinic_ids: [],
      ambulatory_clinic_ids: [],
      hospital_coverage_percent: null,
      ambulatory_coverage_percent: null,
    },
    ui_help: FILTER_CLEARING_HELP_UI,
  } as const;
}

export function buildFiltersUiGuide(request: Request) {
  const zoneGuide = buildZoneFilterApiGuide(request);
  const planTypeGuide = buildPlanTypeFilterApiGuide();
  const clinicGuide = buildClinicFilterApiGuide();
  const clearingGuide = buildFilterClearingApiGuide();

  return {
    version: "1.2.0",
    title: "Guía UI — Filtros del cotizador",
    description:
      "Documentación de filtros del panel lateral para integradores: zonas, tipos de plan, clínicas (hospitalaria/ambulatoria) y cómo limpiar filtros.",
    canonical_url: zoneGuide.canonical_url,
    sections: {
      zone_filter: zoneGuide,
      plan_type_filter: planTypeGuide,
      clinic_filter: clinicGuide,
      filter_clearing: clearingGuide,
    },
  } as const;
}
