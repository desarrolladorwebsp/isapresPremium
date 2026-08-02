"use client";

import { ArrowRight, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GOOGLE_REVIEWS } from "@/constants/reviews";
import { NOSOTROS_TESTIMONIALS } from "@/constants/nosotros";

function StarRow({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rating
              ? "fill-brand-green text-brand-green"
              : "fill-zinc-200 text-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

export function NosotrosTestimonialsSection() {
  const reducedMotion = useReducedMotion();
  const reviews = GOOGLE_REVIEWS.slice(0, 3);

  return (
    <section
      className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="nosotros-testimonials-heading"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2
            id="nosotros-testimonials-heading"
            className="font-heading text-h2 font-extrabold tracking-tight text-brand-teal-dark"
          >
            {NOSOTROS_TESTIMONIALS.title}
          </h2>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-brand-green text-brand-green"
                  />
                ))}
              </div>
              <span className="font-bold text-brand-teal-dark">
                {NOSOTROS_TESTIMONIALS.ratingLabel}
              </span>
            </div>
            <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
            <p>{NOSOTROS_TESTIMONIALS.socialProof}</p>
          </div>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3 lg:gap-6">
          {reviews.map((review, index) => (
            <motion.article
              key={review.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.45,
                ease: "easeOut",
                delay: index * 0.07,
              }}
              className="flex h-full flex-col rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${review.avatarClassName}`}
                  aria-hidden
                >
                  {review.initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {review.author}
                  </p>
                  <StarRow rating={review.rating} />
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-600">
                “{review.text}”
              </p>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href={NOSOTROS_TESTIMONIALS.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-teal/30 bg-white px-6 py-2.5 text-sm font-semibold text-brand-teal-dark transition-colors hover:border-brand-teal hover:bg-brand-teal/5"
          >
            {NOSOTROS_TESTIMONIALS.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
