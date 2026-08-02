/** Imagen de respaldo / poster del Hero (si el video no carga o reduce motion). */
export const LANDING_FAMILY_HERO_IMAGE = "/images/landing/hero/familia-protegida.jpg";

/** Video principal del Hero (vertical 9:16). */
export const LANDING_FAMILY_HERO_VIDEO = "/videos/video-hero.mp4";

export const LANDING_FAMILY_HERO_ALT =
  "Familia relajada en casa, transmitiendo tranquilidad y protección de salud";

/** Fondos por sección (misma imagen base; reemplazar en public/images/landing/sections/). */
export const LANDING_SECTION_BACKGROUNDS = {
  widget: "/images/landing/sections/cotizador-asesoria.jpg",
  partners: "/images/landing/sections/red-asesoria.jpg",
  isapres: "/images/landing/sections/salud-clinica.jpg",
  reviews: "/images/landing/sections/testimonios-familia.jpg",
} as const;

/** Textos alternativos descriptivos para SEO y accesibilidad. */
export const LANDING_SECTION_BACKGROUND_ALTS = {
  widget:
    "Asesor de salud orientando a una familia durante una cotización de plan Isapre",
  partners: "Red de asesores de salud colaborando en equipo",
  isapres: "Profesional de la salud en un entorno clínico moderno",
  reviews: "Familia satisfecha tras cotizar su plan de salud Isapre",
} as const satisfies Record<keyof typeof LANDING_SECTION_BACKGROUNDS, string>;

/** Fallback si aún no existen archivos en sections/ (usa hero). */
export const LANDING_SECTION_BACKGROUND_FALLBACK = LANDING_FAMILY_HERO_IMAGE;
