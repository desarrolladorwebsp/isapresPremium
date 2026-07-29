import { heroVideosStartingAt } from "@/constants/hero";

/** Empresas opens on hero-02. */
export const EMPRESAS_HERO_VIDEOS = heroVideosStartingAt(1);

export const EMPRESAS_TYPEWRITER_PHRASES = [
  "transparencia",
  "seguridad",
] as const;

export const EMPRESAS_WHATSAPP_MESSAGE =
  "Hola, me interesa la asesoría empresarial de Isapres Premium.";

export const EMPRESAS_SERVICE = {
  eyebrow: "Nuestro Servicio",
  heading:
    "Ser pro-cliente significa mostrar todas las alternativas disponibles.",
  description:
    "A diferencia de los agentes de una sola isapre, en Isapres Premium:",
} as const;

export const EMPRESAS_SERVICE_CARDS = [
  { title: "Para tus trabajadores", highlighted: false },
  { title: "Para tu empresa", highlighted: true },
  { title: "Sin pérdida de tiempo", highlighted: false },
] as const;

export type EmpresasNewsItem = {
  title: string;
  source: string;
  date: string;
  excerpt: string;
  href: string;
};

export const EMPRESAS_NEWS = {
  eyebrow: "Actualidad Isapre",
  heading: "El sistema de salud cambia. Tu empresa no debería quedarse atrás.",
  description:
    "Cambios en precios, beneficios y normativas que impactan directamente a tu equipo. Te ayudamos a convertir esta información en la mejor decisión para tu empresa.",
  ctaLabel: "Asesórate sin compromiso",
} as const;

export const EMPRESAS_NEWS_ITEMS: EmpresasNewsItem[] = [
  {
    title:
      "Así se aplicará el no cobro a las cargas menores de dos años en las isapres",
    source: "The Clinic",
    date: "6 enero 2024",
    excerpt:
      "La Superintendencia ordenó suspender cobros por cargas nonatas y menores de 2 años. Si tu empresa tiene colaboradores con hijos pequeños, este beneficio puede reducir el costo del plan — te ayudamos a identificar la isapre que más conviene para tu equipo.",
    href: "https://www.theclinic.cl/2024/01/06/isapres-cargas-menores-dos-anos-superintendencia-salud/",
  },
  {
    title:
      "Cinco isapres subirán sus precios hasta el máximo de 3,7% para este 2025",
    source: "BioBioChile",
    date: "17 marzo 2025",
    excerpt:
      "Colmena, Cruz Blanca, Banmédica, Esencial e Isalud aplicarán alzas de hasta 3,7%. Antes de que suba el plan de tu empresa, compara alternativas: un asesor independiente puede ayudarte a elegir mejor relación precio-cobertura.",
    href: "https://www.biobiochile.cl/noticias/economia/tu-bolsillo/2025/03/17/alzas-en-planes-de-salud-cinco-isapres-subiran-sus-precios-hasta-el-maximo-de-37-para-este-2025.shtml",
  },
  {
    title: "Analizaron ley que consagra el derecho al olvido oncológico",
    source: "Diario UACh",
    date: "17 mayo 2024",
    excerpt:
      "La Ley 21.656 protege a quienes superaron el cáncer de discriminación en seguros y créditos. Asegura que tu empresa ofrezca planes que cumplan la normativa y no dejen fuera a quienes más lo necesitan.",
    href: "https://diario.uach.cl/analizaron-ley-que-consagra-el-derecho-al-olvido-oncologico/",
  },
];
