"use client";

import Image from "next/image";
import {
  ChevronRight,
  Headphones,
  Mail,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  EXPERTS_CONTACT,
  EXPERTS_CONTACT_ACTIONS,
  EXPERTS_IMAGE,
  EXPERTS_TRUST_ITEMS,
  type ExpertContactAction,
} from "@/constants/experts";

const ACTION_ICONS: Record<ExpertContactAction["icon"], LucideIcon> = {
  video: Video,
  chat: MessageCircle,
  mail: Mail,
};

const VARIANT_STYLES: Record<
  ExpertContactAction["variant"],
  {
    card: string;
    iconWrap: string;
    title: string;
    description: string;
    chevron: string;
  }
> = {
  primary: {
    card: "bg-brand-teal text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-dark hover:shadow-lg",
    iconWrap: "bg-white/15 text-white",
    title: "text-white",
    description: "text-white/85",
    chevron: "text-white/80",
  },
  mint: {
    card: "bg-brand-green/15 text-brand-teal-dark hover:bg-brand-green/25",
    iconWrap: "bg-brand-green/20 text-brand-teal",
    title: "text-brand-teal-dark",
    description: "text-zinc-600",
    chevron: "text-brand-teal/70",
  },
  outline: {
    card: "border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:border-brand-green/30 hover:shadow-md",
    iconWrap: "bg-zinc-100 text-brand-teal",
    title: "text-zinc-800",
    description: "text-zinc-500",
    chevron: "text-zinc-400",
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

function ContactAction({
  action,
  reducedMotion,
}: {
  action: ExpertContactAction;
  reducedMotion: boolean;
}) {
  const Icon = ACTION_ICONS[action.icon];
  const styles = VARIANT_STYLES[action.variant];

  return (
    <motion.a
      href={action.href}
      target={action.external ? "_blank" : undefined}
      rel={action.external ? "noopener noreferrer" : undefined}
      variants={itemVariants}
      whileHover={reducedMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      className={`group flex min-h-[4.75rem] items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors sm:px-5 ${styles.card}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span
          className={`block text-sm font-bold tracking-tight sm:text-base ${styles.title}`}
        >
          {action.title}
        </span>
        <span className={`mt-0.5 block text-xs sm:text-sm ${styles.description}`}>
          {action.description}
        </span>
      </span>

      <ChevronRight
        className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${styles.chevron}`}
        aria-hidden="true"
      />
    </motion.a>
  );
}

export function ExpertsContactSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="experts-contact-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(6,78,69,0.08)] ring-1 ring-zinc-100 sm:rounded-[2rem]">
          <div className="grid lg:grid-cols-2">
            {/* Team visual */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, x: -24 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#eef6f4] via-white to-brand-green/10 lg:aspect-auto lg:min-h-full"
            >
              <div className="absolute inset-0">
                <Image
                  src={EXPERTS_IMAGE}
                  alt="Equipo de expertos de Isapres Premium listos para asesorarte"
                  fill
                  className="object-contain object-center p-2 sm:p-3"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={false}
                />
                {/* Soft brand wash over the panel only — photo stays fully visible */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-teal-dark/30 to-transparent"
                  aria-hidden="true"
                />
              </div>

              <div className="absolute left-5 top-5 z-10 rounded-xl bg-white/80 px-3 py-2 backdrop-blur-sm sm:left-7 sm:top-7">
                <p className="font-heading text-sm font-extrabold tracking-tight text-brand-teal-dark sm:text-base">
                  ISAPRES PREMIUM
                </p>
                <p className="mt-0.5 text-[0.7rem] font-medium tracking-wide text-zinc-500">
                  cotizador
                </p>
                <span className="mt-1.5 block h-0.5 w-12 rounded-full bg-brand-green" />
              </div>

              <div className="relative hidden min-h-[520px] lg:block" aria-hidden="true" />

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
                className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-[17.5rem] sm:p-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-teal-dark">
                    {EXPERTS_CONTACT.badgeTitle}
                  </p>
                  <p className="text-xs leading-snug text-zinc-500">
                    {EXPERTS_CONTACT.badgeSubtitle}
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Contact actions */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, x: 24 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
              className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-10 xl:px-12"
            >
              <Headphones
                className="h-8 w-8 text-brand-teal"
                strokeWidth={1.6}
                aria-hidden="true"
              />

              <h2
                id="experts-contact-heading"
                className="mt-4 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-900"
              >
                {EXPERTS_CONTACT.headingLead}{" "}
                <span className="text-brand-teal-dark">
                  {EXPERTS_CONTACT.headingAccent}
                </span>
              </h2>

              <p className="mt-3 max-w-md text-body-lg leading-relaxed text-zinc-500">
                {EXPERTS_CONTACT.description}
              </p>

              <motion.div
                variants={listVariants}
                initial={reducedMotion ? false : "hidden"}
                whileInView={reducedMotion ? undefined : "visible"}
                viewport={{ once: true, margin: "-60px" }}
                className="mt-7 flex flex-col gap-3"
              >
                {EXPERTS_CONTACT_ACTIONS.map((action) => (
                  <ContactAction
                    key={action.title}
                    action={action}
                    reducedMotion={!!reducedMotion}
                  />
                ))}
              </motion.div>

              <p className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-brand-green"
                  aria-hidden="true"
                />
                {EXPERTS_CONTACT.trustNote}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Trust bar — separate rounded strip like the mockup */}
        <motion.ul
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="mt-5 grid gap-5 rounded-[1.5rem] bg-zinc-100/90 px-5 py-7 sm:mt-6 sm:grid-cols-2 sm:rounded-[1.75rem] sm:px-7 sm:py-8 lg:grid-cols-4 lg:gap-4 lg:px-8"
        >
          {EXPERTS_TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-teal/25 bg-white text-brand-teal">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-teal-dark">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 sm:text-[0.8125rem]">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
