export type GoogleReview = {
  id: string;
  author: string;
  initial: string;
  avatarClassName: string;
  date: string;
  rating: number;
  text: string;
};

export const GOOGLE_RATING_SUMMARY = {
  label: "Excelente",
  score: 5,
  reviewCount: 17,
} as const;

export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: "juan-olivares",
    author: "Juan Olivares",
    initial: "J",
    avatarClassName: "bg-violet-500",
    date: "10 Octubre 2025",
    rating: 5,
    text: "Excelente atención, muy profesionales en todos los datos otorgados entregando la confianza para seguir…",
  },
  {
    id: "sarai-belen-puig",
    author: "Sarai Belén Puig...",
    initial: "S",
    avatarClassName: "bg-zinc-400",
    date: "8 Octubre 2025",
    rating: 5,
    text: "Andrea Vidal, una experta en Isapres. Las recomiendo full, agradecido por las asesorías que le entregaron a mi…",
  },
  {
    id: "ferdy",
    author: "Ferdy",
    initial: "F",
    avatarClassName: "bg-rose-400",
    date: "8 Octubre 2025",
    rating: 5,
    text: "Buenísima asesoría. Se preocuparon de entender mi caso y te ponen en distintos escenarios para tomar la…",
  },
];
