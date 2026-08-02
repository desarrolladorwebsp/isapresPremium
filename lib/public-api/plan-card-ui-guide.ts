import { COTIZALO_ANTES_THEME } from "@/lib/partner-entity/fallback-entities";
import { PUBLIC_API_VERSION } from "@/lib/public-api/constants";

export type PlanCardUiBrand = "default" | "cotizalo-antes";

const DEFAULT_THEME = {
  primary: "#00b159",
  primaryHover: "#00c966",
  primaryDark: "#004d26",
  primaryForeground: "#ffffff",
  secondary: "#0070f3",
  secondaryMuted: "#e8f2ff",
  bgLayout: "#f4f7f6",
  foreground: "#0f1f17",
  muted: "#5c6f66",
  border: "#dce6e2",
  surfaceHover: "#eef4f2",
  accentWarning: "#ffb703",
  accentDanger: "#e63946",
  shadowCard:
    "0 4px 24px -8px rgb(0 77 38 / 0.08)",
  shadowCardHover:
    "0 12px 32px -10px rgb(0 177 89 / 0.22)",
  shadowCta:
    "0 8px 24px -8px rgb(0 177 89 / 0.45)",
  shadowPlanCard:
    "0 1px 2px rgb(0 0 0 / 0.05), 0 2px 8px -2px rgb(0 77 38 / 0.07), 0 10px 28px -8px rgb(0 77 38 / 0.11)",
  shadowPlanCardHover:
    "0 0 0 1px var(--primary), 0 4px 14px -4px rgb(0 177 89 / 0.14), 0 16px 40px -10px rgb(0 177 89 / 0.2)",
  planCardSurface: "#ffffff",
  planCardHeaderBg: "color-mix(in srgb, var(--bg-layout) 26%, white)",
  planCardCoverageBg: "color-mix(in srgb, var(--bg-layout) 10%, white)",
  planCardBorder: "color-mix(in srgb, var(--border) 72%, var(--foreground) 28%)",
  planCardRing: "rgb(15 31 23 / 0.045)",
} as const;

function resolveBrandTheme(brand: PlanCardUiBrand | null) {
  if (brand === "cotizalo-antes") {
    return {
      brand_key: "cotizalo-antes",
      data_attribute: 'data-brand="cotizalo-antes"',
      colors: {
        primary: COTIZALO_ANTES_THEME.primary,
        primary_hover: COTIZALO_ANTES_THEME.primaryHover,
        primary_dark: COTIZALO_ANTES_THEME.primaryDark,
        primary_foreground: COTIZALO_ANTES_THEME.primaryForeground,
        secondary: COTIZALO_ANTES_THEME.secondary,
        secondary_muted: COTIZALO_ANTES_THEME.secondaryMuted,
        background: COTIZALO_ANTES_THEME.bgLayout,
        foreground: COTIZALO_ANTES_THEME.foreground,
        muted: COTIZALO_ANTES_THEME.muted,
        border: COTIZALO_ANTES_THEME.border,
        surface_hover: COTIZALO_ANTES_THEME.surfaceHover,
      },
      shadows: {
        card: "0 4px 24px -8px rgb(0 0 0 / 0.06)",
        card_hover: "0 12px 32px -10px rgb(0 0 0 / 0.1)",
        cta: "0 8px 24px -8px rgb(237 125 17 / 0.4)",
        plan_card:
          "0 1px 2px rgb(0 0 0 / 0.05), 0 2px 8px -2px rgb(0 0 0 / 0.06), 0 10px 28px -8px rgb(0 0 0 / 0.09)",
        plan_card_hover:
          "0 0 0 1px var(--primary), 0 4px 14px -4px rgb(237 125 17 / 0.12), 0 16px 40px -10px rgb(237 125 17 / 0.16)",
      },
      plan_card_surfaces: {
        surface: "#ffffff",
        header_bg: "color-mix(in srgb, var(--bg-layout) 14%, white)",
        coverage_bg: "#fafafa",
        border: "color-mix(in srgb, var(--border) 80%, var(--foreground) 20%)",
        ring: "rgb(0 0 0 / 0.05)",
      },
    };
  }

  return {
    brand_key: "default",
    data_attribute: null,
    colors: {
      primary: DEFAULT_THEME.primary,
      primary_hover: DEFAULT_THEME.primaryHover,
      primary_dark: DEFAULT_THEME.primaryDark,
      primary_foreground: DEFAULT_THEME.primaryForeground,
      secondary: DEFAULT_THEME.secondary,
      secondary_muted: DEFAULT_THEME.secondaryMuted,
      background: DEFAULT_THEME.bgLayout,
      foreground: DEFAULT_THEME.foreground,
      muted: DEFAULT_THEME.muted,
      border: DEFAULT_THEME.border,
      surface_hover: DEFAULT_THEME.surfaceHover,
    },
    shadows: {
      card: DEFAULT_THEME.shadowCard,
      card_hover: DEFAULT_THEME.shadowCardHover,
      cta: DEFAULT_THEME.shadowCta,
      plan_card: DEFAULT_THEME.shadowPlanCard,
      plan_card_hover: DEFAULT_THEME.shadowPlanCardHover,
    },
    plan_card_surfaces: {
      surface: DEFAULT_THEME.planCardSurface,
      header_bg: DEFAULT_THEME.planCardHeaderBg,
      coverage_bg: DEFAULT_THEME.planCardCoverageBg,
      border: DEFAULT_THEME.planCardBorder,
      ring: DEFAULT_THEME.planCardRing,
    },
  };
}

