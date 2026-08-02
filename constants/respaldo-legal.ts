import {
  BadgeCheck,
  Gavel,
  Landmark,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";

/** Respaldo Legal: desktop landscape clip · mobile dedicated vertical clip. */
export const RESPALDO_LEGAL_HERO_VIDEOS = [
  "/videos/hero/hero-respaldo-legal.mp4",
] as const;
export const RESPALDO_LEGAL_HERO_VIDEOS_MOBILE = [
  "/videos/hero/hero-vertical-respaldo-legal.mp4",
] as const;
export const RESPALDO_LEGAL_HERO_POSTER =
  "/images/hero/posters/hero-respaldo-legal.jpg";
export const RESPALDO_LEGAL_HERO_POSTER_MOBILE =
  "/images/hero/posters/hero-vertical-respaldo-legal.jpg";

export const RESPALDO_LEGAL_HERO = {
  badge: "Exclusivo Isapres Premium",
  headingLead: "Tu respaldo legal sin costo.",
  headingAccent: "Garantizado.",
  description:
    "El único cotizador que te entrega un equipo legal especializado que te acompaña y defiende tus derechos ante tu Isapre.",
  highlightTitle: "Incluido sin costo en tu plan",
  highlightSubtitle: "Exclusivo para nuestros afiliados.",
  cardTitle: "Te representamos siempre que lo necesites",
  cardDescription:
    "Si tu Isapre incumple lo acordado en tu contrato, nosotros actuamos por ti, sin que tengas que pagar un peso adicional.",
} as const;

export type RespaldoLegalService = {
  title: string;
  description: string;
  whenToUse: string;
  icon: LucideIcon;
};

export const RESPALDO_LEGAL_SERVICES: RespaldoLegalService[] = [
  {
    title: "Reclamo Directo",
    description:
      "Redactamos y gestionamos el reclamo formal ante tu Isapre, exigiendo respuesta y cumplimiento dentro de los plazos que establece la ley.",
    whenToUse: "Cuando tu Isapre no responde o se demora en resolver tu caso.",
    icon: MessageSquareWarning,
  },
  {
    title: "Intervención Regulatoria",
    description:
      "Si la Isapre insiste en incumplir, presentamos tu caso ante la Superintendencia de Salud y exigimos una resolución a tu favor.",
    whenToUse: "Cuando el reclamo directo no obtiene una respuesta satisfactoria.",
    icon: Landmark,
  },
  {
    title: "Defensa Judicial",
    description:
      "Protegemos tus derechos con recursos de protección o acciones civiles cuando la vía administrativa no es suficiente.",
    whenToUse: "Casos de incumplimiento grave o reiterado por parte de la Isapre.",
    icon: Gavel,
  },
  {
    title: "Exclusivo Premium",
    description:
      "Todo el respaldo legal está incluido en tu asesoría con Isapres Premium, sin honorarios ni comisiones ocultas.",
    whenToUse: "Disponible para todos nuestros afiliados, desde el primer día.",
    icon: BadgeCheck,
  },
];

export const RESPALDO_LEGAL_PROCESS = {
  eyebrow: "Cómo funciona",
  heading: "Tu respaldo legal en 4 pasos",
  steps: [
    {
      title: "Nos cuentas tu caso",
      description:
        "Nos escribes por WhatsApp o correo y nos explicas qué está pasando con tu Isapre.",
    },
    {
      title: "Revisamos tu situación",
      description:
        "Nuestro equipo legal analiza tu contrato, los plazos vigentes y la respuesta (o silencio) de tu Isapre.",
    },
    {
      title: "Presentamos el reclamo formal",
      description:
        "Redactamos y enviamos el reclamo directo a tu Isapre, exigiendo una respuesta dentro de plazo.",
    },
    {
      title: "Escalamos si es necesario",
      description:
        "Si la Isapre no responde, llevamos tu caso a la Superintendencia de Salud o a tribunales.",
    },
  ],
} as const;

export const RESPALDO_LEGAL_CTA = {
  eyebrow: "Protégete hoy",
  heading: "Protégete con respaldo legal incluido",
  description:
    "No enfrentes solo a tu Isapre. Cuéntanos tu caso y activa tu respaldo legal sin costo.",
  whatsappMessage:
    "Hola, mi Isapre no está cumpliendo y necesito el respaldo legal de Isapres Premium.",
} as const;
