"use client";

import { joinClasses } from "@/lib/utils";

export interface GpuExpandPanelProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * GPU-friendly expand/collapse using CSS grid rows (avoids height:auto layout thrashing).
 */
export function GpuExpandPanel({
  open,
  children,
  className,
  contentClassName,
}: GpuExpandPanelProps) {
  return (
    <div
      className={joinClasses(
        "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      aria-hidden={!open}
    >
      <div className={joinClasses("overflow-hidden", contentClassName)}>
        <div
          className={joinClasses(
            "transition-opacity duration-300 ease-out motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
