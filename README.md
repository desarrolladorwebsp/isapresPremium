# Isapres Premium

Sitio marketing de [isaprespremium.cl](https://isaprespremium.cl) + **motor del cotizador** (`/cotizador`).

## Qué incluye

- Páginas marketing: `/`, `/empresas`, `/nosotros`, `/respaldo-legal`, `/politicas`
- Cotizador: `/cotizador?agent=…` (default `isaprespremium`)
- Widget: `/cotizador-widget.js` (iframe → `/cotizador?embed=1`)
- Paneles staff: `/cotizador/acceso`, `/cotizador/ejecutivos`, `/cotizador/admin`
- Misma base Neon/Prisma del cotizador previo en cotizadorpremium.cl
- Scripts ops / docs / storage (antes en `cotizadorVirtual`, ahora `cotizadorPremium`)

## Desarrollo

Node 20–22 (`.nvmrc`). En local `npm run dev` usa webpack.

```bash
npm install
# Copia `.env.example` → `.env.local` y completa DATABASE_URL_DEV, AUTH_SECRET, Resend, Blob
npm run dev
```

Local usa Neon DEV (`DATABASE_URL_DEV`). Producción (Vercel `VERCEL_ENV=production`) usa `DATABASE_URL_PROD` o, si aún no existe, `DATABASE_URL`. Seed, `db push` y migraciones experimentales van a DEV; una escritura a PROD exige `APP_ENV=production` y `CONFIRM_PRODUCTION_DB=1`.

Acceso local típico:

- Home: http://localhost:3000
- Cotizador: http://localhost:3000/cotizador?agent=isaprespremium
- Widget script: http://localhost:3000/cotizador-widget.js
- Staff: http://localhost:3000/cotizador/acceso

## Deploy (Vercel)

Configura en el proyecto de `isaprespremium.cl` las variables de `.env.example` (especialmente `DATABASE_URL` o `DATABASE_URL_PROD`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL=https://isaprespremium.cl`, `DEFAULT_PARTNER_ENTITY_SLUG=isaprespremium`). En Vercel production puedes añadir `DATABASE_URL_PROD` / `DIRECT_URL_PROD` sin quitar `DATABASE_URL` (compatibilidad).

La landing de captación permanece en **cotizadorpremium.cl** (`cotizadorPremium/`) y redirige `/cotizador*`, `/api/*`, `/embed/*` y el widget hacia este host.

## Documentación (para humanos e IAs)

| Doc | Contenido |
|-----|-----------|
| [docs/PUBLIC-API-LEADS-CLIENTS.md](./docs/PUBLIC-API-LEADS-CLIENTS.md) | **Registrar leads como clientes** — endpoint público, auth, ejemplos, seguridad |
| [docs/WIDGET-INTEGRATION.md](./docs/WIDGET-INTEGRATION.md) | Widget embed |
| [docs/ROLES-AND-PERMISSIONS.md](./docs/ROLES-AND-PERMISSIONS.md) | Roles staff |
| [docs/ARCHITECTURE-COTIZADOR-PREMIUM.md](./docs/ARCHITECTURE-COTIZADOR-PREMIUM.md) | Arquitectura multitenant (contexto histórico) |

Autodocs runtime (requiere `PUBLIC_API_SECRET`): `GET /api/public/v1/docs`.