function resolveGuideUrl(request: Request): string {
  const configured = process.env.PUBLIC_API_BASE_URL?.trim();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = configured
    ? configured.replace(/\/api\/public\/v1\/?$/, "")
    : host
      ? `${protocol}://${host}`
      : "https://cotizador.cotizaloantes.cl";

  return `${origin.replace(/\/$/, "")}/api/public/${PUBLIC_API_VERSION}/ui/plan-card`;
}

export function buildPlanCardUiGuide(
  request: Request,
  brand: PlanCardUiBrand | null = "cotizalo-antes",
) {
  const theme = resolveBrandTheme(brand);
  const guideUrl = resolveGuideUrl(request);

  return {
    version: "1.1.0",
    component: "plan_card",
    title: "Guía UI — Card de plan de salud",
    description:
      "Especificación para que integradores, diseñadores y agentes de IA repliquen el mismo look & feel de las cards del cotizador oficial (PublicPlanCard). Prioriza consistencia visual sobre creatividad.",
    canonical_url: guideUrl,
    reference: {
      react_component: "PublicPlanCard",
      path: "src/components/cotizador/public/public-plan-card.tsx",
      live_example: "https://cotizador.cotizaloantes.cl/cotizaloantes",
    },
    brand: theme,
    layout: {
      structure: [
        "article.card — contenedor principal",
        "header — logo isapre + nombre + chips meta + precios + acciones",
        "body — grid 2 columnas (hospitalaria | ambulatoria)",
        "footer opcional — estado de carga de prestadores",
      ],
      card: {
        border_radius: "12px",
        border_width: "1px",
        background: "var(--plan-card-surface)",
        overflow: "hidden",
        hover_lift_px: 4,
        hover_border: "var(--primary)",
        ring_inset: "1px solid var(--plan-card-ring)",
        list_gap: "20px mobile / 24px sm+",
      },
      surfaces: {
        header: "var(--plan-card-header-bg) — tinte sutil del layout para separar metadata del cuerpo",
        coverage: "var(--plan-card-coverage-bg) — fondo ligeramente distinto al header para jerarquía interna",
        canvas: "var(--bg-layout) — el contraste card/fondo se logra con sombra + gap del listado",
      },
      header: {
        padding: "12px 16px",
        border_bottom: "1px solid var(--border)",
        desktop: "flex row, logo + info a la izquierda, precio + botones a la derecha",
        mobile: "stack vertical con precios y acciones en fila inferior",
      },
      coverage_grid: {
        columns: 2,
        breakpoint: "md",
        column_divider: "border-r en columna hospitalaria (desktop)",
      },
    },
    typography: {
      plan_name: {
        size: "12px mobile / 14px desktop",
        weight: 700,
        transform: "uppercase",
        tracking: "wide",
        color: "var(--primary-dark)",
      },
      price_label: {
        size: "10px",
        weight: 500,
        color: "var(--muted)",
        text: "Desde",
      },
      price_value: {
        size: "16px–18px destacado / 14px–16px secundario según moneda activa",
        weight: 700,
        variant_numeric: "tabular-nums",
        color: "var(--primary-dark)",
      },
      coverage_title: {
        size: "11px–12px",
        weight: 700,
        hospital_color: "var(--primary-dark) / 80% opacity",
        ambulatory_color: "var(--secondary)",
      },
      meta_chip: {
        size: "10px–11px",
        weight: 600,
      },
    },
    spacing: {
      scale: "8pt (4, 8, 12, 16, 20, 24, 32px)",
      card_padding_x: "12px mobile / 16px desktop",
      card_list_gap: "20px (gap-5) mobile / 24px (gap-6) sm+",
      chip_gap: "6px",
      action_gap: "8px",
      touch_target_min: "48px mobile / 40px desktop",
    },
    elevation: {
      purpose:
        "Separar visualmente cada plan del listado y del fondo de página sin sombras duras. Tres capas: borde tintado, ring interior y sombra multicapa.",
      rest: {
        box_shadow: "var(--shadow-plan-card)",
        border: "1px solid var(--plan-card-border)",
        ring: "inset 1px var(--plan-card-ring)",
        tailwind: "shadow-plan-card ring-1 ring-inset ring-[var(--plan-card-ring)]",
      },
      hover: {
        translate_y: "-4px",
        box_shadow: "var(--shadow-plan-card-hover)",
        border: "1px solid var(--primary)",
        motion: "spring stiffness 380 damping 30",
      },
      tokens_module: "planCard en src/lib/ui-tokens.ts",
      css_variables: [
        "--plan-card-surface",
        "--plan-card-header-bg",
        "--plan-card-coverage-bg",
        "--plan-card-border",
        "--plan-card-ring",
        "--shadow-plan-card",
        "--shadow-plan-card-hover",
      ],
    },
    shadows: {
      rest: "var(--shadow-plan-card)",
      hover: "var(--shadow-plan-card-hover)",
      legacy_card: DEFAULT_THEME.shadowCard,
      legacy_card_hover: DEFAULT_THEME.shadowCardHover,
      ...theme.shadows,
      cta: theme.shadows.cta,
    },
    badges: {
      plan_code: {
        label: "Código del plan",
        style:
          "rounded-lg border bg-surface-hover font-mono text-[10px] text-foreground/70",
      },
      base_price: {
        label: "Base UF",
        style:
          "rounded-lg border border-primary/20 bg-primary/5 text-primary-dark",
      },
      top: {
        label: "Top",
        style:
          "rounded-lg border border-primary/30 bg-primary text-primary-foreground shadow-sm",
      },
      plan_type: {
        preferred:
          "border-amber-300/60 bg-amber-50 text-amber-950",
        closed:
          "border-secondary/35 bg-secondary-muted text-secondary",
        free_choice: "border bg-white text-muted",
      },
    },
    actions: {
      shape: "rounded-full (pill)",
      height: "40px",
      padding_x: "14px",
      font_size: "12px",
      font_weight: 700,
      primary: {
        label: "Solicitar",
        background: "var(--primary)",
        color: "var(--primary-foreground)",
        icon_circle: "bg-white/20",
        shadow: "var(--shadow-cta)",
      },
      secondary: {
        label: "PDF",
        background: "#ffffff",
        border: "1px solid var(--border)",
        hover: "border-primary/35 bg-primary/5 text-primary-dark",
        disabled: "opacity-50 pointer-events-none cursor-not-allowed",
        icon_circle: "bg-primary/10 text-primary-dark",
      },
    },
    coverage_columns: {
      hospital: {
        bar_color: "var(--primary)",
        percent_color: "var(--primary-dark)",
        badge:
          "border border-primary/25 bg-primary/10 text-primary-dark",
        bar_track: "h-2 rounded-full bg-slate-200/90",
      },
      ambulatory: {
        bar_color: "var(--secondary)",
        percent_color: "var(--secondary)",
        badge:
          "border border-secondary/35 bg-secondary-muted text-secondary",
      },
      list: {
        initial_visible_clinics: 4,
        expand_label: "Ver más prestadores",
        percentage_badge_min_width: "2.5rem",
      },
      percentage_display: {
        summary_badge:
          "Muestra el % máximo de cobertura en un chip/badge junto al título de la columna (ej. 70%).",
        progress_bar:
          "Barra h-2 sobre track gris; el ancho corresponde al % máximo.",
        clinic_line_format:
          "Cada prestador: «{percentage}% {clinic_name}» con el % en bold y color de acento.",
        fallback_without_clinics:
          "Si solo hay coverage_summary de la API: texto «Coberturas 40% · 60% · 70%» usando hospital_percentages / ambulatory_percentages.",
        api_fields: {
          coverage_summary: {
            hospital_percentages: "number[] — porcentajes distintos hospitalarios",
            ambulatory_percentages: "number[] — porcentajes distintos ambulatorios",
            hospital_avg: "number — promedio hospitalario",
            ambulatory_avg: "number — promedio ambulatorio",
          },
        },
      },
    },
    price_display: {
      show_dual_currency: true,
      labels: ["Desde (UF)", "Desde (CLP)"],
      emphasize_active_currency: true,
      deemphasize_inactive: "text-primary-dark/75 text-sm",
    },
    isapre_logo: {
      frame: "rounded-lg border bg-white shadow-sm",
      sizes: {
        sm: "32×64px mobile / 36×72px desktop",
        md: "40×96px / 44×112px",
        lg: "44×112px / 56×144px",
      },
      image_fit: "object-contain object-center px-2 py-1",
    },
    interaction: {
      hover: "translateY(-4px), border primary, shadow plan-card-hover",
      motion: "spring stiffness 380 damping 30",
      active_button: "scale 0.98",
      list_stagger: "staggerChildren 0.05 en PublicPlanResultsList",
    },
    css_variables: {
      required: [
        "--primary",
        "--primary-hover",
        "--primary-dark",
        "--primary-foreground",
        "--secondary",
        "--secondary-muted",
        "--foreground",
        "--muted",
        "--border",
        "--bg-layout",
        "--surface-hover",
        "--shadow-card-hover",
        "--shadow-cta",
        "--plan-card-surface",
        "--plan-card-header-bg",
        "--plan-card-coverage-bg",
        "--plan-card-border",
        "--plan-card-ring",
        "--shadow-plan-card",
        "--shadow-plan-card-hover",
      ],
      cotizalo_antes_wrapper:
        'Aplicar data-brand="cotizalo-antes" en un ancestro para tema naranja.',
      example_root: theme.data_attribute
        ? `<div ${theme.data_attribute}>...</div>`
        : "<div>...</div>",
    },
    tailwind_mapping: {
      card: "overflow-hidden rounded-xl border bg-[var(--plan-card-surface)] shadow-plan-card ring-1 ring-inset ring-[var(--plan-card-ring)]",
      card_header: "border-b border-[var(--plan-card-border)] bg-[var(--plan-card-header-bg)]",
      card_coverage: "bg-[var(--plan-card-coverage-bg)]",
      card_list: "flex flex-col gap-5 sm:gap-6",
      section_title: "text-primary-dark",
      muted: "text-muted",
      hospital_accent: "text-primary-dark bg-primary/10 border-primary/25",
      ambulatory_accent: "text-secondary bg-secondary-muted border-secondary/35",
      primary_button: "rounded-full bg-primary text-primary-foreground font-bold",
      secondary_button:
        "rounded-full border bg-white hover:border-primary/35 hover:bg-primary/5",
    },
    do: [
      "Usar elevación plan-card (sombra multicapa + borde tintado + ring interior) para separar tarjetas del fondo.",
      "Mantener gap vertical de 20–24px entre cards en el listado.",
      "Diferenciar header (tinte layout) y cuerpo de coberturas (fondo más neutro) dentro de cada card.",
      "Mostrar logo de isapre en marco blanco con borde.",
      "Nombre del plan en MAYÚSCULAS, peso bold, color primary-dark.",
      "Chips para código, base UF, tipo de plan y badge Top.",
      "Dos columnas de cobertura: hospitalaria (verde/primary) y ambulatoria (azul/secondary).",
      "Mostrar siempre el porcentaje máximo en badge + barra de progreso + listado con «% prestador».",
      "Si la API solo entrega coverage_summary, mostrar los porcentajes como «Coberturas 40% · 60%».",
      "Botón primario pill «Solicitar» y secundario «PDF» (deshabilitado si no hay archivo).",
      "Precios con label «Desde» y números tabulares.",
      "Respetar touch targets ≥ 48px en móvil.",
    ],
    dont: [
      "No usar bordes gruesos (>1px) ni sombras duras tipo material elevation 8+.",
      "No apilar cards con gap < 16px — se pierde la separación visual.",
      "No usar fondo blanco plano en header y coberturas sin variación sutil.",
      "No mezclar más de 2 colores de acento por card (primary + secondary).",
      "No ocultar el código del plan ni la isapre.",
      "No usar tipografía script o colores neón fuera de la paleta.",
      "No cambiar el orden: header → coberturas → acciones en header.",
      "No reemplazar las columnas hospitalaria/ambulatoria por tabs sin justificación.",
    ],
    ai_instructions: [
      "Al construir o editar vistas de cotización (ej. Cotízalo Antes), consume esta guía antes de diseñar cards de planes.",
      "Replica la jerarquía visual del componente PublicPlanCard: cabecera densa con metadata, cuerpo en 2 columnas de cobertura.",
      `Para Cotízalo Antes usa brand=cotizalo-antes (${COTIZALO_ANTES_THEME.primary} primario, ${COTIZALO_ANTES_THEME.secondary} secundario).`,
      "Si implementas en HTML/CSS puro, define las CSS variables listadas en css_variables.",
      "Si implementas en Tailwind, usa tailwind_mapping y el módulo planCard de ui-tokens.ts.",
      "Define --shadow-plan-card y superficies --plan-card-* para replicar la elevación entre tarjetas.",
      "Mantén consistencia entre listados, modales y embeds: misma card, mismos chips, mismos botones pill.",
      "Los precios mostrados deben calcularse con la API de planes; esta guía solo define presentación visual.",
    ].join("\n"),
    query_params: {
      brand: {
        optional: true,
        values: ["default", "cotizalo-antes"],
        default: "cotizalo-antes",
        description:
          "Tema de color. Usa cotizalo-antes para integraciones de Cotízalo Antes.",
      },
    },
    related_endpoints: {
      plans_preview: "/api/public/v1/plans/preview",
      docs: "/api/public/v1/docs",
      cotizalo_antes_plans_proxy: "/api/cotizador/plans/preview (en cotizaloantes.cl)",
      cotizalo_antes_solicitar_proxy: "/api/cotizador/solicitar (en cotizaloantes.cl)",
    },
    cotizalo_antes_integration: {
      plans_source:
        "GET /api/cotizador/plans/preview en cotizaloantes.cl (proxy a /api/public/v1/plans/preview).",
      coverage_mapping:
        "Mapear coverage_summary.hospital_percentages y ambulatory_percentages al card. Mostrar badge con % máximo y fallback «Coberturas X% · Y%» si no hay nombres de clínicas.",
      solicitar_required_fields: [
        "region",
        "ingreso mensual líquido",
        "edad",
      ],
      solicitar_validation_message:
        "Para solicitar el plan y recibir un precio adecuado, completa región, ingreso mensual líquido y edad en la barra superior antes de pulsar Solicitar.",
    },
  } as const;
}

export function parsePlanCardUiBrand(
  value: string | null,
): PlanCardUiBrand | null {
  if (!value) return null;
  if (value === "default" || value === "cotizalo-antes") return value;
  return null;
}
