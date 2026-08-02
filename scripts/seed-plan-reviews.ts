import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

const REVIEWS = [
  {
    authorName: "María González",
    executiveRating: 5,
    comment:
      "El ejecutivo me explicó cada cobertura con paciencia y me ayudó a elegir el plan ideal para mi familia. Respuesta rápida por WhatsApp en todo momento.",
    featured: true,
    displayOrder: 0,
  },
  {
    authorName: "Carlos Muñoz",
    executiveRating: 5,
    comment:
      "Proceso muy claro de principio a fin. Comparé opciones en minutos y el ejecutivo resolvió todas mis dudas sobre prestadores y copagos.",
    featured: true,
    displayOrder: 1,
  },
  {
    authorName: "Ana Torres",
    executiveRating: 4,
    comment:
      "Excelente acompañamiento al cotizar. Me orientaron sobre el plan más conveniente según mi edad y cargas, sin presión comercial.",
    featured: false,
    displayOrder: 2,
  },
  {
    authorName: "Felipe Rojas",
    executiveRating: 5,
    comment:
      "La atención fue personalizada y profesional. Recibí el PDF del plan y un resumen comparativo que me facilitó tomar la decisión.",
    featured: false,
    displayOrder: 3,
  },
  {
    authorName: "Camila Soto",
    executiveRating: 5,
    comment:
      "Muy buena experiencia digital. El cotizador es rápido y el ejecutivo hizo seguimiento hasta cerrar mi contrato con la isapre.",
    featured: false,
    displayOrder: 4,
  },
  {
    authorName: "Jorge Pérez",
    executiveRating: 4,
    comment:
      "Me gustó la transparencia en precios y coberturas. El ejecutivo fue amable y siempre disponible para resolver consultas puntuales.",
    featured: false,
    displayOrder: 5,
  },
] as const;

async function main() {
  const plans = await prisma.plan.findMany({
    take: REVIEWS.length,
    orderBy: { planName: "asc" },
    select: { uniqueCode: true, planName: true },
  });

  if (plans.length === 0) {
    throw new Error("No hay planes en la base de datos. Ejecuta el seed principal primero.");
  }

  await prisma.planReview.deleteMany({});

  for (const [index, review] of REVIEWS.entries()) {
    const plan = plans[index % plans.length];
    await prisma.planReview.create({
      data: {
        authorName: review.authorName,
        executiveRating: review.executiveRating,
        comment: review.comment,
        featured: review.featured,
        displayOrder: review.displayOrder,
        published: true,
        planCode: plan.uniqueCode,
      },
    });
  }

  console.log(`Seed plan_reviews completado: ${REVIEWS.length} reseñas publicadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
