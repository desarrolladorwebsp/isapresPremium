"use client";

import { AdminBadge } from "@/components/admin/admin-data-table";
import {
  getCotizadorSourceBadgeClass,
  type CotizadorSourceInfo,
} from "@/lib/partner-entity/source-label";

export interface CotizadorSourceBadgeProps {
  source?: CotizadorSourceInfo | null;
  compact?: boolean;
}

export function CotizadorSourceBadge({
  source,
  compact = false,
}: CotizadorSourceBadgeProps) {
  if (!source) {
    return <span className="text-sm text-muted">—</span>;
  }

  const badgeClass = getCotizadorSourceBadgeClass(source.slug);

  return (
    <div
      className={
        compact
          ? "flex min-h-[3rem] flex-col justify-center gap-1"
          : "space-y-1.5"
      }
    >
      <AdminBadge
        className={badgeClass}
        title={source.description}
      >
        {source.label}
      </AdminBadge>
      {source.slug ? (
        <p className="text-[11px] leading-none text-muted">/{source.slug}</p>
      ) : null}
    </div>
  );
}
