"use client";

import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  Headset,
  Video,
} from "lucide-react";
import { joinClasses } from "@/lib/utils";

export type PipelineRoleId = "zoom" | "premium" | "isapres" | "seguimiento";

type PipelineRoleTile = {
  id: PipelineRoleId;
  label: string;
  Icon: LucideIcon;
  iconClassName: string;
};

const ROLE_TILES: PipelineRoleTile[] = [
  {
    id: "zoom",
    label: "Ejecutivo Zoom",
    Icon: Video,
    iconClassName:
      "bg-[color-mix(in_srgb,var(--dash-cyan,#1ac9ea)_24%,white)] text-[color:var(--dash-navy,#092558)]",
  },
  {
    id: "premium",
    label: "Ejecutivo Premium",
    Icon: Headset,
    iconClassName:
      "bg-[color-mix(in_srgb,var(--dash-royal,#0d6dee)_22%,white)] text-[color:var(--dash-navy,#092558)]",
  },
  {
    id: "isapres",
    label: "Ejecutivo Isapre",
    Icon: BriefcaseBusiness,
    iconClassName:
      "bg-[color-mix(in_srgb,var(--dash-navy,#092558)_14%,white)] text-[color:var(--dash-navy,#092558)]",
  },
  {
    id: "seguimiento",
    label: "Seguimiento",
    Icon: ClipboardCheck,
    iconClassName:
      "bg-[color-mix(in_srgb,var(--dash-blue,#1289f8)_20%,white)] text-[color:var(--dash-navy,#092558)]",
  },
];

export interface ClientPipelineRoleCardProps {
  selectedId: PipelineRoleId | null;
  onSelect: (id: PipelineRoleId) => void;
}

/**
 * Selector de rol/flujo en la ficha del cliente (iconos grandes tipo app).
 */
export function ClientPipelineRoleCard({
  selectedId,
  onSelect,
}: ClientPipelineRoleCardProps) {
  return (
    <div className="px-1 py-1 sm:px-2 sm:py-2" aria-label="Flujos de gestión">
      <div className="grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-4 sm:gap-4">
        {ROLE_TILES.map((tile) => {
          const selected = selectedId === tile.id;
          const Icon = tile.Icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              aria-pressed={selected}
              className={joinClasses(
                "group flex aspect-square w-full max-w-[13.5rem] flex-col items-center justify-center gap-3 rounded-[1.6rem] px-3 text-center transition duration-200 sm:max-w-[15rem] sm:gap-3.5 sm:rounded-[1.75rem] sm:px-4",
                "shadow-[0_10px_28px_-12px_rgb(9_37_88_/_0.3)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
                "hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_rgb(9_37_88_/_0.38)]",
                "active:translate-y-0 active:scale-[0.98]",
                tile.iconClassName,
                selected
                  ? "ring-2 ring-[color:var(--dash-cyan,#1ac9ea)] ring-offset-2 ring-offset-[color:var(--bg-layout,#f0f4f8)]"
                  : "",
              )}
            >
              <Icon
                className="size-12 sm:size-14"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="max-w-[9rem] text-[13px] font-bold leading-tight text-current sm:text-sm">
                {tile.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
