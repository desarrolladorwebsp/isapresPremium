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
  middle,
  actions,
  compactMobile = false,
}: {
  title: string;
  description?: string;
  /** Contenido flexible entre título y acciones (p. ej. buscador). */
  middle?: ReactNode;
  actions?: ReactNode;
  /** Título e acciones en una sola fila en mobile (izq / der). */
  compactMobile?: boolean;
}) {
  return (
    <div
      className={
        compactMobile
          ? joinClasses(
              "flex gap-2",
              middle
                ? "flex-col sm:flex-row sm:items-center"
                : "items-center justify-between lg:items-end",
            )
          : "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      }
    >
      <div
        className={joinClasses(
          compactMobile ? "min-w-0" : undefined,
          compactMobile && middle
            ? "flex items-center justify-between gap-2"
            : undefined,
        )}
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
        {compactMobile && middle && actions ? (
          <div className="flex shrink-0 flex-nowrap gap-2 sm:hidden">{actions}</div>
        ) : null}
      </div>
      {middle ? (
        <div className="min-w-0 w-full flex-1 sm:px-1">{middle}</div>
      ) : null}
      {actions ? (
        <div
          className={joinClasses(
            "flex gap-2",
            compactMobile ? "shrink-0 flex-nowrap" : "flex-wrap",
            compactMobile && middle ? "hidden sm:flex" : undefined,
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
  /** `scroll` = tabla con overflow horizontal; `stack` = contenido sin scroll lateral (p. ej. cards). */
  contentLayout = "scroll",
  /** Si false, sin fondo/borde del contenedor (útil en vista cards). */
  framed = true,
  className,
}: {
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingMessage?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentLayout?: "scroll" | "stack";
  framed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={
        framed
          ? joinClasses(
              "overflow-hidden rounded-2xl border bg-white shadow-sm",
              ui.border,
              className,
            )
          : joinClasses("min-w-0", className)
      }
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
          <div
            className={
              contentLayout === "scroll"
                ? joinClasses(
                    horizontalScrollRail,
                    "max-w-full overflow-x-auto overscroll-x-contain",
                  )
                : framed
                  ? "p-3 sm:p-4"
                  : undefined
            }
          >
            {children}
          </div>
          {footer ? (
            <div
              className={joinClasses(
                "px-1 py-3 text-xs text-muted sm:px-0",
                framed ? "border-t bg-bg-layout/40 px-4" : "pt-4",
              )}
            >
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
  className,
}: {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    <table
      className={joinClasses("w-full text-left text-sm", className)}
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}

export function AdminTableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={joinClasses(
        "sticky top-0 z-10 border-b bg-bg-layout/95 text-xs uppercase tracking-wide text-muted backdrop-blur-sm",
        className,
      )}
    >
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
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={joinClasses(
        "border-b transition last:border-b-0",
        onClick ? "cursor-pointer" : "",
        selected ? "bg-primary/5" : "hover:bg-bg-layout/40",
        className,
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
  sortable = false,
  sortDirection = null,
  onSort,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Si es true, el encabezado es clickeable para ordenar. */
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  if (!sortable) {
    return (
      <th
        className={joinClasses(
          "px-2.5 py-2.5 text-[11px] font-semibold whitespace-nowrap sm:px-3",
          alignClass,
          className,
        )}
      >
        {children}
      </th>
    );
  }

  return (
    <th
      className={joinClasses(
        "px-2.5 py-2.5 text-[11px] font-semibold whitespace-nowrap sm:px-3",
        alignClass,
        className,
      )}
      aria-sort={
        sortDirection === "asc"
          ? "ascending"
          : sortDirection === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        onClick={onSort}
        className={joinClasses(
          "inline-flex max-w-full items-center gap-1 rounded-md px-0.5 py-0.5 text-inherit transition",
          "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          sortDirection ? "text-primary" : "text-inherit",
        )}
      >
        <span className="truncate">{children}</span>
        <span
          className={joinClasses(
            "inline-flex w-3 shrink-0 justify-center text-[10px] leading-none",
            sortDirection ? "opacity-100" : "opacity-40",
          )}
          aria-hidden
        >
          {sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "↕"}
        </span>
      </button>
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
        "px-2.5 py-2.5 text-xs sm:px-3 sm:text-sm",
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
  headerAside,
  headerTone = "navy",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
  /** Contenido extra en el header (p. ej. filtros), a la izquierda de Cerrar. */
  headerAside?: ReactNode;
  /** `navy` = cabecera azul oscuro (header ejecutivo) con texto blanco. Default. */
  headerTone?: "default" | "navy";
}) {
  if (!open) return null;

  const sizeClass = {
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  }[size];

  const isNavy = headerTone === "navy";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className={joinClasses(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border bg-white shadow-xl sm:rounded-2xl",
          sizeClass,
          ui.border,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-form-modal-title"
      >
        <div
          className={joinClasses(
            "flex shrink-0 items-start justify-between gap-3 px-5 py-4 sm:gap-4 sm:px-6",
            isNavy
              ? "border-b border-white/10 bg-[color:var(--dash-navy,#092558)] text-white"
              : "border-b",
          )}
        >
          <div className="min-w-0 flex-1">
            <h3
              id="admin-form-modal-title"
              className={joinClasses(
                "text-lg font-bold",
                isNavy ? "text-white" : "text-primary-dark",
              )}
            >
              {title}
            </h3>
            {description ? (
              <p
                className={joinClasses(
                  "mt-1 text-sm",
                  isNavy ? "text-white/75" : "text-muted",
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-2 sm:gap-3">
            {headerAside}
            <button
              type="button"
              onClick={onClose}
              className={joinClasses(
                "shrink-0 rounded-lg px-2 py-1 text-sm font-semibold transition",
                isNavy
                  ? "text-white/85 hover:bg-white/10 hover:text-white"
                  : "text-muted hover:bg-bg-layout",
              )}
              aria-label="Cerrar"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
