"use client";

import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { getWhatsAppUrl, WHATSAPP_FLOAT_MESSAGE } from "@/constants/site";

export function WhatsAppFloat() {
  const whatsappUrl = getWhatsAppUrl(WHATSAPP_FLOAT_MESSAGE);

  return (
    <div className="fixed bottom-6 right-6 z-[70] sm:bottom-8 sm:right-8">
      <span
        className="whatsapp-pulse absolute inset-0 rounded-full bg-[#25D366] motion-reduce:hidden"
        aria-hidden="true"
      />
      <span
        className="whatsapp-pulse whatsapp-pulse-delay absolute inset-0 rounded-full bg-[#25D366] motion-reduce:hidden"
        aria-hidden="true"
      />

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp: Quiero mejorar mi plan de Isapre"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition-transform hover:scale-105 hover:shadow-xl hover:shadow-[#25D366]/50 active:scale-95 motion-safe:animate-[whatsapp-float_2.5s_ease-in-out_infinite] sm:h-16 sm:w-16"
      >
        <WhatsAppIcon className="h-7 w-7 sm:h-8 sm:w-8" />
      </a>
    </div>
  );
}
