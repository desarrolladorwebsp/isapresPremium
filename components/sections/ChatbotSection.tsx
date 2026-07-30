"use client";

import Image from "next/image";
import {
  ArrowRight,
  Check,
  Sparkles,
  Star,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CHATBOT_CHAT_PREVIEW,
  CHATBOT_CTA_HREF,
  CHATBOT_HIGHLIGHTS,
  CHATBOT_PERKS,
  CHATBOT_PILLARS,
  CHATBOT_PROCESS_STEPS,
  CHATBOT_RESULT_PREVIEW,
  CHATBOT_ROBOT_IMAGE,
  CHATBOT_SECTION,
  CHATBOT_SHADOW_IMAGE,
} from "@/constants/chatbot";

const floatTransition = {
  duration: 3.2,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

function CtaButton({
  href,
  variant,
  className = "",
  reducedMotion,
}: {
  href: string;
  variant: "primary" | "outline";
  className?: string;
  reducedMotion: boolean;
}) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wide transition-colors sm:px-8 sm:text-base";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-brand-green to-brand-teal text-white shadow-lg shadow-brand-green/25 hover:from-brand-green/95 hover:to-brand-teal-dark"
      : "border border-brand-green/70 bg-transparent text-white hover:bg-white/10";

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={reducedMotion ? undefined : { scale: 1.02, y: -1 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      className={`${base} ${styles} ${className}`}
    >
      {CHATBOT_SECTION.ctaLabel}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </motion.a>
  );
}

function ProcessSteps({
  reducedMotion,
  className = "",
}: {
  reducedMotion: boolean;
  className?: string;
}) {
  return (
    <ul className={`flex flex-col gap-2.5 ${className}`}>
      {CHATBOT_PROCESS_STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <motion.li
            key={step.label}
            initial={reducedMotion ? false : { opacity: 0, x: -12 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
            className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 shadow-md shadow-zinc-900/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-teal">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-xs font-medium leading-snug text-zinc-700 sm:text-sm">
              {step.label}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

function ChatPreview({
  reducedMotion,
  className = "",
}: {
  reducedMotion: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.25, duration: 0.45 }}
      className={`w-full max-w-[210px] overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-lg shadow-zinc-900/5 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green/15 text-brand-teal">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold text-zinc-800">
          {CHATBOT_CHAT_PREVIEW.title}
        </p>
      </div>
      <div className="space-y-2 px-3 py-3">
        {CHATBOT_CHAT_PREVIEW.messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            className={`max-w-[90%] rounded-2xl px-2.5 py-1.5 text-[0.7rem] leading-snug ${
              message.role === "bot"
                ? "bg-zinc-100 text-zinc-600"
                : "ml-auto bg-brand-green text-white"
            }`}
          >
            {message.text}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

function ResultPreview({
  reducedMotion,
  className = "",
}: {
  reducedMotion: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className={`flex w-full max-w-xs items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-lg shadow-zinc-900/5 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500">{CHATBOT_RESULT_PREVIEW.label}</p>
        <p className="text-sm font-bold text-brand-teal">
          {CHATBOT_RESULT_PREVIEW.value}
        </p>
      </div>
      <svg
        viewBox="0 0 64 28"
        className="h-7 w-14 shrink-0 text-brand-green"
        aria-hidden="true"
      >
        <path
          d="M2 22 C12 22 14 8 24 10 C34 12 36 20 44 14 C52 8 56 6 62 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="shrink-0 text-xs font-semibold text-brand-teal">
        {CHATBOT_RESULT_PREVIEW.cta} →
      </span>
    </motion.div>
  );
}

export function ChatbotSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="chatbot"
      className="scroll-mt-28 overflow-hidden bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="chatbot-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-8 xl:gap-12">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -28 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="max-w-xl"
          >
            <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-teal">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {CHATBOT_SECTION.badge}
            </p>

            <h2
              id="chatbot-heading"
              className="mt-5 text-balance font-heading text-[clamp(1.85rem,1.4rem+1.8vw,3rem)] font-bold leading-[1.12] tracking-tight text-zinc-900"
            >
              {CHATBOT_SECTION.heading}{" "}
              <span className="text-brand-green">
                {CHATBOT_SECTION.headingAccent}
              </span>
            </h2>

            <ul className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3">
              {CHATBOT_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-2 text-sm font-medium text-zinc-600"
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-brand-teal"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    {item.label}
                  </li>
                );
              })}
            </ul>

            <div className="mt-8">
              <CtaButton
                href={CHATBOT_CTA_HREF}
                variant="primary"
                className="w-full sm:w-auto"
                reducedMotion={!!reducedMotion}
              />
            </div>

            <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {CHATBOT_PERKS.map((perk) => (
                <li
                  key={perk}
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-500"
                >
                  <Check
                    className="h-3.5 w-3.5 text-brand-green"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                  {perk}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 28 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
            className="relative mx-auto w-full max-w-xl lg:max-w-none"
          >
            {/* Desktop floating composition */}
            <div className="relative mx-auto hidden min-h-[520px] w-full lg:block">
              <div
                className="pointer-events-none absolute left-1/2 top-[42%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-green/10"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[42%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-green/15"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[42%] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-green/20"
                aria-hidden="true"
              />

              <div className="absolute left-0 top-8 z-20 w-[210px] xl:w-[230px]">
                <ProcessSteps reducedMotion={!!reducedMotion} />
              </div>

              <div className="absolute left-1/2 top-2 z-10 flex w-[280px] -translate-x-1/2 flex-col items-center xl:w-[300px]">
                <motion.div
                  animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
                  transition={reducedMotion ? undefined : floatTransition}
                >
                  <Image
                    src={CHATBOT_ROBOT_IMAGE}
                    alt="Chatbot inteligente de salud Isapres Premium"
                    width={380}
                    height={495}
                    className="h-auto w-full object-contain"
                    priority={false}
                  />
                </motion.div>
                <motion.div
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          scale: [1, 1.06, 1],
                          opacity: [0.35, 0.5, 0.35],
                        }
                  }
                  transition={reducedMotion ? undefined : floatTransition}
                  className="relative -mt-5 w-[70%]"
                >
                  <Image
                    src={CHATBOT_SHADOW_IMAGE}
                    alt=""
                    width={320}
                    height={48}
                    aria-hidden
                    className="h-auto w-full object-contain"
                  />
                </motion.div>
              </div>

              <div className="absolute right-0 top-16 z-20 xl:right-2">
                <ChatPreview reducedMotion={!!reducedMotion} />
              </div>

              <div className="absolute bottom-2 left-1/2 z-20 w-full max-w-[300px] -translate-x-1/2">
                <ResultPreview reducedMotion={!!reducedMotion} />
              </div>
            </div>

            {/* Mobile / tablet stacked composition */}
            <div className="flex flex-col items-center lg:hidden">
              <motion.div
                animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
                transition={reducedMotion ? undefined : floatTransition}
                className="relative z-10"
              >
                <Image
                  src={CHATBOT_ROBOT_IMAGE}
                  alt="Chatbot inteligente de salud Isapres Premium"
                  width={380}
                  height={495}
                  className="h-auto w-full max-w-[240px] object-contain sm:max-w-[280px]"
                  priority={false}
                />
              </motion.div>
              <Image
                src={CHATBOT_SHADOW_IMAGE}
                alt=""
                width={320}
                height={48}
                aria-hidden
                className="relative -mt-4 h-auto w-[65%] max-w-[200px] object-contain opacity-50"
              />

              <div className="mt-6 grid w-full gap-4 sm:grid-cols-2 sm:items-start">
                <ProcessSteps reducedMotion={!!reducedMotion} />
                <div className="flex flex-col items-center gap-4 sm:items-stretch">
                  <ChatPreview
                    reducedMotion={!!reducedMotion}
                    className="mx-auto sm:mx-0 sm:ml-auto"
                  />
                  <ResultPreview
                    reducedMotion={!!reducedMotion}
                    className="mx-auto max-w-[210px] sm:mx-0 sm:ml-auto sm:max-w-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-12 flex flex-col gap-5 rounded-2xl bg-brand-teal-dark px-5 py-5 sm:mt-14 sm:rounded-3xl sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8"
        >
          <ul className="grid flex-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {CHATBOT_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <li key={pillar.title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/20 text-brand-green">
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-sm font-semibold text-white sm:text-base">
                    {pillar.title}
                  </span>
                </li>
              );
            })}
          </ul>

          <CtaButton
            href={CHATBOT_CTA_HREF}
            variant="outline"
            className="w-full shrink-0 lg:w-auto"
            reducedMotion={!!reducedMotion}
          />
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={reducedMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-6 flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3"
        >
          <p className="text-sm text-zinc-500">{CHATBOT_SECTION.socialProof}</p>
          <span className="hidden text-zinc-300 sm:inline" aria-hidden="true">
            ·
          </span>
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600">
            <span
              className="inline-flex items-center gap-0.5"
              aria-hidden="true"
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className="h-3.5 w-3.5 fill-brand-green text-brand-green"
                />
              ))}
            </span>
            {CHATBOT_SECTION.ratingLabel}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
