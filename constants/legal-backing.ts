import {
  BadgeCheck,
  Gavel,
  Landmark,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";

export type LegalFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const LEGAL_FEATURES: LegalFeature[] = [
  {
    title: "Reclamo Directo",
    description:
      "Gestionamos por ti el reclamo formal ante la Isapre y exigimos su cumplimiento inmediato.",
    icon: MessageSquareWarning,
  },
  {
    title: "Intervención Regulatoria",
    description:
      "Si la Isapre insiste en incumplir, presentamos tu caso ante la Superintendencia de Salud.",
    icon: Landmark,
  },
  {
    title: "Defensa Judicial",
    description:
      "Protegemos tus derechos con recursos de protección o acciones civiles cuando la Isapre no cumple.",
    icon: Gavel,
  },
  {
    title: "Exclusivo Premium",
    description:
      "Todo el respaldo legal está incluido sin costo adicional para nuestros afiliados Premium.",
    icon: BadgeCheck,
  },
];

export const LEGAL_BACKING = {
  badge: "Exclusivo Isapres Premium",
  headingLead: "Tu respaldo legal",
  headingAccent: "sin costo.",
  description:
    "Con Isapres Premium no estás solo frente a tu Isapre. Te entregamos un equipo legal especializado que te acompaña desde el primer reclamo hasta acciones judiciales si es necesario —todo incluido en tu plan.",
  highlightTitle: "Incluido sin costo en tu plan",
  highlightSubtitle: "Desde el reclamo hasta la defensa judicial.",
} as const;

export const LEGAL_BACKDROP_IMAGE = "/images/legal-backdrop.jpg";
