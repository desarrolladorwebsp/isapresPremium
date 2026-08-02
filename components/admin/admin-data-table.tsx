"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { horizontalScrollRail, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export function AdminPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={joinClasses("space-y-6", className)}>{children}</div>;
}

export function AdminPanelHeader({
  title,
  description,
  actions,
  compactMobile = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Título e acciones en una sola fila en mobile (izq / der). */
  compactMobile?: boolean;
}) {
  return (
    <div
      className={
        compactMobile
          ? "flex items-center justify-between gap-2 lg:items-end"
          : "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      }
    >
      <div className={compactMobile ? "min-w-0" : undefined}>
        <h2 className="text-xl font-bold text-primary-dark">{title}</h2>
        {description ? (
          <p
            className={joinClasses(
              "mt-1 max-w-3xl text-sm text-muted",
              compactMobile && "hidden lg:block",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={joinClasses(
            "flex gap-2",
            compactMobile ? "shrink-0 flex-nowrap" : "flex-wrap",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={joinClasses("grid gap-3", className)}>{children}</div>
  );
}

export function AdminTableCard({
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  loadingMessage = "Cargando…",
  children,
  footer,
}: {
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingMessage?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className={joinClasses(
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        ui.border,
      )}
    >
      {loading ? (
        <p className="px-6 py-16 text-center text-sm text-muted">{loadingMessage}</p>
      ) : empty ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">
            {emptyTitle ?? "Sin registros"}
          </p>
          {emptyDescription ? (
            <p className="mt-2 text-sm text-muted">{emptyDescription}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className={joinClasses(horizontalScrollRail, "overflow-x-auto")}>
            {children}
          </div>
          {footer ? (
            <div className="border-t bg-bg-layout/40 px-4 py-3 text-xs text-muted">
              {footer}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AdminTable({
  children,
  minWidth = "48rem",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <table
      className="w-full text-left text-sm"
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 border-b bg-bg-layout/95 text-xs uppercase tracking-wide text-muted backdrop-blur-sm">
      {children}
    </thead>
  );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function AdminTableRow({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={joinClasses(
        "border-b transition last:border-b-0",
        onClick ? "cursor-pointer" : "",
        selected ? "bg-primary/5" : "hover:bg-bg-layout/40",
      )}
    >
      {children}
    </tr>
  );
}

export function AdminTableHeaderCell({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={joinClasses(
        "px-4 py-3 font-semibold whitespace-nowrap",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function AdminTableCell({
  children,
  align = "left",
  valign = "middle",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  valign?: "top" | "middle";
  className?: string;
}) {
  return (
    <td
      className={joinClasses(
        "px-4 py-3.5",
        valign === "top" ? "align-top" : "align-middle",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TableCellStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "flex min-h-[3rem] flex-col justify-center gap-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminBadge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info" | "primary" | "danger";
  className?: string;
  title?: string;
}) {
  const toneClass = {
    neutral: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200",
    warning: "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200",
    info: "bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-200",
    primary: "bg-primary/10 text-primary-dark ring-1 ring-inset ring-primary/20",
    danger: "bg-red-100 text-red-900 ring-1 ring-inset ring-red-200",
  }[tone];

  return (
    <span
      title={title}
      className={joinClasses(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AdminRowActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClasses("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

export function AdminRefreshButton({
  onClick,
  label = "Actualizar",
  compactMobile = false,
  loading = false,
}: {
  onClick: () => void;
  label?: string;
  /** En mobile solo ícono; desde `sm` ícono + texto. */
  compactMobile?: boolean;
  /** Muestra spinner en el ícono sin vaciar la lista (stale-while-revalidate). */
  loading?: boolean;
}) {
  const icon = (
    <svg
      viewBox="0 0 24 24"
      className={joinClasses(
        "size-4",
        compactMobile ? "sm:mr-1.5" : "mr-1.5",
        loading ? "animate-spin" : "",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!compactMobile) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
      >
        {icon}
        {loading ? "Actualizando…" : label}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      aria-label={loading ? "Actualizando…" : label}
      title={loading ? "Actualizando…" : label}
      className={joinClasses(touchTarget, "px-0 sm:h-9 sm:min-h-9 sm:min-w-0 sm:px-3")}
    >
      {icon}
      <span className="hidden sm:inline">
        {loading ? "Actualizando…" : label}
      </span>
    </Button>
  );
}

export function AdminFormModal({
  open,
  title,
  description,
  onClose,
  children,
  size = "lg",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  if (!open) return null;

  const sizeClass = {
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className={joinClasses(
          "flex max-h-[92vh] w-full flex-col rounded-t-2xl border bg-white shadow-xl sm:rounded-2xl",
          sizeClass,
          ui.border,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-form-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3
              id="admin-form-modal-title"
              className="text-lg font-bold text-primary-dark"
            >
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-bg-layout"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
