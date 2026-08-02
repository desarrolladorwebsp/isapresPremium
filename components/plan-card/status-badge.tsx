import {
  resolveBadgeTone,
  statusBadgeToneClass,
  type StatusBadgeTone,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? resolveBadgeTone(label);

  return (
    <span
      className={joinClasses(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        statusBadgeToneClass[resolvedTone],
      )}
    >
      {label}
    </span>
  );
}
