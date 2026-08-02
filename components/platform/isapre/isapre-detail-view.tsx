import Image from "next/image";
import Link from "next/link";
import { LandingFloatingSocial } from "@/components/platform/landing/landing-floating-social";
import { LandingFooter } from "@/components/platform/landing/landing-footer";
import { LandingLogo } from "@/components/platform/landing/landing-logo";
import { landing } from "@/components/platform/landing/landing-tokens";
import {
  buildIsapreCotizadorUrl,
  buildIsaprePlanCotizadorUrl,
  buildIsapresIndexUrl,
} from "@/lib/isapre-pages/urls";
import type { IsaprePageData } from "@/lib/isapre-pages/types";
import "@/components/platform/landing/landing.css";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
      <path
        d="M4 10h12M11 5l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-accent-success" aria-hidden>
      <path
        d="M5 10l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatUf(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number, suffix = ""): string {
  if (value <= 0) return "—";
  return `${value.toLocaleString("es-CL")}${suffix}`;
}

function badgeLabel(badge?: "economico" | "premium"): string | null {
  if (badge === "economico") return "Más económico";
  if (badge === "premium") return "Premium";
  return null;
}

export function IsapreDetailView({ data }: { data: IsaprePageData }) {
  const { content, stats, gesUf } = data;
  const cotizadorHref = buildIsapreCotizadorUrl(content.id);

  return (
    <div data-landing data-brand="premium" className={landing.pageRoot}>
      <header className={`${landing.header} landing-header-over-backdrop`}>
        <div className={landing.headerInner}>
          <Link href="/inicio" className="flex items-center gap-3">
            <LandingLogo size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                Cotizador Premium
              </p>
              <p className="text-xs text-muted">Planes Isapre en Chile</p>
            </div>
          </Link>
          <Link href={cotizadorHref} className={landing.navCta}>
            Cotizar
          </Link>
        </div>
      </header>

      <main id="contenido-principal" className="landing-isapre-page">
        <section className="landing-isapre-page-hero relative overflow-hidden border-b border-border/60">
          <div className="landing-grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className={`${landing.container} relative py-10 sm:py-14 lg:py-16`}>
            <Link
              href={buildIsapresIndexUrl()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary-hover"
            >
              <span aria-hidden>‹</span>
              Volver a todas las Isapres
            </Link>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  {content.badge}
                </p>
                <h1 className="landing-text-gradient mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                  Planes{" "}
                  <span className="landing-text-gradient">{content.name}</span>
                </h1>
                <p className="mt-4 text-xl font-bold text-primary-dark sm:text-2xl">
                  {content.tagline}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed premium-text-secondary sm:text-lg">
                  {content.heroDescription}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={cotizadorHref} className={landing.ctaPrimary}>
                    Cotizar {content.name} gratis
                    <ArrowIcon />
                  </Link>
                  <a
                    href={content.officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={landing.ctaSecondary}
                  >
                    Sitio oficial
                  </a>
                </div>
              </div>

              <aside className="landing-glass-panel-strong rounded-[1.75rem] p-6 shadow-card sm:p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-16 w-40 sm:h-20 sm:w-48">
                    <Image
                      src={content.logoSrc}
                      alt={`Logo ${content.name}`}
                      fill
                      className="object-contain"
                      sizes="192px"
                      priority
                    />
                  </div>
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-bg-layout/80 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Desde
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-primary-dark">
                      {stats.minPriceUf !== null ? `${formatUf(stats.minPriceUf)} UF` : "Consultar"}
                    </dd>
                    <dd className="text-[11px] text-muted">precio base mín.</dd>
                  </div>
                  <div className="rounded-2xl bg-bg-layout/80 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Planes
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-primary-dark">
                      {stats.planCount > 0 ? `${formatCount(stats.planCount)}+` : "Próximamente"}
                    </dd>
                    <dd className="text-[11px] text-muted">en catálogo</dd>
                  </div>
                  <div className="rounded-2xl bg-bg-layout/80 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Hospitalario
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-primary-dark">
                      {stats.avgHospitalPct !== null ? `${stats.avgHospitalPct}%` : "—"}
                    </dd>
                    <dd className="text-[11px] text-muted">cobertura prom.</dd>
                  </div>
                  <div className="rounded-2xl bg-bg-layout/80 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Prestadores
                    </dt>
                    <dd className="mt-1 text-2xl font-bold text-primary-dark">
                      {stats.providerCount > 0
                        ? `${formatCount(stats.providerCount)}+`
                        : "—"}
                    </dd>
                    <dd className="text-[11px] text-muted">en convenio</dd>
                  </div>
                </dl>
                <p className="mt-4 text-center text-[11px] text-muted">
                  GES referencial: {gesUf.toFixed(3)} UF · Valores del catálogo Cotizador Premium
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-white/70">
          <div className={`${landing.container} grid gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:gap-12`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Beneficios</p>
              <h2 className="mt-3 text-2xl font-bold text-primary-dark sm:text-3xl">
                ¿Por qué elegir {content.name}?
              </h2>
              <ul className="mt-6 space-y-3">
                {content.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
                    <CheckIcon />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Perfil ideal</p>
              <h2 className="mt-3 text-2xl font-bold text-primary-dark sm:text-3xl">
                ¿Para quién es {content.name}?
              </h2>
              <ul className="mt-6 space-y-3">
                {content.idealFor.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border/70 bg-bg-layout/60 px-4 py-3 text-sm leading-relaxed text-foreground/90 sm:text-base"
                  >
                    <span className="mr-2 inline-block size-2 rounded-full bg-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-bg-layout/50">
          <div className={`${landing.container} py-14 sm:py-16`}>
            <div className="grid gap-4 md:grid-cols-3">
              {content.highlights.map((item) => (
                <article
                  key={item.title}
                  className="landing-glass-panel rounded-2xl p-5 sm:p-6"
                >
                  <h3 className="text-base font-bold text-primary-dark">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed premium-text-secondary">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {stats.featuredPlans.length > 0 ? (
          <section className="border-b border-border/60 bg-white/80">
            <div className={`${landing.container} py-14 sm:py-16`}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Planes destacados
              </p>
              <h2 className="mt-3 text-2xl font-bold text-primary-dark sm:text-3xl">
                Opciones de {content.name} para comparar
              </h2>
              <p className="mt-3 max-w-3xl text-sm premium-text-secondary sm:text-base">
                Precios base referenciales del catálogo. El costo final depende de tu edad, sexo,
                ingreso y cargas familiares.
              </p>
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {stats.featuredPlans.map((plan) => {
                  const label = badgeLabel(plan.badge);
                  return (
                    <article
                      key={plan.code}
                      className="landing-glass-panel-strong flex h-full flex-col rounded-2xl p-5 sm:p-6"
                    >
                      {label ? (
                        <span className="mb-3 inline-flex w-fit rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-dark">
                          {label}
                        </span>
                      ) : (
                        <span className="mb-3 block h-6" aria-hidden />
                      )}
                      <h3 className="text-lg font-bold text-primary-dark">{plan.name}</h3>
                      <p className="mt-1 font-mono text-[11px] text-muted">{plan.code}</p>
                      <p className="mt-4 text-3xl font-bold text-primary-dark">
                        {formatUf(plan.priceUf)}{" "}
                        <span className="text-base font-semibold text-muted">UF base</span>
                      </p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed premium-text-secondary">
                        {plan.description}
                      </p>
                      <Link
                        href={buildIsaprePlanCotizadorUrl(content.id, plan.code)}
                        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-border bg-white text-sm font-semibold text-primary-dark transition hover:border-primary/30 hover:bg-primary/5"
                      >
                        Cotizar este plan
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-primary/5">
          <div className={`${landing.container} py-12 text-center sm:py-14`}>
            <h2 className="text-2xl font-bold text-primary-dark">
              ¿Listo para comparar planes {content.name}?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm premium-text-secondary sm:text-base">
              Usa el cotizador con filtros preaplicados para ver precios según tu perfil.
            </p>
            <Link href={cotizadorHref} className={`${landing.ctaPrimary} mt-6 inline-flex`}>
              Ir al cotizador
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </main>

      <LandingFloatingSocial />
      <LandingFooter />
    </div>
  );
}
