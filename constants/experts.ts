import {
  Clock3,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CHATBOT_WHATSAPP_MESSAGE } from "@/constants/chatbot";
import { getWhatsAppUrl, siteConfig } from "@/constants/site";

export const EXPERTS_IMAGE = "/images/experts-team.png";

export const EXPERTS_CONTACT = {
  badgeTitle: "Equipo Isapres Premium",
  badgeSubtitle: "Personas reales, asesoría personalizada.",
  headingLead: "¿Prefieres hablar directamente",
  headingAccent: "con un experto?",
  description:
    "Conversa con nuestro equipo y revisa tus opciones de forma personalizada.",
  trustNote: "Tu información está segura con nosotros.",
} as const;

export type ExpertContactAction = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  variant: "primary" | "mint" | "outline";
  icon: "video" | "chat" | "mail";
};

export const EXPERTS_CONTACT_ACTIONS: ExpertContactAction[] = [
  {
    title: "Agendar videollamada",
    description: "Atención personalizada por Zoom",
    href: siteConfig.calendly.meetingUrl,
    external: true,
    variant: "primary",
    icon: "video",
  },
  {
    title: "Hablar con nuestro asistente",
    description: "Resuelve tus dudas al instante",
    href: getWhatsAppUrl(CHATBOT_WHATSAPP_MESSAGE),
    external: true,
    variant: "mint",
    icon: "chat",
  },
  {
    title: "Prefiero contacto por correo",
    description: "Te responderemos a la brevedad",
    href: `mailto:${siteConfig.contact.email}`,
    variant: "outline",
    icon: "mail",
  },
];

export type ExpertTrustItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const EXPERTS_TRUST_ITEMS: ExpertTrustItem[] = [
  {
    title: "Asesoría personalizada",
    description: "Expertos en isapres a tu disposición.",
    icon: UserRound,
  },
  {
    title: "Respuesta rápida",
    description: "Te contactamos en el menor tiempo.",
    icon: Clock3,
  },
  {
    title: "Atención sin costo",
    description: "Nuestro servicio es 100% gratuito.",
    icon: ShieldCheck,
  },
  {
    title: "+7.000 personas",
    description: "Ya confiaron en Isapres Premium.",
    icon: Users,
  },
];
