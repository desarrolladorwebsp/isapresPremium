"use client";

import { ArrowUpRight, ExternalLink, Newspaper } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  EMPRESAS_NEWS,
  EMPRESAS_NEWS_ITEMS,
  EMPRESAS_WHATSAPP_MESSAGE,
  type EmpresasNewsItem,
} from "@/constants/empresas";
import { getWhatsAppUrl } from "@/constants/site";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
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

function NewsCard({
  item,
  reducedMotion,
}: {
  item: EmpresasNewsItem;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      variants={cardVariants}
      whileHover={
        reducedMotion
          ? undefined
          : { y: -4, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)" }
      }
      className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-teal/30 sm:rounded-3xl sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal">
          <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
          {item.source}
        </span>
        <time className="shrink-0 text-xs text-zinc-400">{item.date}</time>
      </div>

      <h3 className="mt-4 text-h3 font-heading font-bold leading-snug tracking-tight text-zinc-900">
        {item.title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
        {item.excerpt}
      </p>

      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand-teal transition-colors hover:text-brand-teal-dark"
      >
        Leer noticia
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </motion.article>
  );
}

export function EmpresasNewsSection() {
  const reducedMotion = useReducedMotion();
  const whatsappUrl = getWhatsAppUrl(EMPRESAS_WHATSAPP_MESSAGE);

  return (
    <section
      className="bg-zinc-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="empresas-news-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-eyebrow font-semibold uppercase tracking-widest text-zinc-500">
            {EMPRESAS_NEWS.eyebrow}
          </p>
          <h2
            id="empresas-news-heading"
            className="mt-3 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-900"
          >
            {EMPRESAS_NEWS.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-body-lg text-zinc-500">
            {EMPRESAS_NEWS.description}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? false : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-3 lg:gap-8"
        >
          {EMPRESAS_NEWS_ITEMS.map((item) => (
            <NewsCard
              key={item.href}
              item={item}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="mt-12 flex flex-col items-center gap-4 text-center sm:mt-14"
        >
          <p className="max-w-xl text-body-lg font-medium text-zinc-700">
            ¿Quieres saber cómo te afectan estos cambios a tu empresa?
          </p>
          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-teal px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-teal-dark hover:shadow-lg sm:text-base"
          >
            {EMPRESAS_NEWS.ctaLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
