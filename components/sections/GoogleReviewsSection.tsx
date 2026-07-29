"use client";

import { BadgeCheck, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GoogleIcon, GoogleWordmark } from "@/components/ui/GoogleIcon";
import {
  GOOGLE_RATING_SUMMARY,
  GOOGLE_REVIEWS,
  type GoogleReview,
} from "@/constants/reviews";
import { siteConfig } from "@/constants/site";

function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${size} ${
            index < rating ? "fill-[#FBBC05] text-[#FBBC05]" : "fill-zinc-200 text-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  reducedMotion,
  delay,
}: {
  review: GoogleReview;
  reducedMotion: boolean;
  delay: number;
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      whileHover={reducedMotion ? undefined : { y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.10)" }}
      className="flex h-full min-w-[260px] shrink-0 snap-start flex-col rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:min-w-0 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${review.avatarClassName}`}
          aria-hidden="true"
        >
          {review.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-zinc-900">
              {review.author}
            </p>
            <BadgeCheck className="h-4 w-4 shrink-0 text-[#4285F4]" aria-label="Reseña verificada" />
          </div>
          <p className="text-xs text-zinc-500">{review.date}</p>
        </div>
        <GoogleIcon className="h-5 w-5 shrink-0" />
      </div>

      <div className="mt-3">
        <StarRow rating={review.rating} />
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600">
        {review.text}
      </p>

      <a
        href={siteConfig.social.googleReviews}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-fit text-sm font-semibold text-brand-teal transition-colors hover:text-brand-teal-dark hover:underline"
      >
        Leer más
      </a>
    </motion.article>
  );
}

export function GoogleReviewsSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-zinc-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="reviews-heading"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2
            id="reviews-heading"
            className="text-h2 text-balance font-heading font-bold tracking-tight text-brand-teal-dark"
          >
            Lo que dicen nuestros clientes
          </h2>
          <p className="mt-3 text-body-lg leading-relaxed text-zinc-600">
            La confianza de quienes ya mejoraron su plan con nosotros, verificada
            directamente en Google.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start lg:gap-10">
          <motion.a
            href={siteConfig.social.googleReviews}
            target="_blank"
            rel="noopener noreferrer"
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={reducedMotion ? undefined : { scale: 1.02 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md lg:sticky lg:top-24 lg:items-start lg:text-left"
          >
            <span className="text-eyebrow font-bold uppercase tracking-wide text-zinc-900">
              {GOOGLE_RATING_SUMMARY.label}
            </span>
            <StarRow rating={GOOGLE_RATING_SUMMARY.score} size="h-5 w-5" />
            <p className="text-sm text-zinc-500">
              A base de{" "}
              <span className="font-semibold text-zinc-900">
                {GOOGLE_RATING_SUMMARY.reviewCount}
              </span>{" "}
              reseñas
            </p>
            <GoogleWordmark className="text-xl" />
          </motion.a>

          <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
            {GOOGLE_REVIEWS.map((review, index) => (
              <ReviewCard
                key={review.id}
                review={review}
                reducedMotion={!!reducedMotion}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
