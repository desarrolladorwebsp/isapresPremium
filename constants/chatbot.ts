import { Building2, Handshake, Target, Zap, type LucideIcon } from "lucide-react";

export type ChatbotFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const CHATBOT_FEATURES: ChatbotFeature[] = [
  {
    title: "Rapidez única",
    description: "Comparaciones en segundos.",
    icon: Zap,
  },
  {
    title: "Precisión",
    description: "Resultados alineados a tus necesidades reales.",
    icon: Target,
  },
  {
    title: "Personalización",
    description: "Presupuesto, clínicas y coberturas a tu medida.",
    icon: Building2,
  },
  {
    title: "Complemento humano",
    description:
      "Si quieres avanzar, un ejecutivo acreditado continúa el proceso.",
    icon: Handshake,
  },
];

export const CHATBOT_ROBOT_IMAGE = "/images/chatbot-robot.png";
export const CHATBOT_SHADOW_IMAGE = "/images/chatbot-shadow.png";

export const CHATBOT_WHATSAPP_MESSAGE =
  "Hola, quiero cotizar un plan de Isapre";
