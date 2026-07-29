"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  RESPALDO_LEGAL_SERVICES,
  type RespaldoLegalService,
} from "@/constants/respaldo-legal";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function ServiceCard({
  service,
  reducedMotion,
}: {
  service: RespaldoLegalService;
  reducedMotion: boolean;
}) {
  const Icon = service.icon;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion
          ? undefined
          : { y: -6, boxShadow: "0 20px 40px rgba(10, 107, 94, 0.12)" }
      }
      className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm transition-colors hover:border-brand-green/25 sm:rounded-3xl sm:p-7"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-teal-dark sm:h-14 sm:w-14">
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <h3 className="mt-5 text-h3 font-heading font-bold tracking-tight text-zinc-900">
        {service.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
        {service.description}
      </p>

      <p className="mt-4 border-t border-zinc-100 pt-4 text-xs font-semibold uppercase tracking-wide text-brand-green">
        Cuándo aplica
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
        {service.whenToUse}
      </p>
    </motion.article>
  );
}

export function RespaldoLegalServicesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-zinc-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="respaldo-legal-services-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-eyebrow font-semibold uppercase tracking-widest text-zinc-500">
            Qué incluye
          </p>
          <h2
            id="respaldo-legal-services-heading"
            className="mt-3 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-900"
          >
            Cuatro frentes de defensa para tu plan de salud
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? false : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
        >
          {RESPALDO_LEGAL_SERVICES.map((service) => (
            <ServiceCard
              key={service.title}
              service={service}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
