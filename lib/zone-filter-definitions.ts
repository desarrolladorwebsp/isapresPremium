import type { ZoneId } from "@/types/zone";

export type ZoneFilterGroup = "rm_sector" | "rm_wide" | "region";

export interface ZoneFilterDefinition {
  id: ZoneId;
  label: string;
  group: ZoneFilterGroup;
  description: string;
  areas: string;
  example_providers: string[];
  /** Si aplica, la zona padre que también coincide al filtrar por sector RM. */
  parent_zone_id?: ZoneId;
}

/** Catálogo canónico de zonas del filtro del cotizador. */
export const ZONE_FILTER_DEFINITIONS: ZoneFilterDefinition[] = [
  {
    id: "rm-metropolitana",
    label: "Región Metropolitana",
    group: "rm_wide",
    description:
      "Cobertura en toda la Región Metropolitana. Incluye prestadores de cualquier sector de Santiago y alrededores.",
    areas:
      "Santiago, Providencia, Las Condes, Maipú, Puente Alto, San Bernardo y comunas RM en general.",
    example_providers: [
      "Redes amplias (Integramédica, Vidaintegra)",
      "Clínicas con presencia en varios sectores",
    ],
  },
  {
    id: "rm-oriente",
    label: "RM Oriente",
    group: "rm_sector",
    parent_zone_id: "rm-metropolitana",
    description:
      "Sector oriente de Santiago: comunas al este del centro, zona de alta concentración clínica.",
    areas:
      "Las Condes, Providencia, Vitacura, Lo Barnechea, La Reina, Peñalolén (orientación geográfica).",
    example_providers: [
      "Clínica Las Condes",
      "Clínica Indisa Providencia",
      "Clínica Alemana",
      "Clínica Santa María",
      "Red UC Christus",
    ],
  },
  {
    id: "rm-centro",
    label: "RM Centro",
    group: "rm_sector",
    parent_zone_id: "rm-metropolitana",
    description:
      "Santiago centro y comunas céntricas con prestadores hospitalarios y ambulatorios.",
    areas: "Santiago centro, Ñuñoa (sector central), comunas del eje céntrico.",
    example_providers: [
      "Clínica RedSalud Santiago",
      "Clínica Meds",
      "Hospital Clínico UC",
      "Hospital Clínico U. de Chile",
    ],
  },
  {
    id: "rm-norte",
    label: "RM Norte",
    group: "rm_sector",
    parent_zone_id: "rm-metropolitana",
    description:
      "Sector norte de la RM: comunas del sector nororiente y norte de Santiago.",
    areas:
      "Huechuraba, Quilicura, Conchalí, Independencia y sector norte metropolitano.",
    example_providers: ["Clínica Dávila Vespucio", "Centros en sector norte RM"],
  },
  {
    id: "rm-sur",
    label: "RM Sur",
    group: "rm_sector",
    parent_zone_id: "rm-metropolitana",
    description: "Sector sur de la RM: comunas al sur del centro de Santiago.",
    areas: "San Bernardo, La Florida, Puente Alto y comunas del sector sur.",
    example_providers: ["Hospital Parroquial de San Bernardo"],
  },
  {
    id: "rm-poniente",
    label: "RM Poniente",
    group: "rm_sector",
    parent_zone_id: "rm-metropolitana",
    description: "Sector poniente de Santiago: comunas al oeste del centro.",
    areas: "Maipú, Pudahuel, Cerrillos, Estación Central (poniente).",
    example_providers: ["Clínica Indisa Maipú", "Clínica Bupa Santiago"],
  },
  {
    id: "norte",
    label: "Zona Norte",
    group: "region",
    description:
      "Regiones del norte grande de Chile. Planes con prestadores fuera de la RM hacia Arica, Tarapacá, Antofagasta y Coquimbo.",
    areas: "Arica, Iquique, Antofagasta, Atacama, Coquimbo / Elqui.",
    example_providers: [
      "Clínica San José (Arica / Interclínica)",
      "Clínica RedSalud Iquique",
      "Clínica RedSalud Elqui",
      "Clínica Atacama",
    ],
  },
  {
    id: "octava",
    label: "Octava Región",
    group: "region",
    description:
      "Zona centro-sur: Biobío, Ñuble, Maule y sur central. Complementa la cobertura fuera de Santiago.",
    areas: "Concepción, Chillán, Talca, Los Ángeles y zona sur-central.",
    example_providers: [
      "Clínica Biobío",
      "Clínica Andes Salud Concepción",
      "Clínica Los Andes Los Ángeles",
      "Sanatorio Alemán",
    ],
  },
  {
    id: "valparaiso",
    label: "Valparaíso",
    group: "region",
    description: "Región de Valparaíso y Costa central.",
    areas: "Viña del Mar, Valparaíso, Reñaca, Quilpué.",
    example_providers: [
      "Clínica RedSalud Valparaíso",
      "Clínica Bupa Reñaca",
      "Hospital Clínico de Viña del Mar",
    ],
  },
  {
    id: "biobio",
    label: "Biobío",
    group: "region",
    description:
      "Sur de Chile: Biobío, Araucanía, Los Ríos, Los Lagos y Magallanes (prestadores del sur).",
    areas: "Concepción, Temuco, Valdivia, Puerto Montt, Punta Arenas.",
    example_providers: [
      "Clínica Alemana Temuco",
      "Clínica Alemana Valdivia",
      "Clínica RedSalud Magallanes",
    ],
  },
];

const ZONE_FILTER_INTRO = [
  "Un plan aparece si tiene al menos un prestador (clínica o centro) en alguna de las zonas que marques.",
  "Las zonas se calculan desde las clínicas de la cobertura del plan. Si el plan no tiene detalle de clínicas, se usan zonas asignadas al importarlo (ej. planes de regiones).",
  "Puedes marcar varias zonas a la vez: se muestran planes que coincidan con cualquiera de ellas.",
  "Para ver planes de cualquier zona, desmarca todas las opciones o usa «Limpiar filtros» en el panel.",
] as const;

const ZONE_FILTER_FOOTNOTE =
  "Los sectores RM (Oriente, Centro, etc.) son subáreas de la Región Metropolitana. Muchas clínicas pertenecen a su sector y también a «Región Metropolitana».";

export const ZONE_FILTER_HELP_UI = {
  title: "¿Cómo funciona el filtro por zona?",
  paragraphs: [...ZONE_FILTER_INTRO],
  items: ZONE_FILTER_DEFINITIONS.map((zone) => ({
    label: zone.label,
    text: `${zone.description} Áreas: ${zone.areas}`,
  })),
  footnote: ZONE_FILTER_FOOTNOTE,
  source: "Cotizador Isapres — catálogo de clínicas y zonas",
} as const;
