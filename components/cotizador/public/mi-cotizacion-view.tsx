"use client";

import { PartnerEntityProvider } from "@/components/partner/partner-entity-provider";
import { formatConvenioDiscountLabel } from "@/lib/company-agreements/cotizacion-notify-convenio";
import { COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER } from "@/lib/company-agreements/constants";
import type { MiCotizacionSnapshot } from "@/lib/cotizacion-notify/mi-cotizacion-share";
import { AGENT_QUERY_PARAM } from "@/lib/partner-entity/constants";
import { buildWhatsAppUrl } from "@/lib/partner-entity/theme";
import { PREMIUM_COTIZADOR_PATH } from "@/lib/platform/routing";
import { safeWidth, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { PartnerEntityPublic } from "@/types/partner-entity";

export interface MiCotizacionViewProps {
  entity: PartnerEntityPublic | null;
  snapshot: MiCotizacionSnapshot | null;
}

function formatIncome(raw: string | undefined): string {
  if (!raw?.trim()) return "—";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw.trim();
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

function formatDependents(cargas: number[] | undefined): string {
  if (!cargas?.length) return "Sin asegurados adicionales";
  if (cargas.length === 1) return `1 asegurado adicional (${cargas[0]} años)`;
  return `${cargas.length} asegurados adicionales (${cargas.join(" y ")} años)`;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-b border-border/80 py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function linkButtonClass(variant: "primary" | "secondary" = "primary"): string {
  return joinClasses(
    "inline-flex h-10 min-w-[12rem] items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
    variant === "primary"
      ? joinClasses(
          ui.cta,
          "shadow-[0_6px_20px_-6px_var(--primary)] hover:shadow-[0_8px_24px_-4px_var(--primary)]",
        )
      : "bg-secondary text-white hover:brightness-110",
  );
}

function MiCotizacionContent({
  entity,
  snapshot,
}: {
  entity: PartnerEntityPublic | null;
  snapshot: MiCotizacionSnapshot;
}) {
  const brandName =
    entity?.name ?? snapshot.partnerEntityName ?? "Cotizador Premium";
  const clientName = snapshot.solicitante?.nombre ?? "Cotizante";
  const whatsappUrl = entity?.whatsappNumber
    ? buildWhatsAppUrl(
        entity.whatsappNumber,
        entity.whatsappMessage ??
          `Hola, revisé mi cotización en ${brandName} y quiero continuar.`,
      )
    : null;
  const continueHref = entity?.slug
    ? `${PREMIUM_COTIZADOR_PATH}?${AGENT_QUERY_PARAM}=${encodeURIComponent(entity.slug)}`
    : PREMIUM_COTIZADOR_PATH;

  return (
    <div className="min-h-dvh bg-bg-layout text-foreground">
      <header className="border-b border-border bg-white">
        <div
          className={joinClasses(
            safeWidth,
            "mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6",
          )}
        >
          {entity?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entity.logoUrl}
              alt={brandName}
              className="h-10 w-auto max-w-[10rem] object-contain"
            />
          ) : (
            <p className="text-lg font-bold text-primary-dark">{brandName}</p>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary-dark">{brandName}</p>
            <p className="text-xs text-muted">Resumen de tu cotización</p>
          </div>
        </div>
      </header>

      <main
        className={joinClasses(
          safeWidth,
          "mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8",
        )}
      >
        <section className={joinClasses(ui.surfaceCard, "space-y-2 p-5")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Hola, {clientName}
          </p>
          <h1 className="text-2xl font-bold text-primary-dark sm:text-3xl">
            Tu cotización
          </h1>
          <p className="text-sm text-muted">
            Estos son los datos que registramos cuando solicitaste asesoría con{" "}
            {brandName}.
          </p>
        </section>

        <section className={joinClasses(ui.surfaceCard, "p-5")}>
          <h2 className="mb-1 text-sm font-bold text-primary-dark">
            Tus datos
          </h2>
          <dl>
            <DetailRow label="Nombre" value={clientName} />
            <DetailRow label="Correo" value={snapshot.email} />
            {snapshot.solicitante?.rut ? (
              <DetailRow label="RUT" value={snapshot.solicitante.rut} />
            ) : null}
            {snapshot.solicitante?.telefono ? (
              <DetailRow
                label="Teléfono"
                value={snapshot.solicitante.telefono}
              />
            ) : null}
            <DetailRow label="Región" value={snapshot.region} />
            <DetailRow label="Edad" value={`${snapshot.edad} años`} />
            {snapshot.sexo ? (
              <DetailRow label="Sexo" value={snapshot.sexo} />
            ) : null}
            <DetailRow label="Ingreso" value={formatIncome(snapshot.ingreso)} />
            <DetailRow
              label="Cargas"
              value={formatDependents(snapshot.cargas)}
            />
          </dl>
        </section>

        {snapshot.plan ? (
          <section className={joinClasses(ui.surfaceCard, "p-5")}>
            <h2 className="mb-1 text-sm font-bold text-primary-dark">
              Plan seleccionado
            </h2>
            <dl>
              <DetailRow label="Isapre" value={snapshot.plan.isapre} />
              <DetailRow label="Plan" value={snapshot.plan.nombre} />
              <DetailRow label="Código" value={snapshot.plan.codigo} />
              {snapshot.plan.tipoPlan ? (
                <DetailRow label="Tipo" value={snapshot.plan.tipoPlan} />
              ) : null}
              {snapshot.plan.descuentoConvenioPercent != null &&
              snapshot.plan.precioConConvenioUf ? (
                <>
                  <DetailRow
                    label="Precio lista"
                    value={`${snapshot.plan.precioListaUf ?? "—"} · ${snapshot.plan.precioListaClp ?? ""}`}
                  />
                  <DetailRow
                    label={`Con convenio (−${snapshot.plan.descuentoConvenioPercent}%)`}
                    value={`${snapshot.plan.precioConConvenioUf} · ${snapshot.plan.precioConConvenioClp ?? ""}`}
                  />
                </>
              ) : (
                <DetailRow
                  label="Precio referencial"
                  value={`${snapshot.plan.precioUf} · ${snapshot.plan.precioClp}`}
                />
              )}
              {snapshot.plan.coberturaHospitalaria != null ? (
                <DetailRow
                  label="Cob. hospitalaria"
                  value={`${snapshot.plan.coberturaHospitalaria}%`}
                />
              ) : null}
              {snapshot.plan.coberturaAmbulatoria != null ? (
                <DetailRow
                  label="Cob. ambulatoria"
                  value={`${snapshot.plan.coberturaAmbulatoria}%`}
                />
              ) : null}
              {snapshot.plan.clinicas != null ? (
                <DetailRow
                  label="Clínicas"
                  value={String(snapshot.plan.clinicas)}
                />
              ) : null}
            </dl>
          </section>
        ) : (
          <section className={joinClasses(ui.surfaceCard, "space-y-2 p-5")}>
            <h2 className="text-sm font-bold text-primary-dark">
              Búsqueda de planes
            </h2>
            <p className="text-sm text-muted">
              Registramos tu búsqueda con los criterios de arriba
              {snapshot.orden ? ` · orden: ${snapshot.orden}` : ""}. Un ejecutivo
              te contactará para ayudarte a elegir el plan.
            </p>
          </section>
        )}

        {snapshot.convenioEmpresa ? (
          <section className={joinClasses(ui.surfaceCard, "space-y-2 p-5")}>
            <h2 className="text-sm font-bold text-primary-dark">
              Convenio empresa
            </h2>
            <dl>
              <DetailRow
                label="Empresa"
                value={snapshot.convenioEmpresa.nombreEmpresa}
              />
              <DetailRow
                label="RUT"
                value={snapshot.convenioEmpresa.rutEmpresa}
              />
              <DetailRow
                label="Descuento"
                value={formatConvenioDiscountLabel(
                  snapshot.convenioEmpresa.descuentoPercent,
                )}
              />
            </dl>
            <p className="text-xs text-muted">
              {COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER}
            </p>
          </section>
        ) : null}

        <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={continueHref} className={linkButtonClass("primary")}>
            Seguir cotizando
          </a>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkButtonClass("secondary")}
            >
              Escribir por WhatsApp
            </a>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function MiCotizacionInvalid({
  entity,
}: {
  entity: PartnerEntityPublic | null;
}) {
  const brandName = entity?.name ?? "Cotizador Premium";
  const continueHref = entity?.slug
    ? `${PREMIUM_COTIZADOR_PATH}?${AGENT_QUERY_PARAM}=${encodeURIComponent(entity.slug)}`
    : PREMIUM_COTIZADOR_PATH;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-layout px-4">
      <div
        className={joinClasses(
          ui.surfaceCard,
          "max-w-md space-y-4 p-6 text-center",
        )}
      >
        <h1 className="text-xl font-bold text-primary-dark">
          No encontramos tu cotización
        </h1>
        <p className="text-sm text-muted">
          El enlace puede estar incompleto o haber expirado. Vuelve a cotizar
          con {brandName}.
        </p>
        <a href={continueHref} className={linkButtonClass("primary")}>
          Ir al cotizador
        </a>
      </div>
    </div>
  );
}

export function MiCotizacionView({ entity, snapshot }: MiCotizacionViewProps) {
  return (
    <PartnerEntityProvider entity={entity}>
      {snapshot ? (
        <MiCotizacionContent entity={entity} snapshot={snapshot} />
      ) : (
        <MiCotizacionInvalid entity={entity} />
      )}
    </PartnerEntityProvider>
  );
}
