"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

const POPOVER_WIDTH_PX = 288;
const CLOSE_DELAY_MS = 100;

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={joinClasses("size-2.5", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 10v4.5M12 7.5h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface FilterInfoTipProps {
  label: string;
  children: React.ReactNode;
}

export function FilterInfoTip({ label, children }: FilterInfoTipProps) {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - POPOVER_WIDTH_PX / 2;
    const top = rect.bottom + 6;

    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH_PX - 8));

    setCoords({ top, left });
  }, []);

  const show = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const scheduleHide = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const hide = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || canHover) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      hide();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, canHover, hide]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  function handleTriggerClick() {
    if (canHover) return;
    if (open) {
      hide();
      return;
    }
    show();
  }

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            id={panelId}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: POPOVER_WIDTH_PX,
              zIndex: 80,
            }}
            className={joinClasses(
              "rounded-xl border bg-white p-3.5 shadow-xl ring-1 ring-black/5",
              ui.border,
            )}
            onMouseEnter={canHover ? show : undefined}
            onMouseLeave={canHover ? scheduleHide : undefined}
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onClick={handleTriggerClick}
        onMouseEnter={canHover ? show : undefined}
        onMouseLeave={canHover ? scheduleHide : undefined}
        onFocus={canHover ? show : undefined}
        onBlur={canHover ? scheduleHide : undefined}
        className={joinClasses(
          "relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-full",
          "text-secondary/75 transition-colors hover:text-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "before:absolute before:-inset-2 before:content-[''] lg:before:inset-0",
        )}
      >
        <InfoIcon />
      </button>
      {popover}
    </>
  );
}

/** Bloque de texto para paneles informativos de filtros. */
export function FilterHelpBlock({
  title,
  paragraphs,
  items,
  footnote,
  source,
}: {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly { label: string; text: string }[];
  footnote?: string;
  source?: string;
}) {
  return (
    <div className="space-y-2 text-[11px] leading-relaxed text-foreground">
      <p className="text-xs font-bold text-primary-dark">{title}</p>
      {paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-muted">
          {paragraph}
        </p>
      ))}
      {items ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.label}>
              <span className="font-semibold text-foreground">{item.label}: </span>
              <span className="text-muted">{item.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {footnote ? (
        <p className="rounded-md bg-bg-layout/70 px-2 py-1.5 text-[10px] text-muted">
          {footnote}
        </p>
      ) : null}
      {source ? (
        <p className="text-[9px] text-muted/75">Fuente: {source}</p>
      ) : null}
    </div>
  );
}
