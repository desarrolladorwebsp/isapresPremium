export interface HeroCarouselSlide {
  id: string;
  src: string;
  alt: string;
  label: string;
  description: string;
}

export const HERO_CAROUSEL_SLIDES: HeroCarouselSlide[] = [
  {
    id: "criterios",
    src: "/images/landing/hero/cotizador-criterios.png",
    alt: "Pantalla principal del cotizador con criterios de búsqueda",
    label: "Pantalla principal",
    description: "Ingresa región, ingreso y edad para comenzar tu cotización.",
  },
  {
    id: "resultados",
    src: "/images/landing/hero/cotizador-resultados.png",
    alt: "Resultados de la cotización con listado de planes Isapre",
    label: "Resultados de cotización",
    description: "Compara planes reales con precios, coberturas y prestadores.",
  },
  {
    id: "filtros",
    src: "/images/landing/hero/cotizador-filtros.png",
    alt: "Panel de filtros por precio, Isapre y cobertura",
    label: "Filtros avanzados",
    description: "Refina tu búsqueda por precio, Isapre, zonas y tipo de plan.",
  },
  {
    id: "plan-card",
    src: "/images/landing/hero/cotizador-plan-card.png",
    alt: "Detalle de un plan con coberturas hospitalaria y ambulatoria",
    label: "Detalle del plan",
    description: "Revisa coberturas, prestadores y solicita el plan que prefieras.",
  },
  {
    id: "solicitar",
    src: "/images/landing/hero/cotizador-solicitar.png",
    alt: "Formulario de solicitud con resumen del plan seleccionado",
    label: "Resumen de cotización",
    description: "Confirma tus datos y solicita el plan con asesoría personalizada.",
  },
];
