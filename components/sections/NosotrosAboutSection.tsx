"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { NOSOTROS_ABOUT } from "@/constants/nosotros";

function renderParagraph(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-zinc-800">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

export function NosotrosAboutSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-zinc-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="nosotros-about-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -32 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="flex items-center gap-3 text-eyebrow font-semibold uppercase tracking-widest text-brand-green">
            <span
              className="h-px w-8 bg-brand-green sm:w-10"
              aria-hidden="true"
            />
            {NOSOTROS_ABOUT.eyebrow}
          </p>

          <h2
            id="nosotros-about-heading"
            className="mt-4 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-800"
          >
            {NOSOTROS_ABOUT.heading}
          </h2>

          <div className="mt-6 space-y-5">
            {NOSOTROS_ABOUT.paragraphs.map((paragraph, index) => (
              <motion.p
                key={index}
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.45,
                  ease: "easeOut",
                  delay: 0.1 + index * 0.12,
                }}
                className={`text-body-lg leading-relaxed ${
                  paragraph.muted ? "text-zinc-500" : "text-zinc-700"
                }`}
              >
                {renderParagraph(paragraph.text)}
              </motion.p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: 32 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
        >
          <motion.div
            whileHover={
              reducedMotion ? undefined : { scale: 1.02, rotate: 0.5 }
            }
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative overflow-hidden rounded-2xl shadow-xl sm:rounded-3xl"
          >
            <Image
              src={NOSOTROS_ABOUT.image}
              alt={NOSOTROS_ABOUT.imageAlt}
              width={640}
              height={480}
              className="aspect-[4/3] w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"
              aria-hidden="true"
            />
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
            className="absolute bottom-0 left-0 h-16 w-16 rounded-tr-2xl border-t-4 border-r-4 border-white bg-brand-green/10 sm:-bottom-5 sm:-left-5 sm:h-24 sm:w-24 sm:rounded-2xl sm:border-4"
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </section>
  );
}
