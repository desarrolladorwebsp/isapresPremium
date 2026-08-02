import type { IsaprePageContent } from "@/lib/isapre-pages/types";

/** Contenido editorial basado en información pública de cada Isapre (sitios oficiales, Superintendencia de Salud). */
export const ISAPRE_PAGE_CONTENT: Record<string, IsaprePageContent> = {
  banmedica: {
    id: "banmedica",
    name: "Banmédica",
    badge: "ISAPRE ABIERTA · GRUPO BANMÉDICA",
    tagline: "Red propia y planes desde menos de 1 UF",
    heroDescription:
      "Banmédica integra red clínica propia, copagos preferentes y una oferta amplia de planes abiertos y preferentes para distintos perfiles y presupuestos en Chile.",
    officialWebsite: "https://www.banmedica.cl",
    logoSrc: "/images/isapres/isapre-banmedica.png",
    benefits: [
      "Red propia: Clínica Santa María, Dávila, Bicentenario La Florida y más",
      "Copagos preferentes en prestadores del grupo Banmédica",
      "App y telemedicina para gestionar tu salud",
      "Amplio catálogo para jóvenes, familias y adultos mayores",
    ],
    idealFor: [
      "Familias que valoran clínicas Santa María o Dávila",
      "Quienes buscan planes de entrada accesibles en UF",
      "Personas que quieren muchas opciones para comparar",
    ],
    highlights: [
      {
        title: "Precio base competitivo",
        description:
          "Alternativas de entrada con valores referenciales entre las más bajas del mercado abierto.",
      },
      {
        title: "Catálogo extenso",
        description:
          "Gran flexibilidad para ajustar cobertura hospitalaria, ambulatoria y red de prestadores.",
      },
      {
        title: "Red clínica propia",
        description:
          "Atención preferente en centros de alta demanda en la RM y principales ciudades del país.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Plan de entrada con cobertura esencial y enfoque digital.",
      medio: "Red preferente con mejores copagos en clínicas en convenio.",
      premium: "Alta cobertura hospitalaria y ambulatoria en red premium.",
    },
  },
  colmena: {
    id: "colmena",
    name: "Colmena",
    badge: "ISAPRE ABIERTA · DESDE 1983",
    tagline: "Trayectoria, red preferente y planes para cada etapa de vida",
    heroDescription:
      "Colmena es una de las Isapres con mayor presencia en el mercado chileno, con planes preferentes, libre elección y alternativas orientadas a familias y trabajadores independientes.",
    officialWebsite: "https://www.colmena.cl",
    logoSrc: "/images/isapres/isapre-colmena.png",
    benefits: [
      "Red preferente con clínicas de alta complejidad en Santiago y regiones",
      "Programas de medicina preventiva y chequeos",
      "Planes Star, Max y Pro para distintos niveles de cobertura",
      "Atención digital y sucursales a lo largo del país",
    ],
    idealFor: [
      "Familias que buscan equilibrio entre precio y red clínica",
      "Profesionales que valoran prestadores preferentes",
      "Quienes comparan varias líneas de producto dentro de una misma Isapre",
    ],
    highlights: [
      {
        title: "Oferta diversificada",
        description:
          "Múltiples líneas de planes para ajustar cobertura y prima mensual.",
      },
      {
        title: "Red clínica amplia",
        description:
          "Convenios con prestadores relevantes en RM, Valparaíso, Biobío y otras zonas.",
      },
      {
        title: "Experiencia consolidada",
        description:
          "Más de cuatro décadas operando en el sistema privado de salud chileno.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Plan accesible con cobertura base y red definida.",
      medio: "Balance entre precio y prestadores preferentes.",
      premium: "Máxima cobertura en red premium y libre elección.",
    },
  },
  consalud: {
    id: "consalud",
    name: "Consalud",
    badge: "ISAPRE ABIERTA · GRUPO ILC",
    tagline: "Camina Contigo y la mayor variedad de planes del mercado",
    heroDescription:
      "Respaldada por Inversiones La Construcción (ILC), Consalud destaca por su amplio catálogo, programas de acompañamiento en enfermedades graves y cobertura nacional.",
    officialWebsite: "https://www.consalud.cl",
    logoSrc: "/images/isapres/isapre-consalud.png",
    benefits: [
      "Programa Camina Contigo para enfermedades de alto costo",
      "Catálogo muy amplio de planes abiertos y preferentes",
      "Red de clínicas y centros médicos en todo Chile",
      "App móvil, telemedicina y gestión en línea",
    ],
    idealFor: [
      "Familias que quieren máxima flexibilidad al comparar",
      "Personas que valoran programas de acompañamiento clínico",
      "Afiliados que buscan alternativas económicas y también premium",
    ],
    highlights: [
      {
        title: "Líder en variedad",
        description:
          "Uno de los catálogos más extensos entre las Isapres abiertas del país.",
      },
      {
        title: "Respaldo corporativo",
        description:
          "Grupo ILC, con más de 40 años vinculados al sistema de salud privado.",
      },
      {
        title: "Cobertura nacional",
        description:
          "Prestadores en RM, zonas norte, centro, sur y principales capitales regionales.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Opción de entrada con cobertura esencial.",
      medio: "Plan intermedio con red preferente equilibrada.",
      premium: "Alta cobertura con acceso a prestadores top.",
    },
  },
  "cruz-blanca": {
    id: "cruz-blanca",
    name: "Cruz Blanca",
    badge: "ISAPRE ABIERTA · GRUPO BUPA",
    tagline: "Experiencia Bupa y red clínica de primer nivel",
    heroDescription:
      "Integrada al grupo internacional Bupa desde 2014, Cruz Blanca combina trayectoria local con estándares globales en salud prepaga, red clínica y servicios digitales.",
    officialWebsite: "https://www.cruzblanca.cl",
    logoSrc: "/images/isapres/isapre-cruz-blanca.jpeg",
    benefits: [
      "Respaldo internacional del grupo Bupa",
      "Red clínica con Clínica Bupa Santiago, Reñaca y Red Integramédica",
      "Programas de bienestar y medicina preventiva",
      "Atención presencial y canales digitales",
    ],
    idealFor: [
      "Familias que priorizan prestigio y estándares de calidad",
      "Afiliados que buscan red clínica integrada",
      "Personas que valoran continuidad asistencial en RM y regiones",
    ],
    highlights: [
      {
        title: "Estándar Bupa",
        description:
          "Modelo de gestión y calidad alineado a una de las aseguradoras de salud más grandes del mundo.",
      },
      {
        title: "Red propia e integrada",
        description:
          "Acceso a clínicas y centros médicos del ecosistema Bupa en Chile.",
      },
      {
        title: "Alta cobertura promedio",
        description:
          "Planes con porcentajes hospitalarios y ambulatorios competitivos en su segmento.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Plan base con red definida y prima accesible.",
      medio: "Cobertura intermedia con prestadores preferentes.",
      premium: "Plan superior con red clínica premium.",
    },
  },
  "vida-tres": {
    id: "vida-tres",
    name: "Vida Tres",
    badge: "ISAPRE ABIERTA · GRUPO BANMÉDICA",
    tagline: "Origen clínico y planes de alta cobertura",
    heroDescription:
      "Nacida desde clínicas de prestigio en Chile y parte del Grupo Banmédica, Vida Tres ofrece planes con foco en calidad asistencial y red de prestadores de alto nivel.",
    officialWebsite: "https://www.isaprevidatres.cl",
    logoSrc: "/images/isapres/isapre-vida-tres.png",
    benefits: [
      "Vinculación con Clínica Santa María y red Banmédica",
      "Planes preferentes con copagos diferenciados",
      "Atención en RM y cobertura en regiones",
      "Servicios digitales y gestión en línea",
    ],
    idealFor: [
      "Quienes priorizan clínicas de alta complejidad",
      "Familias que buscan planes preferentes consolidados",
      "Afiliados que comparan alternativas del grupo Banmédica",
    ],
    highlights: [
      {
        title: "ADN clínico",
        description:
          "Isapre originada desde prestadores de salud con fuerte presencia en RM.",
      },
      {
        title: "Planes preferentes",
        description:
          "Alternativas con red acotada y mejores condiciones de copago.",
      },
      {
        title: "Opciones premium",
        description:
          "Planes de alta cobertura para quienes buscan máxima protección.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Entrada accesible con red preferente básica.",
      medio: "Cobertura intermedia en clínicas en convenio.",
      premium: "Máxima protección hospitalaria y ambulatoria.",
    },
  },
  "nueva-masvida": {
    id: "nueva-masvida",
    name: "Nueva Masvida",
    badge: "ISAPRE ABIERTA · NEXUS CHILE HEALTH",
    tagline: "Cobertura nacional con enfoque en estabilidad y servicio",
    heroDescription:
      "Operando desde 2017 bajo Nexus Chile Health SpA, Nueva Masvida ofrece planes abiertos y preferentes con cobertura en Santiago y principales ciudades del país.",
    officialWebsite: "https://www.nuevamasvida.cl",
    logoSrc: "/images/isapres/isapre-nueva-masvida.png",
    benefits: [
      "Cobertura nacional con red de prestadores en múltiples regiones",
      "Líneas Pleno, Activo y Libre Elección",
      "Programas de salud preventiva",
      "Canales de autogestión y atención al cliente",
    ],
    idealFor: [
      "Familias que buscan alternativas fuera de las Isapres tradicionales",
      "Personas en regiones con red disponible",
      "Quienes valoran estabilidad en la oferta comercial",
    ],
    highlights: [
      {
        title: "Presencia nacional",
        description:
          "Planes con prestadores en RM, Valparaíso, Biobío y otras zonas.",
      },
      {
        title: "Líneas Pleno",
        description:
          "Productos estructurados para distintos niveles de protección.",
      },
      {
        title: "Alta cobertura hospitalaria",
        description:
          "Porcentajes promedio competitivos en el segmento hospitalario.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Plan Pleno de entrada con red preferente.",
      medio: "Cobertura intermedia para familias.",
      premium: "Libre elección con máxima flexibilidad.",
    },
  },
  esencial: {
    id: "esencial",
    name: "Esencial",
    badge: "ISAPRE ABIERTA · GRUPO ALEMANA",
    tagline: "Salud digital respaldada por Clínica Alemana",
    heroDescription:
      "Isapre Esencial, del Grupo Alemana, combina experiencia clínica de primer nivel con un modelo digital orientado a simplificar la contratación y gestión de tu plan de salud.",
    officialWebsite: "https://www.isapreesencial.cl",
    logoSrc: "/images/isapres/isapre-esencial.png",
    benefits: [
      "Respaldo del Grupo Alemana y Clínica Alemana",
      "Contratación y gestión con foco digital",
      "Red de prestadores de primer nivel",
      "Orientación a experiencia simple y transparente",
    ],
    idealFor: [
      "Profesionales que valoran marca clínica Alemana",
      "Personas que prefieren contratar y gestionar en línea",
      "Familias que buscan alternativas modernas en salud prepaga",
    ],
    highlights: [
      {
        title: "Grupo Alemana",
        description:
          "Experiencia clínica reconocida en Chile respaldando la operación.",
      },
      {
        title: "Modelo digital",
        description:
          "Procesos en línea pensados para cotizar y administrar tu plan.",
      },
      {
        title: "Red selecta",
        description:
          "Prestadores de calidad en Santiago y principales centros urbanos.",
      },
    ],
    featuredPlanDescriptions: {
      economico: "Plan de entrada con red preferente.",
      medio: "Cobertura intermedia con prestadores Alemana.",
      premium: "Máxima flexibilidad y cobertura superior.",
    },
  },
};

export const ISAPRE_PAGE_SLUGS = Object.keys(ISAPRE_PAGE_CONTENT);

export function getIsaprePageContent(slug: string): IsaprePageContent | null {
  return ISAPRE_PAGE_CONTENT[slug] ?? null;
}
