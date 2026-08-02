"use client";

import { buildPaginationItems } from "@/lib/pagination";
import { safeWidth, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export type CurrencyDisplay = "clp" | "uf";

export interface PublicResultsToolbarPagination {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface PublicResultsToolbarProps {
  displayedCount: number;
  totalCount: number;
  /** Rango “1–12 de 2264” cuando hay paginación. */
  rangeLabel?: string | null;
  currency: CurrencyDisplay;
  onCurrencyChange: (currency: CurrencyDisplay) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  searchPlaceholder?: string;
  compactEmbed?: boolean;
  pagination?: PublicResultsToolbarPagination | null;
}

function PaginationChevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      {direction === "prev" ? (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function PublicResultsToolbar({
  displayedCount,
  totalCount,
  rangeLabel = null,
  currency,
  onCurrencyChange,
  searchText,
  onSearchTextChange,
  searchPlaceholder = "Buscar por nombre, código o Isapre...",
  compactEmbed = false,
  pagination = null,
}: PublicResultsToolbarProps) {
  const resultsLabel =
    rangeLabel ??
    (displayedCount < totalCount
      ? `Mostrando ${displayedCount.toLocaleString("es-CL")} de ${totalCount.toLocaleString("es-CL")}`
      : `${totalCount.toLocaleString("es-CL")} resultados`);

  const showPagination =
    pagination !== null &&
    pagination.totalPages > 1 &&
    !compactEmbed;

  const paginationItems = showPagination
    ? buildPaginationItems(pagination.page, pagination.totalPages)
    : [];

  return (
    <div
      className={joinClasses(
        safeWidth,
        "flex flex-col gap-3",
        "lg:flex-row lg:items-center lg:gap-4",
        compactEmbed && "max-md:gap-2",
      )}
    >
      <div
        className={joinClasses(
          "flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1",
          "lg:max-w-[min(100%,22rem)] lg:shrink-0",
          compactEmbed && "max-md:gap-1",
        )}
      >
        <span
          className={joinClasses(
            "inline-flex w-fit max-w-full items-center rounded-md bg-primary px-4 py-1.5 text-sm font-bold text-white shadow-sm",
            compactEmbed &&
              "max-md:truncate max-md:px-2.5 max-md:py-1 max-md:text-[11px]",
          )}
        >
          {resultsLabel}
        </span>
      </div>

      <input
        type="search"
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        placeholder={searchPlaceholder}
        className={joinClasses(
          "h-11 w-full min-w-0 rounded-md px-4 text-sm",
          "lg:min-w-[12rem] lg:flex-1",
          compactEmbed && "max-md:h-9 max-md:rounded-md max-md:px-3 max-md:text-xs",
          ui.input,
        )}
      />

      <div
        className={joinClasses(
          "flex shrink-0 flex-wrap items-center gap-3",
          compactEmbed ? "max-md:self-start" : "self-start lg:self-center",
        )}
      >
        <div
          className={joinClasses(
            "inline-flex rounded-md p-0.5",
            ui.borderHairline,
            compactEmbed && "max-md:rounded-md",
          )}
          role="group"
          aria-label="Moneda de visualización"
        >
          <button
            type="button"
            onClick={() => onCurrencyChange("clp")}
            className={joinClasses(
              touchTarget,
              "rounded-md px-3 text-xs font-bold transition",
              compactEmbed && "max-md:min-h-8 max-md:min-w-0 max-md:px-2.5",
              currency === "clp"
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface-hover",
            )}
          >
            Pesos
          </button>
          <button
            type="button"
            onClick={() => onCurrencyChange("uf")}
            className={joinClasses(
              touchTarget,
              "rounded-md px-3 text-xs font-bold transition",
              compactEmbed && "max-md:min-h-8 max-md:min-w-0 max-md:px-2.5",
              currency === "uf"
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface-hover",
            )}
          >
            UF
          </button>
        </div>

        {showPagination && pagination ? (
          <div
            className="flex min-w-0 flex-col items-start gap-1"
            role="navigation"
            aria-label="Paginación de planes"
          >
            <p className="text-[11px] font-medium text-muted">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className={joinClasses(
                  "inline-flex size-8 items-center justify-center rounded-md border bg-white text-primary-dark transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40",
                  ui.border,
                )}
                aria-label="Página anterior"
              >
                <PaginationChevron direction="prev" />
              </button>

              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex size-8 items-center justify-center text-xs font-semibold text-muted"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => pagination.onPageChange(item)}
                    aria-label={`Ir a la página ${item}`}
                    aria-current={item === pagination.page ? "page" : undefined}
                    className={joinClasses(
                      "inline-flex size-8 items-center justify-center rounded-md text-xs font-semibold tabular-nums transition",
                      item === pagination.page
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : joinClasses(
                            "border bg-white text-foreground hover:bg-primary/5",
                            ui.border,
                          ),
                    )}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className={joinClasses(
                  "inline-flex size-8 items-center justify-center rounded-md border bg-white text-primary-dark transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40",
                  ui.border,
                )}
                aria-label="Página siguiente"
              >
                <PaginationChevron direction="next" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
