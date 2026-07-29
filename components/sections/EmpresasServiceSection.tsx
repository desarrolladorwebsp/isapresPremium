"use client";

import {
  ArrowUpRight,
  Building2,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  EMPRESAS_SERVICE,
  EMPRESAS_SERVICE_CARDS,
} from "@/constants/empresas";

const CARD_ICONS: LucideIcon[] = [Users, Building2, Clock];

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
  title,
  highlighted,
  icon: Icon,
  reducedMotion,
}: {
  title: string;
  highlighted: boolean;
  icon: LucideIcon;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion || highlighted
          ? undefined
          : { y: -4, boxShadow: "0 16px 32px rgba(0, 0, 0, 0.08)" }
      }
      className={`relative flex aspect-[4/5] min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl px-6 py-8 sm:min-h-[260px] sm:rounded-3xl sm:px-8 ${
        highlighted
          ? "bg-gradient-to-r from-brand-teal via-brand-teal to-brand-green text-white shadow-lg"
          : "border border-zinc-200 bg-white text-zinc-900 shadow-sm"
      }`}
    >
      {highlighted && (
        <ArrowUpRight
          className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-white/15 sm:h-36 sm:w-36"
          strokeWidth={1.25}
          aria-hidden="true"
        />
      )}

      <Icon
        className={`mb-6 h-10 w-10 sm:h-12 sm:w-12 ${
          highlighted ? "text-white" : "text-zinc-400"
        }`}
        strokeWidth={1.5}
        aria-hidden="true"
      />

      <h3
        className={`max-w-[12rem] text-center text-h3 font-heading font-bold leading-snug tracking-tight ${
          highlighted ? "text-white" : "text-zinc-900"
        }`}
      >
        {title}
      </h3>
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
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-eyebrow font-semibold uppercase tracking-widest text-zinc-500">
            {EMPRESAS_SERVICE.eyebrow}
          </p>
          <h2
            id="empresas-service-heading"
            className="mt-3 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-900"
          >
            {EMPRESAS_SERVICE.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-zinc-500">
            {EMPRESAS_SERVICE.description}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? false : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-6 lg:gap-8"
        >
          {EMPRESAS_SERVICE_CARDS.map((card, index) => (
            <ServiceCard
              key={card.title}
              title={card.title}
              highlighted={card.highlighted}
              icon={CARD_ICONS[index]}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
