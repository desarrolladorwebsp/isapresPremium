"use client";

import { AdminBadge } from "@/components/admin/admin-data-table";
import {
  CLIENT_CONTACT_METHOD_LABELS,
  type ClientContactMethod,
} from "@/types/client-pipeline";

export function ClientContactMethodBadge({
  method,
}: {
  method?: ClientContactMethod | null;
}) {
  if (!method) return null;

  const isWhatsApp = method === "WHATSAPP";

  return (
    <AdminBadge
      className={
        isWhatsApp
          ? "border border-[#1da851]/30 bg-[#25D366]/15 text-[#128C7E]"
          : "border border-sky-200 bg-sky-50 text-sky-800"
      }
      title={`Contactar preferentemente por ${CLIENT_CONTACT_METHOD_LABELS[method]}`}
    >
      Contacto: {CLIENT_CONTACT_METHOD_LABELS[method]}
    </AdminBadge>
  );
}
