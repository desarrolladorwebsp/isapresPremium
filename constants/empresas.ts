import {
  ClipboardList,
  Clock,
  Scale,
  ShieldCheck,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getWhatsAppUrl } from "@/constants/site";

/** Empresas: desktop landscape clip · mobile dedicated vertical clip. */
export const EMPRESAS_HERO_VIDEOS = [
  "/videos/hero/hero-empresas.mp4",
] as const;
export const EMPRESAS_HERO_VIDEOS_MOBILE = [
  "/videos/hero/hero-vertical-empresa.mp4",
] as const;

export const EMPRESAS_TYPEWRITER_PHRASES = [
  "transparencia",
  "seguridad",
] as const;

export const EMPRESAS_WHATSAPP_MESSAGE =
  "Hola, me interesa la asesoría empresarial de Isapres Premium.";

export const EMPRESAS_JORNADA_WHATSAPP_MESSAGE =
  "Hola, quiero solicitar una jornada de asesoría de Isapres Premium en mi empresa.";

export const EMPRESAS_SERVICE = {
  eyebrow: "Servicio Empresas",
  headingBefore: "Llevamos",
  headingBrand: "Isapres Premium",
  headingAfter: "a tu empresa",
  description: "Asesoramos a tus trabajadores directamente en tu empresa.",
  highlightPrefix:
    "Comparamos su plan actual con distintas Isapres, de forma independiente y",
  highlightEmphasis: "sin costo para tu organización.",
} as const;

export type EmpresasServiceCard = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  highlighted: boolean;
  badge?: string;
};

export const EMPRESAS_SERVICE_CARDS: EmpresasServiceCard[] = [
  {
    title: "Para tus trabajadores",
    description:
      "Asesoría personalizada y comparación de alternativas que realmente les convienen.",
    image: "/images/empresas/service-hd-trabajadores.jpg",
    imageAlt:
      "Familia beneficiada con la asesoría de Isapres Premium para trabajadores",
    icon: Users,
    highlighted: false,
  },
  {
    title: "Para tu empresa",
    description:
      "Coordinamos una jornada de asesoría directamente en tus instalaciones, sin costo para tu organización.",
    image: "/images/empresas/service-hd-empresa.jpg",
    imageAlt:
      "Equipo de Isapres Premium durante una jornada de asesoría empresarial",
    icon: ClipboardList,
    highlighted: true,
    badge: "Beneficio empresa",
  },
  {
    title: "Sin pérdida de tiempo",
    description:
      "Nosotros organizamos y realizamos todo el proceso. Tú y tu equipo se enfocan en lo importante.",
    image: "/images/empresas/service-hd-tiempo.jpg",
    imageAlt:
      "Asesores de Isapres Premium que gestionan el proceso por ti",
    icon: Clock,
    highlighted: false,
  },
];

export const EMPRESAS_SERVICE_CTA = {
  label: "Solicitar jornada en mi empresa",
  note: "Sin costo para la empresa.",
  href: getWhatsAppUrl(EMPRESAS_JORNADA_WHATSAPP_MESSAGE),
} as const;

export type EmpresasServiceTrustItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const EMPRESAS_SERVICE_TRUST: EmpresasServiceTrustItem[] = [
  {
    title: "+7.000 familias",
    description: "asesoradas y acompañadas",
    icon: ShieldCheck,
  },
  {
    title: "Área legal incluida",
    description: "sin costo para tus trabajadores",
    icon: Scale,
  },
  {
    title: "Asesoría independiente",
    description: "no estamos ligados a una Isapre",
    icon: Star,
  },
];

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
