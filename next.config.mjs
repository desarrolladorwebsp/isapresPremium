/** Orígenes permitidos para iframe embebido (CSP frame-ancestors). */
const DEFAULT_TRUSTED_PARTNER_ORIGINS = [
  "https://cotizadorpremium.cl",
  "https://www.cotizadorpremium.cl",
  "https://cotizador.cotizaloantes.cl",
  "https://cotizaloantes.cl",
  "https://www.cotizaloantes.cl",
  "https://desdetu7.cl",
  "https://www.desdetu7.cl",
  "https://isaprepremium.cl",
  "https://www.isaprepremium.cl",
  "https://isaprespremium.cl",
  "https://www.isaprespremium.cl",
];

const PROD_APP_ORIGIN = "https://isaprespremium.cl";
const DEV_APP_ORIGIN = "http://localhost:3000";

function normalizeFrameOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "'self'" || trimmed === "self") {
    return "'self'";
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

function resolveEmbedFrameAncestorsDirective() {
  const configured = process.env.EMBED_FRAME_ANCESTORS?.trim();
  if (configured === "*") return "frame-ancestors *";
  if (configured) return `frame-ancestors ${configured}`;

  const values = new Set(["'self'"]);
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
  const configuredOrigin = fromEnv ? normalizeFrameOrigin(fromEnv) : null;
  if (configuredOrigin && configuredOrigin !== "'self'") {
    values.add(configuredOrigin);
  }

  values.add(PROD_APP_ORIGIN);
  values.add("https://www.isaprespremium.cl");
  values.add("https://cotizadorpremium.cl");
  values.add("https://www.cotizadorpremium.cl");

  for (const website of DEFAULT_TRUSTED_PARTNER_ORIGINS) {
    const origin = normalizeFrameOrigin(website);
    if (origin && origin !== "'self'") values.add(origin);
  }

  if (process.env.NODE_ENV === "development") {
    for (const origin of [
      DEV_APP_ORIGIN,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ]) {
      values.add(origin);
    }
  }

  return `frame-ancestors ${[...values].join(" ")}`;
}

const embedFrameAncestors = resolveEmbedFrameAncestorsDirective();

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./public/logo-isapres-premium.png",
      "./public/images/logo-isapres-premium.png",
    ],
  },
  async headers() {
    return [
      {
        source: "/cotizador",
        headers: [
          {
            key: "Content-Security-Policy",
            value: embedFrameAncestors,
          },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: embedFrameAncestors,
          },
        ],
      },
      {
        source: "/cotizador-widget.js",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
