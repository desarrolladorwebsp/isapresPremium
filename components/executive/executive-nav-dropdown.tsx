"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={joinClasses(
        "size-3.5 shrink-0 transition-transform",
        open && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExecutiveNavDropdown({
  label,
  icon,
  open,
  active,
  onToggle,
  onClose,
  children,
}: {
  label: string;
  icon: ReactNode;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={joinClasses(
          "premium-executive-tab shrink-0 px-2.5 py-1.5 text-xs xl:px-3 xl:text-sm",
          touchTarget,
          active && "premium-executive-tab-active",
        )}
      >
        {icon}
        <span>{label}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute left-0 z-50 mt-1.5 min-w-[13.5rem] overflow-hidden rounded-lg border border-white/15 bg-[color:var(--dash-navy)] py-1 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ExecutiveNavDropdownItem({
  active,
  icon,
  label,
  onSelect,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={joinClasses(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold transition",
        active
          ? "bg-[color:var(--dash-cyan)] text-white"
          : "text-white hover:bg-white/10",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
