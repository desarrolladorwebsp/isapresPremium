import type { ClientOrigin } from "@/types/user";
import type { CotizadorSourceInfo } from "@/lib/partner-entity/source-label";
import { getCotizadorSourceBadgeClass } from "@/lib/partner-entity/source-label";
import { AdminBadge } from "@/components/admin/admin-data-table";

export const CLIENT_ORIGIN_LABELS: Record<ClientOrigin, string> = {
  COTIZADOR: "Lead cotizador",
  MANUAL: "Registro propio",
  CAMPANA_LEAD_WHATSAPP: "Campaña lead WhatsApp",
  FORMULARIO_WEB: "Formulario web",
};

export interface ClientOriginBadgeProps {
  origin?: ClientOrigin;
  cotizadorSource?: CotizadorSourceInfo | null;
  /** Etiqueta específica del formulario (p. ej. "Formulario web - Desde Tu 7%"). */
  webFormSource?: string | null;
}

export function ClientOriginBadge({
  origin = "MANUAL",
  cotizadorSource,
  webFormSource,
}: ClientOriginBadgeProps) {
  if (origin === "COTIZADOR") {
    const label = cotizadorSource?.description ?? CLIENT_ORIGIN_LABELS.COTIZADOR;
    const badgeClass = getCotizadorSourceBadgeClass(cotizadorSource?.slug);

    return (
      <AdminBadge
        className={badgeClass}
        title={
          cotizadorSource?.slug
            ? `Lead desde ${cotizadorSource.label} (/${cotizadorSource.slug})`
            : "Lead generado desde el cotizador"
        }
      >
        {label}
      </AdminBadge>
    );
  }

  if (origin === "CAMPANA_LEAD_WHATSAPP") {
    return (
      <AdminBadge
        className="border border-[#1da851]/30 bg-[#25D366]/15 text-[#128C7E]"
        title="Lead captado en campaña de WhatsApp"
      >
        {CLIENT_ORIGIN_LABELS.CAMPANA_LEAD_WHATSAPP}
      </AdminBadge>
    );
  }

  if (origin === "FORMULARIO_WEB") {
    const label =
      webFormSource?.trim() || CLIENT_ORIGIN_LABELS.FORMULARIO_WEB;

    return (
      <AdminBadge
        className="border border-[#0e7490]/25 bg-[#ecfeff] text-[#0e7490]"
        title={`Lead captado desde ${label}`}
      >
        {label}
      </AdminBadge>
    );
  }

  return (
    <AdminBadge
      tone="success"
      title="Agregado manualmente por el ejecutivo"
    >
      {CLIENT_ORIGIN_LABELS.MANUAL}
    </AdminBadge>
  );
}
