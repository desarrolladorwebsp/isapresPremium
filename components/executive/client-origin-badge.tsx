import type { ClientOrigin } from "@/types/user";
import { CLIENT_ORIGIN_OPTIONS } from "@/types/user";
import type { CotizadorSourceInfo } from "@/lib/partner-entity/source-label";
import { getCotizadorSourceBadgeClass } from "@/lib/partner-entity/source-label";
import { AdminBadge } from "@/components/admin/admin-data-table";

export const CLIENT_ORIGIN_LABELS: Record<ClientOrigin, string> =
  Object.fromEntries(
    CLIENT_ORIGIN_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<ClientOrigin, string>;

/** Color distinto por origen para identificarlos de un vistazo. */
const ORIGIN_BADGE_CLASS: Partial<Record<ClientOrigin, string>> = {
  MANUAL: "!border !border-indigo-300/60 !bg-indigo-100 !text-indigo-950",
  CAMPANA_LEAD_WHATSAPP:
    "!border !border-[#1da851]/30 !bg-[#25D366]/15 !text-[#128C7E]",
  FORMULARIO_WEB:
    "!border !border-[#0e7490]/25 !bg-[#ecfeff] !text-[#0e7490]",
  CAMPANA_ISAPRES_PREMIUM:
    "!border !border-emerald-300/60 !bg-emerald-100 !text-emerald-950",
  CAMPANA_CONSALUD:
    "!border !border-sky-300/60 !bg-sky-100 !text-sky-950",
  CAMPANA_BANMEDICA:
    "!border !border-rose-300/60 !bg-rose-100 !text-rose-950",
  CAMPANA_COLMENA:
    "!border !border-amber-300/60 !bg-amber-100 !text-amber-950",
  CAMPANA_CRUZ_BLANCA:
    "!border !border-blue-300/60 !bg-blue-100 !text-blue-950",
  CAMPANA_VIDA_TRES:
    "!border !border-violet-300/60 !bg-violet-100 !text-violet-950",
  CAMPANA_NUEVA_MASVIDA:
    "!border !border-orange-300/60 !bg-orange-100 !text-orange-950",
  CAMPANA_ESENCIAL:
    "!border !border-fuchsia-300/60 !bg-fuchsia-100 !text-fuchsia-950",
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
        shape="square"
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
        shape="square"
        className={ORIGIN_BADGE_CLASS.CAMPANA_LEAD_WHATSAPP}
        title="Lead captado en campaña de WhatsApp"
      >
        {CLIENT_ORIGIN_LABELS.CAMPANA_LEAD_WHATSAPP}
      </AdminBadge>
    );
  }

  if (origin.startsWith("CAMPANA_")) {
    const label = CLIENT_ORIGIN_LABELS[origin] ?? origin;
    const badgeClass =
      ORIGIN_BADGE_CLASS[origin] ??
      "border border-cyan-300/60 bg-cyan-100 text-cyan-950";
    return (
      <AdminBadge
        shape="square"
        className={badgeClass}
        title={`Lead captado en ${label}`}
      >
        {label}
      </AdminBadge>
    );
  }

  if (origin === "FORMULARIO_WEB") {
    const label =
      webFormSource?.trim() || CLIENT_ORIGIN_LABELS.FORMULARIO_WEB;

    return (
      <AdminBadge
        shape="square"
        className={ORIGIN_BADGE_CLASS.FORMULARIO_WEB}
        title={`Lead captado desde ${label}`}
      >
        {label}
      </AdminBadge>
    );
  }

  return (
    <AdminBadge
      shape="square"
      className={ORIGIN_BADGE_CLASS.MANUAL}
      title="Agregado manualmente por el ejecutivo"
    >
      {CLIENT_ORIGIN_LABELS.MANUAL}
    </AdminBadge>
  );
}

