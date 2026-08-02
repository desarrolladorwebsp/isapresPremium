import type { PublicPlanReview } from "@/types/plan-review";

/** Reseñas de respaldo cuando aún no hay registros publicados en plan_reviews. */
export const LANDING_FALLBACK_REVIEWS: PublicPlanReview[] = [
  {
    id: "fallback-1",
    authorName: "María González",
    authorAvatarUrl: null,
    executiveRating: 5,
    comment:
      "El ejecutivo me explicó cada cobertura con paciencia y me ayudó a elegir el plan ideal para mi familia. Respuesta rápida por WhatsApp en todo momento.",
    planCode: "fallback",
    planName: "Plan familiar Consalud",
    isapreName: "Consalud",
    createdAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "fallback-2",
    authorName: "Carlos Muñoz",
    authorAvatarUrl: null,
    executiveRating: 5,
    comment:
      "Proceso muy claro de principio a fin. Comparé opciones en minutos y el ejecutivo resolvió todas mis dudas sobre prestadores y copagos.",
    planCode: "fallback",
    planName: "Plan preferente Cruz Blanca",
    isapreName: "Cruz Blanca",
    createdAt: "2026-02-03T12:00:00.000Z",
  },
  {
    id: "fallback-3",
    authorName: "Ana Torres",
    authorAvatarUrl: null,
    executiveRating: 4,
    comment:
      "Excelente acompañamiento al cotizar. Me orientaron sobre el plan más conveniente según mi edad y cargas, sin presión comercial.",
    planCode: "fallback",
    planName: "Plan Colmena Oro",
    isapreName: "Colmena",
    createdAt: "2026-02-20T12:00:00.000Z",
  },
  {
    id: "fallback-4",
    authorName: "Felipe Rojas",
    authorAvatarUrl: null,
    executiveRating: 5,
    comment:
      "La atención fue personalizada y profesional. Recibí el PDF del plan y un resumen comparativo que me facilitó tomar la decisión.",
    planCode: "fallback",
    planName: "Plan Banmédica Integra",
    isapreName: "Banmédica",
    createdAt: "2026-03-08T12:00:00.000Z",
  },
  {
    id: "fallback-5",
    authorName: "Camila Soto",
    authorAvatarUrl: null,
    executiveRating: 5,
    comment:
      "Muy buena experiencia digital. El cotizador es rápido y el ejecutivo hizo seguimiento hasta cerrar mi contrato con la isapre.",
    planCode: "fallback",
    planName: "Plan Vida Tres Salud",
    isapreName: "Vida Tres",
    createdAt: "2026-04-01T12:00:00.000Z",
  },
  {
    id: "fallback-6",
    authorName: "Jorge Pérez",
    authorAvatarUrl: null,
    executiveRating: 4,
    comment:
      "Me gustó la transparencia en precios y coberturas. El ejecutivo fue amable y siempre disponible para resolver consultas puntuales.",
    planCode: "fallback",
    planName: "Plan Nueva Masvida",
    isapreName: "Nueva Masvida",
    createdAt: "2026-04-18T12:00:00.000Z",
  },
];
