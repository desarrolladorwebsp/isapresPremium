"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ComponentType } from "react";
import {
  CHATBOT_FEATURES,
  CHATBOT_ROBOT_IMAGE,
  CHATBOT_SHADOW_IMAGE,
  CHATBOT_WHATSAPP_MESSAGE,
} from "@/constants/chatbot";
import { siteConfig } from "@/constants/site";

const featureListVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const featureItemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

function FeatureItem({
  title,
  description,
  icon: Icon,
  highlighted,
  onHover,
  onLeave,
  reducedMotion,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  highlighted: boolean;
  onHover: () => void;
  onLeave: () => void;
  reducedMotion: boolean;
}) {
  return (
    <motion.li
      variants={featureItemVariants}
      whileHover={reducedMotion ? undefined : { scale: 1.02 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      className={`flex items-start gap-4 rounded-2xl px-5 py-4 transition-colors duration-300 ${
        highlighted
          ? "bg-brand-teal-dark text-white shadow-lg"
          : "bg-transparent text-emerald-900"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
          highlighted
            ? "bg-white/15 text-white"
            : "bg-brand-green text-white"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3
          className={`font-heading text-base font-bold tracking-tight sm:text-lg ${
            highlighted ? "text-white" : "text-emerald-900"
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-1 text-sm leading-relaxed ${
            highlighted ? "text-white/85" : "text-zinc-600"
          }`}
        >
          {description}
        </p>
      </div>
    </motion.li>
  );
}

export function ChatbotSection() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(2);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (reducedMotion || hoveredIndex !== null) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CHATBOT_FEATURES.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [reducedMotion, hoveredIndex]);

  const highlightedIndex = hoveredIndex ?? activeIndex;

  const whatsappUrl = `https://wa.me/${siteConfig.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(CHATBOT_WHATSAPP_MESSAGE)}`;

  return (
    <section
      id="chatbot"
      className="scroll-mt-28 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="chatbot-heading"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[11fr_9fr] lg:gap-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -30 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2
            id="chatbot-heading"
            className="text-h2 text-balance font-heading font-bold tracking-tight text-brand-teal-dark"
          >
            Nuevo! Chatbot Inteligente de Salud
          </h2>

          <p className="mt-5 text-body-lg leading-relaxed text-zinc-700">
            Más de{" "}
            <strong className="font-bold text-emerald-900">3.000 planes</strong>{" "}
            son imposibles de comparar en segundos. Nuestro chatbot con IA lo hace
            por ti, encontrando el plan que se ajusta a tu{" "}
            <strong className="font-bold text-emerald-900">presupuesto</strong>,{" "}
            <strong className="font-bold text-emerald-900">
              clínicas y coberturas
            </strong>
            .
          </p>

          <motion.ul
            variants={featureListVariants}
            initial={reducedMotion ? undefined : "hidden"}
            whileInView={reducedMotion ? undefined : "visible"}
            viewport={{ once: true, margin: "-80px" }}
            className="mt-8 space-y-2"
          >
            {CHATBOT_FEATURES.map((feature, index) => (
              <FeatureItem
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                highlighted={highlightedIndex === index}
                onHover={() => setHoveredIndex(index)}
                onLeave={() => setHoveredIndex(null)}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: 30 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <div className="relative flex w-full max-w-[380px] flex-col items-center">
            <motion.div
              animate={reducedMotion ? undefined : { y: [0, -12, 0] }}
              transition={
                reducedMotion
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
              className="relative z-10"
            >
              <Image
                src={CHATBOT_ROBOT_IMAGE}
                alt="Chatbot inteligente de salud Isapres Premium"
                width={380}
                height={495}
                className="h-auto w-full max-w-[340px] object-contain sm:max-w-[380px]"
                priority={false}
              />
            </motion.div>

            <motion.div
              animate={
                reducedMotion
                  ? undefined
                  : {
                      scale: [1, 1.08, 1],
                      opacity: [0.35, 0.5, 0.35],
                    }
              }
              transition={
                reducedMotion
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
              className="relative -mt-6 w-[72%]"
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

          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-brand-teal-dark px-8 py-3.5 text-base font-semibold text-white shadow-md transition-shadow hover:shadow-lg"
          >
            ¡Habla con nuestro chatbot!
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
