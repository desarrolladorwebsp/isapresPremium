import { formatPlanClp, formatQuotedUf } from "@/lib/plan-format";
import {
  formatBeneficiaries,
  formatIncome,
  formatQuoteDate,
  normalizePhoneHref,
  resolvePartnerLabel,
  resolveRegionLabel,
  resolveSexLabel,
} from "@/lib/quote/quote-display";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { QuoteRecord } from "@/types/quote";

export function QuoteDetailGrid({ quote }: { quote: QuoteRecord }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DetailBlock label="Región" value={resolveRegionLabel(quote.region)} />
      <DetailBlock
        label="Perfil"
        value={[
          resolveSexLabel(quote.sex),
          quote.contributorAge != null ? `${quote.contributorAge} años` : null,
          formatIncome(quote.monthlyIncome),
          formatBeneficiaries(quote),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <DetailBlock label="Motivo" value={quote.quoteReason ?? "—"} />
      <DetailBlock label="Notas" value={quote.notes ?? "—"} />
      <DetailBlock
        label="Preferencia de contacto"
        value={quote.contactPreference ?? "—"}
      />
      <DetailBlock
        label="Factores de riesgo"
        value={quote.totalFactors != null ? String(quote.totalFactors) : "—"}
      />
      <DetailBlock
        label="Valor UF al cotizar"
        value={quote.ufValue != null ? formatPlanClp(quote.ufValue) : "—"}
      />
      <DetailBlock label="Origen" value={resolvePartnerLabel(quote)} />
      <DetailBlock label="ID solicitud" value={quote.id} mono />
    </div>
  );
}

export function QuoteContactCard({ quote }: { quote: QuoteRecord }) {
  return (
    <div className={joinClasses("rounded-xl border bg-white p-4 shadow-sm", ui.border)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Contacto
      </p>
      <p className="mt-2 text-lg font-bold text-primary-dark">{quote.fullName}</p>
      <p className="mt-1 text-sm text-muted">RUT: {quote.rut?.trim() || "—"}</p>
      <a
        href={`mailto:${quote.email}`}
        className="mt-3 block text-sm font-semibold text-primary underline-offset-2 hover:underline"
      >
        {quote.email}
      </a>
      <a
        href={`tel:${normalizePhoneHref(quote.phone)}`}
        className="mt-1 block text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        {quote.phone}
      </a>
    </div>
  );
}

export function QuotePlanCard({ quote }: { quote: QuoteRecord }) {
  return (
    <div className={joinClasses("rounded-xl border bg-white p-4 shadow-sm", ui.border)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Plan solicitado
      </p>
      {quote.planIsapre ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {quote.planIsapre}
        </p>
      ) : null}
      <p className="mt-1 font-bold text-foreground">
        {quote.planName ?? "Sin plan específico"}
      </p>
      {quote.planCode ? (
        <p className="mt-1 font-mono text-xs text-muted">{quote.planCode}</p>
      ) : null}
      {quote.finalPriceClp != null ? (
        <div className="mt-3">
          <p className="text-lg font-bold tabular-nums text-primary-dark">
            {formatPlanClp(quote.finalPriceClp)}
          </p>
          {quote.finalPriceUf != null ? (
            <p className="text-xs tabular-nums text-muted">
              {formatQuotedUf(quote.finalPriceUf)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function QuoteDatesCard({
  quote,
  lastActivityAt,
}: {
  quote: QuoteRecord;
  lastActivityAt?: string | null;
}) {
  return (
    <div className={joinClasses("rounded-xl border bg-white p-4 shadow-sm", ui.border)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Fechas clave
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Creación</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatQuoteDate(quote.createdAt)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Última gestión</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {lastActivityAt ? formatQuoteDate(lastActivityAt) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Última actualización</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatQuoteDate(quote.updatedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={joinClasses(
          "mt-1 text-sm text-foreground",
          mono ? "break-all font-mono text-xs" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}
