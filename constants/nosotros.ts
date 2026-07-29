import { heroVideosStartingAt } from "@/constants/hero";

/** Nosotros opens on hero-04. */
export const NOSOTROS_HERO_VIDEOS = heroVideosStartingAt(2);

export const NOSOTROS_TYPEWRITER_PHRASES = [
  "empresas",
  "valores",
  "personas",
] as const;

export const NOSOTROS_HERO = {
  eyebrow: "Bienvenidos",
  heading: "Isapres Premium:",
} as const;

export const NOSOTROS_VALORES = {
  titleGreen: "Nuestros",
  titleDark: "Valores",
  description:
    "…marcan nuestro camino paso a paso buscando siempre lo mejor para ti y tu familia.",
} as const;

export type NosotrosValor = {
  title: string;
  description: string;
};

export const NOSOTROS_VALORES_ITEMS: NosotrosValor[] = [
  {
    title: "Pasión",
    description: "Energía que impulsa cada acción con entrega y entusiasmo.",
  },
  {
    title: "Excelencia",
    description: "Superar desafíos alcanzando calidad en todo momento.",
  },
  {
    title: "Integridad",
    description: "Actuar con honestidad, respeto y coherencia siempre.",
  },
];

export const NOSOTROS_ABOUT = {
  eyebrow: "Lo que hay que saber de",
  heading: "Sobre Nosotros",
  // TODO: reemplazar por fotografía real del evento/equipo.
  image: "/images/empresas/slide-1.jpg",
  imageAlt: "Equipo de Isapres Premium en un evento de asesoría",
  paragraphs: [
    {
      text: "En **Isapres Premium** creemos que el éxito se construye uniendo visión, estrategia y personas. Nuestro enfoque integra lo mejor de la planificación financiera con soluciones de gestión innovadoras que generan impacto real.",
      muted: false,
    },
    {
      text: "Cada proyecto es una oportunidad para crecer **junto a clientes, colaboradores y colaboradoras**, creando relaciones basadas en **confianza, integridad y excelencia**.",
      muted: true,
    },
  ],
} as const;

export const NOSOTROS_ADVISORY = {
  heading: "Ofrecemos Asesoría Empresarial",
  description:
    "Nuestra asesoría está diseñada para apoyar a colaboradoras y colaboradores, potenciando sus beneficios con orientación estratégica.",
  ctaLabel: "Agendar Reunión",
  backgroundImage: "/images/nosotros/handshake-bg.jpg",
  images: [
    {
      src: "/images/nosotros/advisory-event.jpg",
      alt: "Stand de Isapres Premium en un evento corporativo",
    },
    {
      src: "/images/nosotros/advisory-team.jpg",
      alt: "Equipo de Isapres Premium en oficina",
    },
  ],
} as const;
