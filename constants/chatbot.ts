import {
  Bot,
  Crosshair,
  Headphones,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { siteConfig } from "@/constants/site";

export const CHATBOT_ROBOT_IMAGE = "/images/chatbot-robot.png";
export const CHATBOT_SHADOW_IMAGE = "/images/chatbot-shadow.png";

export const CHATBOT_WHATSAPP_MESSAGE =
  "Hola, quiero cotizar un plan de Isapre";

export const CHATBOT_CTA_HREF = siteConfig.cotizadorUrl;

export const CHATBOT_SECTION = {
  badge: "Tecnología que te beneficia",
  heading: "Encuentra tu mejor plan de Isapre",
  headingAccent: "en segundos con IA",
  ctaLabel: "Cotizar ahora con IA",
  socialProof:
    "Más de 7.000 personas ya eligieron con nosotros",
  ratingLabel: "4,9/5 en Google Reviews",
  ratingScore: 4.9,
} as const;

export type ChatbotHighlight = {
  label: string;
  icon: LucideIcon;
};

export const CHATBOT_HIGHLIGHTS: ChatbotHighlight[] = [
  { label: "+3.000 planes analizados", icon: Zap },
  { label: "Resultado en segundos", icon: Crosshair },
  { label: "Ejecutivos disponibles", icon: UserRound },
];

export const CHATBOT_PERKS = [
  "Gratis",
  "En segundos",
  "Sin compromiso",
] as const;

export type ChatbotProcessStep = {
  label: string;
  icon: LucideIcon;
};

export const CHATBOT_PROCESS_STEPS: ChatbotProcessStep[] = [
  { label: "Analizando +3.000 planes", icon: Search },
  { label: "Comparando coberturas", icon: ShieldCheck },
  { label: "Buscando las mejores opciones", icon: Sparkles },
];

export type ChatbotMessage = {
  role: "bot" | "user";
  text: string;
};

export const CHATBOT_CHAT_PREVIEW = {
  title: "Cotizador Inteligente",
  messages: [
    { role: "bot", text: "¿Qué clínica prefieres?" },
    { role: "user", text: "Clínica Dávila" },
    { role: "bot", text: "¿Qué es lo más importante para ti?" },
    { role: "user", text: "Bajar costo" },
  ] as ChatbotMessage[],
};

export const CHATBOT_RESULT_PREVIEW = {
  label: "Alternativas encontradas:",
  value: "12 opciones",
  cta: "Ver resultados",
};

export type ChatbotPillar = {
  title: string;
  icon: LucideIcon;
};

export const CHATBOT_PILLARS: ChatbotPillar[] = [
  { title: "IA que compara", icon: Bot },
  { title: "Personas que asesoran", icon: Headphones },
  { title: "Respaldo que te protege", icon: ShieldCheck },
];
