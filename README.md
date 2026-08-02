# Isapres Premium

Sitio marketing de [isaprespremium.cl](https://isaprespremium.cl) + **motor del cotizador** (`/cotizador`).

## Qué incluye

- Páginas marketing: `/`, `/empresas`, `/nosotros`, `/respaldo-legal`, `/politicas`
- Cotizador: `/cotizador?agent=…` (default `isaprespremium`)
- Widget: `/cotizador-widget.js` (iframe → `/cotizador?embed=1`)
- Paneles staff: `/cotizador/acceso`, `/cotizador/ejecutivos`, `/cotizador/admin`
- Misma base Neon/Prisma del cotizador previo en cotizadorpremium.cl
- Scripts ops / docs / storage migrados desde `cotizadorVirtual`

## Desarrollo

```bash
npm install
# Copia `.env.example` → `.env.local` y completa DATABASE_URL, AUTH_SECRET, Resend, Blob
npm run dev
```

Acceso local típico:

- Home: http://localhost:3000
- Cotizador: http://localhost:3000/cotizador?agent=isaprespremium
- Widget script: http://localhost:3000/cotizador-widget.js
- Staff: http://localhost:3000/cotizador/acceso

## Deploy (Vercel)

Configura en el proyecto de `isaprespremium.cl` las variables de `.env.example` (especialmente `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL=https://isaprespremium.cl`, `DEFAULT_PARTNER_ENTITY_SLUG=isaprespremium`).

La landing de captación permanece en **cotizadorpremium.cl** y redirige `/cotizador*`, `/api/*`, `/embed/*` y el widget hacia este host.
