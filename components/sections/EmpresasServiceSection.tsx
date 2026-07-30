"use client";

import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Star,
  Tag,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  EMPRESAS_SERVICE,
  EMPRESAS_SERVICE_CARDS,
  EMPRESAS_SERVICE_CTA,
  EMPRESAS_SERVICE_TRUST,
  type EmpresasServiceCard,
} from "@/constants/empresas";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function ServiceCard({
  card,
  reducedMotion,
}: {
  card: EmpresasServiceCard;
  reducedMotion: boolean;
}) {
  const Icon = card.icon;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion
          ? undefined
          : { y: -6, boxShadow: "0 20px 40px rgba(10, 107, 94, 0.12)" }
      }
      className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:rounded-3xl ${
        card.highlighted
          ? "ring-2 ring-brand-teal"
          : "ring-1 ring-zinc-100"
      }`}
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-zinc-100">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 360px"
        />

        {card.badge ? (
          <span className="absolute right-0 top-3 inline-flex items-center gap-1.5 rounded-l-md bg-brand-teal px-2.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-sm sm:top-4 sm:px-3 sm:text-xs">
            <Star className="h-3 w-3 fill-white" aria-hidden="true" />
            {card.badge}
          </span>
        ) : null}

        <span className="absolute -bottom-5 left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-100 bg-white text-brand-teal shadow-md sm:left-5 sm:h-12 sm:w-12">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6 pt-8 sm:px-6 sm:pb-7 sm:pt-9">
        <h3 className="text-lg font-heading font-bold tracking-tight text-zinc-900 sm:text-xl">
          {card.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-[0.9375rem]">
          {card.description}
        </p>
      </div>
    </motion.article>
  );
}

export function EmpresasServiceSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="empresas-service-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-eyebrow font-bold uppercase tracking-widest text-brand-teal">
            {EMPRESAS_SERVICE.eyebrow}
          </p>

          <h2
            id="empresas-service-heading"
            className="mt-3 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-900"
          >
            {EMPRESAS_SERVICE.headingBefore}{" "}
            <span className="text-brand-teal">{EMPRESAS_SERVICE.headingBrand}</span>{" "}
            {EMPRESAS_SERVICE.headingAfter}
          </h2>

          <p className="mt-4 text-body-lg text-zinc-500">
            {EMPRESAS_SERVICE.description}
          </p>

          <p className="mx-auto mt-4 flex max-w-2xl items-start justify-center gap-2.5 text-sm leading-relaxed text-zinc-600 sm:items-center sm:text-[0.9375rem]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white sm:mt-0">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-left sm:text-center">
              {EMPRESAS_SERVICE.highlightPrefix}{" "}
              <strong className="font-semibold text-brand-teal">
                {EMPRESAS_SERVICE.highlightEmphasis}
              </strong>
            </span>
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? false : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-6 lg:gap-7"
        >
          {EMPRESAS_SERVICE_CARDS.map((card) => (
            <ServiceCard
              key={card.title}
              card={card}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
          className="mt-10 flex flex-col items-center sm:mt-12"
        >
          <motion.a
            href={EMPRESAS_SERVICE_CTA.href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2 }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            className="inline-flex min-h-12 w-full max-w-md items-center justify-center gap-3 rounded-xl bg-brand-teal px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-teal/25 transition-colors hover:bg-brand-teal-dark hover:shadow-xl sm:w-auto sm:min-w-[22rem] sm:px-8 sm:text-base"
          >
            <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
            {EMPRESAS_SERVICE_CTA.label}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </motion.a>

          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Tag className="h-3.5 w-3.5 text-brand-teal" aria-hidden="true" />
            {EMPRESAS_SERVICE_CTA.note}
          </p>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
          className="mt-10 rounded-2xl border border-zinc-200 bg-white px-5 py-5 shadow-sm sm:mt-12 sm:rounded-3xl sm:px-6 sm:py-6"
        >
          <ul className="grid gap-5 sm:grid-cols-3 sm:gap-6 lg:gap-8">
            {EMPRESAS_SERVICE_TRUST.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 sm:items-center"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-teal">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-snug text-zinc-500 sm:text-[0.9375rem]">
                    <strong className="font-semibold text-brand-teal">
                      {item.title}
                    </strong>{" "}
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
