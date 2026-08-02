"use client";

import { motion, useReducedMotion } from "framer-motion";

import { landing } from "@/components/platform/landing/landing-tokens";
import { LANDING_FOOTER_CONTACT } from "@/components/platform/landing/landing-social-data";
import { MailIcon, MessageCircleIcon } from "@/components/platform/privacy-policy/privacy-policy-icons";
import {
  getPrivacyPolicyWhatsAppUrl,
  privacyPolicyContactCta,
} from "@/constants/privacy-policy";
import { SITE_CONTACT_EMAIL } from "@/lib/seo/site-config";

export function PrivacyPolicyContactCta() {
  const reducedMotion = useReducedMotion();
  const whatsAppUrl = getPrivacyPolicyWhatsAppUrl();

  return (
    <motion.section
      id={privacyPolicyContactCta.id}
      aria-labelledby={`${privacyPolicyContactCta.id}-title`}
      className="scroll-mt-28"
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary-muted/40 p-6 shadow-sm sm:p-8">
        <div className="landing-grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="bg-primary/10 absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl" aria-hidden />

        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {privacyPolicyContactCta.eyebrow}
          </p>
          <h2
            id={`${privacyPolicyContactCta.id}-title`}
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {privacyPolicyContactCta.title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed premium-text-secondary sm:text-base">
            {privacyPolicyContactCta.description}
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}`}
              className={`${landing.ctaPrimary} gap-2.5`}
            >
              <MailIcon className="h-4 w-4 shrink-0" />
              {SITE_CONTACT_EMAIL}
            </a>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${landing.ctaSecondary} gap-2.5 border-[#25D366]/30 bg-[#25D366]/10 hover:border-[#25D366]/50 hover:bg-[#25D366]/15`}
              aria-label={`WhatsApp ${LANDING_FOOTER_CONTACT.whatsapp} (abre en nueva pestaña)`}
            >
              <MessageCircleIcon className="h-4 w-4 shrink-0 text-[#128C7E]" />
              WhatsApp {LANDING_FOOTER_CONTACT.whatsapp}
            </a>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
