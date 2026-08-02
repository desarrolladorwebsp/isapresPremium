import {
  Crosshair,
  Eye,
  Gavel,
  Headset,
  HeartHandshake,
  Scale,
  ShieldCheck,
  ThumbsUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getWhatsAppUrl, siteConfig } from "@/constants/site";

export const NOSOTROS_WHATSAPP_MESSAGE =
  "Hola, quiero conocer más sobre Isapres Premium y cotizar un plan.";

export const NOSOTROS_HERO = {
  eyebrow: "Nosotros",
  headingBefore: "Somos tu asesoría",
  headingAccent: "independiente",
  headingAfter: "en Isapre.",
  description:
    "Comparamos planes de todas las Isapres, te acompañamos en cada decisión y te damos respaldo legal sin costo. Transparencia real para ti y tu familia.",
  primaryCta: {
    label: "Cotizar mi plan ahora",
    href: siteConfig.cotizadorUrl,
  },
  secondaryCta: {
    label: "Hablar con un ejecutivo",
    href: getWhatsAppUrl(NOSOTROS_WHATSAPP_MESSAGE),
  },
  image: "/images/nosotros/nosotros.png",
  imageAlt: "Equipo de Isapres Premium listo para asesorarte",
  floatingCard: {
    value: "+2.500",
    label: "planes para elegir con información clara",
  },
} as const;

export const NOSOTROS_MISSION_VISION = {
  mission: {
    icon: Crosshair,
    titleBefore: "Nuestra",
    titleAccent: "misión",
    description:
      "Ayudar a personas y empresas a encontrar el plan de Isapre que mejor se adapte a su realidad, con comparación objetiva, asesoría humana y cero costo para el cliente.",
    linkLabel: "Comparar mi plan",
    href: siteConfig.cotizadorUrl,
  },
  vision: {
    icon: Eye,
    titleBefore: "Nuestra",
    titleAccent: "visión",
    description:
      "Ser la asesoría de Isapre de referencia en Chile: transparente, cercana y respaldada, donde cada familia y cada empresa decide con información clara y acompañamiento real.",
  },
} as const;

export type NosotrosDifferentiator = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
};

export const NOSOTROS_DIFFERENTIATORS = {
  titleBefore: "¿Por qué somos",
  titleAccent: "diferentes",
  titleAfter: "?",
  items: [
    {
      title: "Comparativo inteligente",
      description:
        "Analizamos tu plan actual frente a todas las Isapres para mostrarte coberturas, clínicas y precios con claridad, sin sesgos ni letra chica escondida.",
      image: "/images/nosotros/diff-comparativo.jpg",
      imageAlt: "Laptop con comparativo de planes de Isapre",
      icon: Scale,
    },
    {
      title: "Asesoría personalizada",
      description:
        "Un ejecutivo te acompaña de punta a punta: entiende tu caso, responde tus dudas y te guía hasta dejar el plan que realmente necesitas.",
      image: "/images/nosotros/diff-asesoria.jpg",
      imageAlt: "Ejecutiva de Isapres Premium asesorando a un cliente",
      icon: Headset,
    },
    {
      title: "Protección legal incluida",
      description:
        "Si eres afiliado Premium, cuentas con respaldo legal sin costo frente a reclamos, Superintendencia y defensa cuando tu Isapre no responde.",
      image: "/images/nosotros/diff-legal.jpg",
      imageAlt: "Respaldo legal para afiliados de Isapres Premium",
      icon: Gavel,
    },
  ] satisfies NosotrosDifferentiator[],
} as const;

export const NOSOTROS_TESTIMONIALS = {
  title: "Nuestros clientes nos recomiendan",
  ratingLabel: "4,9/5",
  socialProof: "Personas y empresas ya eligieron Isapres Premium",
  ctaLabel: "Ver más opiniones",
  href: siteConfig.social.googleReviews,
} as const;

export type NosotrosStat = {
  icon: LucideIcon;
  value: string;
  label: string;
};

export const NOSOTROS_STATS: NosotrosStat[] = [
  {
    icon: Users,
    value: "+2.500",
    label: "Planes para comparar",
  },
  {
    icon: ThumbsUp,
    value: "95%",
    label: "Clientes nos recomiendan",
  },
  {
    icon: Headset,
    value: "100%",
    label: "Asesoría personalizada",
  },
  {
    icon: HeartHandshake,
    value: "$0",
    label: "Costo para el cliente",
  },
];

export const NOSOTROS_CTA = {
  heading: "¿Listo para descubrir si puedes pagar menos por un mejor plan?",
  description:
    "Cotiza en minutos o habla con un ejecutivo. Te ayudamos a decidir con información clara, sin compromiso y sin costo.",
  image: "/images/nosotros/cta-plan.jpg",
  imageAlt: "Pareja revisando opciones de plan de Isapre en un computador",
  primaryCta: {
    label: "Cotizar mi plan ahora",
    href: siteConfig.cotizadorUrl,
  },
  secondaryCta: {
    label: "Hablar con un ejecutivo",
    href: getWhatsAppUrl(NOSOTROS_WHATSAPP_MESSAGE),
  },
} as const;

export const NOSOTROS_TRUST_BAR = [
  {
    icon: ShieldCheck,
    label: "Información 100% transparente",
  },
  {
    icon: Scale,
    label: "Comparativo entre todas las Isapres",
  },
  {
    icon: ShieldCheck,
    label: "Acompañamiento antes, durante y después",
  },
] as const;
