"use client";

import { formatPlanClp, formatQuotedUf } from "@/domain";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { PlanAgreementPriceDisplay } from "@/lib/company-agreements/plan-price-discount";

export function formatAgreementDiscountBadge(percent: number): string {
  const formatted = Number.isInteger(percent)
    ? String(percent)
    : percent.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `−${formatted}%`;
}

interface PublicPlanAgreementPricesProps {
  prices: PlanAgreementPriceDisplay;
  currency: "uf" | "clp";
}

/** Precios "Desde" para la tarjeta pública / widget. */
export function PublicPlanAgreementPrices({
  prices,
  currency,
}: PublicPlanAgreementPricesProps) {
  const ufPrimary = currency === "uf";
  const clpPrimary = currency === "clp";
  const discounted = prices.hasAgreementDiscount;

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      {discounted ? (
        <span className="inline-flex w-fit items-center rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:ml-auto">
          {formatAgreementDiscountBadge(prices.discountPercent)} convenio
        </span>
      ) : null}

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-medium text-muted">
            {discounted ? "Total con convenio" : "Desde"}
          </p>
          {discounted ? (
            <p className="text-[10px] tabular-nums text-muted line-through">
              {formatQuotedUf(prices.listFinalPriceUf)}
            </p>
          ) : null}
          <p
            className={joinClasses(
              "font-bold tabular-nums",
              discounted ? "text-red-700" : "text-primary-dark",
              ufPrimary
                ? "text-base sm:text-lg"
                : "text-sm text-primary-dark/75 sm:text-base",
              discounted && !ufPrimary && "text-red-700/80",
            )}
          >
            {formatQuotedUf(prices.displayFinalPriceUf)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-medium text-muted">
            {discounted ? "Total / mes" : "Desde"}
          </p>
          {discounted ? (
            <p className="text-[10px] tabular-nums text-muted line-through">
              {formatPlanClp(prices.listFinalPriceClp)}
            </p>
          ) : null}
          <p
            className={joinClasses(
              "font-bold tabular-nums",
              discounted ? "text-red-700" : "text-primary-dark",
              clpPrimary
                ? "text-base sm:text-lg"
                : "text-sm text-primary-dark/75 sm:text-base",
              discounted && !clpPrimary && "text-red-700/80",
            )}
          >
            {formatPlanClp(prices.displayFinalPriceClp)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ExecutivePlanAgreementPricesProps {
  prices: PlanAgreementPriceDisplay;
}

/** Precios hero para la tarjeta del cotizador ejecutivo. */
export function ExecutivePlanAgreementPrices({
  prices,
}: ExecutivePlanAgreementPricesProps) {
  const discounted = prices.hasAgreementDiscount;

  return (
    <div
      className={joinClasses(
        "flex shrink-0 flex-col border-t pt-4 sm:min-w-[11rem]",
        "lg:border-t-0 lg:items-end lg:pt-0 lg:text-right",
        ui.border,
      )}
    >
      <div className="flex items-center gap-2 lg:justify-end">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-dark/70">
          {discounted ? "Total con convenio" : "Desde"}
        </p>
        {discounted ? (
          <span className="inline-flex items-center rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {formatAgreementDiscountBadge(prices.discountPercent)} convenio
          </span>
        ) : null}
      </div>

      {discounted ? (
        <p className="mt-1 text-sm tabular-nums text-muted line-through">
          {formatQuotedUf(prices.listFinalPriceUf)}
        </p>
      ) : null}

      <p
        className={joinClasses(
          "mt-0.5 text-[1.75rem] font-extrabold leading-none tabular-nums tracking-tight sm:text-3xl",
          discounted ? "text-red-700" : "text-primary-dark",
        )}
      >
        {formatQuotedUf(prices.displayFinalPriceUf)}
      </p>

      {discounted ? (
        <p className="mt-1 text-xs tabular-nums text-muted line-through">
          {formatPlanClp(prices.listFinalPriceClp)} / mes
        </p>
      ) : null}

      <p
        className={joinClasses(
          "mt-2 text-sm font-semibold tabular-nums",
          discounted ? "text-red-700" : "text-primary-dark/80",
        )}
      >
        {formatPlanClp(prices.displayFinalPriceClp)}{" "}
        <span
          className={joinClasses(
            "font-normal",
            discounted ? "text-red-700/75" : "text-primary-dark/55",
          )}
        >
          / mes
        </span>
      </p>
    </div>
  );
}
