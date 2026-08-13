"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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

function menuPosition(button: HTMLElement): { top: number; left: number } {
  const rect = button.getBoundingClientRect();
  const menuWidth = 216;
  const left = Math.min(rect.left, window.innerWidth - menuWidth - 8);
  return { top: rect.bottom + 6, left: Math.max(8, left) };
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPosition(null);
      return;
    }
    setPosition(menuPosition(buttonRef.current));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!buttonRef.current) return;
      setPosition(menuPosition(buttonRef.current));
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
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

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={{ top: position.top, left: position.left }}
              className="fixed z-[80] min-w-[13.5rem] overflow-hidden rounded-lg border border-white/15 bg-[color:var(--dash-navy)] py-1 shadow-lg"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
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
