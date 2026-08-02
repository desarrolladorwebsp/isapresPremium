import type { ButtonHTMLAttributes } from "react";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "whatsapp"
  | "info"
  | "warning";
type ButtonSize = "md" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: joinClasses(
    ui.cta,
    "shadow-[0_6px_20px_-6px_var(--primary)] hover:shadow-[0_8px_24px_-4px_var(--primary)]",
  ),
  secondary:
    "bg-secondary text-white hover:brightness-110 active:brightness-95",
  danger: ui.dangerGhost,
  ghost:
    "bg-transparent text-foreground hover:bg-surface-hover active:bg-surface-hover/80",
  success:
    "border border-emerald-200 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]",
  whatsapp:
    "border border-[#1da851]/30 bg-[#25D366] text-white shadow-sm hover:brightness-105 active:scale-[0.98]",
  info: "border border-sky-200 bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:scale-[0.98]",
  warning:
    "border border-amber-200 bg-amber-500 text-amber-950 shadow-sm hover:bg-amber-400 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-5 text-base rounded-lg",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        "inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
