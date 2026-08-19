import {
  CLIENT_PIPELINE_STATUS_DISPLAY_LABELS,
  CLIENT_PIPELINE_STATUS_TONES,
} from "@/lib/client-pipeline/constants";
import { joinClasses } from "@/lib/utils";
import type { ClientPipelineStatus } from "@/types/client-pipeline";

export function ClientPipelineStatusBadge({
  status,
  className,
}: {
  status: ClientPipelineStatus | undefined;
  className?: string;
}) {
  const resolved = status ?? "NUEVO";
  const tone = CLIENT_PIPELINE_STATUS_TONES[resolved];
  const isNuevo = resolved === "NUEVO";

  const toneClass = isNuevo
    ? "bg-emerald-100 text-emerald-900"
    : {
        success: "bg-emerald-100 text-emerald-900",
        warning: "bg-amber-100 text-amber-900",
        info: "bg-sky-100 text-sky-900",
        neutral: "bg-zinc-100 text-zinc-700",
        danger: "bg-red-100 text-red-900",
      }[tone];

  const dotClass = isNuevo
    ? "bg-emerald-500"
    : {
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        info: "bg-sky-500",
        neutral: "bg-zinc-400",
        danger: "bg-red-500",
      }[tone];

  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
        toneClass,
        className,
      )}
    >
      <span
        className={joinClasses("size-1.5 shrink-0 rounded-full", dotClass)}
        aria-hidden
      />
      {CLIENT_PIPELINE_STATUS_DISPLAY_LABELS[resolved]}
    </span>
  );
}
