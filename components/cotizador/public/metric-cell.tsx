import { accentIconClass, type AccentIconTone } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface MetricCellProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: AccentIconTone;
  valueClassName?: string;
  onClick?: () => void;
  active?: boolean;
}

export function MetricCell({
  label,
  value,
  icon,
  tone,
  valueClassName,
  onClick,
  active = false,
}: MetricCellProps) {
  const content = (
    <>
      <span
        className={joinClasses(
          "flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 sm:rounded-xl",
          accentIconClass[tone],
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p
          className={joinClasses(
            "mt-0.5 text-xs font-bold leading-snug tabular-nums sm:text-sm",
            valueClassName ?? "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={active}
        className={joinClasses(
          "flex min-w-0 items-start gap-2.5 rounded-xl p-2 text-left transition sm:gap-3 sm:p-2.5",
          "hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          active ? "bg-white ring-1 ring-primary/20" : "",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">{content}</div>
  );
}
