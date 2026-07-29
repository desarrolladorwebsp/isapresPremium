"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "@/constants/site";

const EXPERTS_IMAGE = "/images/experts-team.png";

const VIDEO_CALL_SUBJECT = "Agendar videollamada - Isapres Premium";

function getVideoCallMailto() {
  const subject = encodeURIComponent(VIDEO_CALL_SUBJECT);
  const body = encodeURIComponent(
    "Hola, me gustaría agendar una videollamada con un agente experto.",
  );
  return `mailto:${siteConfig.contact.email}?subject=${subject}&body=${body}`;
}

function CtaButton({
  href,
  label,
  delay,
  reducedMotion,
}: {
  href: string;
  label: string;
  delay: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.a
      href={href}
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      whileHover={reducedMotion ? undefined : { scale: 1.05, y: -2 }}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      className="inline-flex w-full items-center justify-center rounded-lg bg-brand-teal px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-teal-dark hover:shadow-lg sm:w-auto sm:text-base"
    >
      {label}
    </motion.a>
  );
}

export function ExpertsContactSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-brand-teal/10 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-label="Contacto directo con nuestros expertos"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -30 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mx-auto flex w-full max-w-md flex-col items-center lg:mx-0 lg:max-w-lg"
        >
          <motion.div
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, -8, 0],
                  }
            }
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
            className="relative w-full"
          >
            <Image
              src={EXPERTS_IMAGE}
              alt="Equipo de expertos de Isapres Premium listos para asesorarte"
              width={500}
              height={500}
              className="h-auto w-full max-h-[420px] object-contain object-bottom sm:max-h-[480px] lg:max-h-[500px]"
              priority={false}
            />
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="relative -mt-10 w-[92%] rounded-2xl bg-brand-teal px-6 py-5 text-center shadow-lg sm:-mt-12 sm:px-8 sm:py-6"
          >
            <p className="text-sm italic leading-relaxed text-white sm:text-base">
              Ellos son nuestros expertos que te darán las mejores opciones.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: 30 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="text-center lg:text-left"
        >
          <h2 className="text-h2 text-balance font-heading font-bold tracking-tight text-brand-teal-dark">
            ¿Hablar con nosotros directamente?
          </h2>

          <p className="mt-5 text-body-lg leading-relaxed text-zinc-800">
            Sabemos que hay veces quieres hablar directamente con nosotros,
            contacta a uno de nuestros agentes expertos.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <CtaButton
              href={getVideoCallMailto()}
              label="Video llamada"
              delay={0.3}
              reducedMotion={!!reducedMotion}
            />
            <CtaButton
              href={`mailto:${siteConfig.contact.email}`}
              label="Correo electrónico"
              delay={0.4}
              reducedMotion={!!reducedMotion}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
