# Arquitectura Cotizador Premium

Migración de **cotizador-virtual** → **cotizador-premium** (`cotizadorpremium.cl`) hacia un modelo **multitenant** por agente/socio, preservando intacta la lógica de precios Isapre.

## Dominios y vistas

| Vista | Ruta | Audiencia | Descripción |
|-------|------|-----------|-------------|
| Landing | `/` | Público | Plataforma, socios y acceso ejecutivos |
| Cotizador | `/cotizador?agent=<key>` | Usuario final | Cotización con branding del agente |
| Widget embed | iframe → `/cotizador?agent=<key>&embed=1` | Sitios socios | Vista previa; acciones redirigen al cotizador completo |
| Ejecutivos | `/cotizador/ejecutivos/*` | Asesores autenticados | Panel de planes y envío de cotizaciones |
| Admin | `/cotizador/admin/*` | Staff interno | Planes, clínicas, coberturas y métricas |

Rutas legacy **sin eliminar** (compatibilidad):

- `/{slug}` — cotizador white-label por slug (ej. `/cotizaloantes`)
- `?entidad=` — alias de `?agent=` (redirige a `/cotizador`)

## Modelo multitenant (conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│                    cotizadorpremium.cl                       │
├──────────────┬──────────────────────────────────────────────┤
│  / (Landing) │  /cotizador?agent=KEY  ← branding dinámico   │
├──────────────┴──────────────────────────────────────────────┤
│  PartnerEntity (tenant de marca)                             │
│  - slug, embedKey (API Key pública del widget)               │
│  - theme (CSS vars), logoUrl, whatsapp, websiteUrl         │
├─────────────────────────────────────────────────────────────┤
│  Datos globales compartidos (sin aislamiento por tenant)     │
│  - Isapres, Planes, Clínicas, Coberturas, UF, factores 604  │
├─────────────────────────────────────────────────────────────┤
│  Quote (cotización) — partnerEntitySlug para métricas        │
├─────────────────────────────────────────────────────────────┤
│  ExecutiveAccount / AdminAccount — auth por realm            │
└─────────────────────────────────────────────────────────────┘
```

**Importante:** el tenant actual es de **marca/visual**, no de datos aislados. Todos los agentes comparten el mismo catálogo y motor de precios (`src/domain/`, `plan-final-price.ts`, tablas de factores). Esto evita duplicar cálculos y mantiene una sola fuente de verdad.

## Estructura de carpetas recomendada

```
cotizador-premium/                    # renombrar carpeta cuando migres el repo
├── docs/
│   ├── ARCHITECTURE-COTIZADOR-PREMIUM.md
│   └── WIDGET-INTEGRATION.md
├── prisma/
│   └── schema.prisma                 # PartnerEntity.embedKey
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing
│   │   ├── cotizador/
│   │   │   ├── page.tsx              # Cotizador público (/cotizador)
│   │   │   ├── admin/                # Panel admin (existente)
│   │   │   └── ejecutivos/           # Panel ejecutivos (existente)
│   │   ├── [partnerSlug]/page.tsx    # Legacy white-label
│   │   ├── embed/                    # Rutas iframe alternativas
│   │   └── api/
│   │       ├── agents/[embedKey]/    # Lookup público por API Key
│   │       └── partner-entities/     # Lookup por slug (existente)
│   ├── components/
│   │   ├── platform/                 # Landing, marketing
│   │   └── cotizador/                # UI cotizador (sin cambios de pricing)
│   ├── domain/                       # ⚠️ NO MODIFICAR lógica de precios
│   ├── lib/
│   │   ├── platform/                 # URLs, routing premium vs legacy
│   │   ├── partner-entity/           # Resolución agent key → tenant
│   │   └── deep-link/                # URLs de salida del widget
│   └── hooks/
└── cotizadorWidget/                  # Repo/proyecto separado (loader JS)
```

## Resolución del agente (agent key)

Orden de prioridad en `/cotizador`:

1. Query `?agent=<embedKey|slug>`
2. Query legacy `?entidad=<slug>`
3. Cookie `ci_partner_entity`
4. `DEFAULT_PARTNER_ENTITY_SLUG` (env)

La función `readPartnerEntityByAgentKey()` busca primero por `embedKey` en BD, luego por `slug`, y finalmente en fallbacks locales.

## Routing premium vs legacy

Controlado por `NEXT_PUBLIC_COTIZADOR_ROUTING` o detección automática del dominio:

| Modo | URL de cotización | Salida del widget |
|------|-------------------|-------------------|
| `premium` (default en cotizadorpremium.cl) | `/cotizador?agent=...` | `https://cotizadorpremium.cl/cotizador?agent=...` |
| `legacy` (cotizador.cotizaloantes.cl) | `/{slug}?entidad=...` | URL anterior por slug |

## Widget embebible

Flujo:

1. Socio inserta `<script src=".../cotizador-widget.js">` + contenedor con `data-agent-key`.
2. El iframe carga `/cotizador?agent=KEY&embed=1` (máx. 4 planes en embed).
3. "Cotizar" / "Ver todos" → `navigateTopLevel()` a `/cotizador?agent=KEY&...` con criterios preservados.

Ver [WIDGET-INTEGRATION.md](./WIDGET-INTEGRATION.md).

## Paneles staff (estado actual y roadmap)

### Ejecutivos (`/cotizador/ejecutivos`)

**Hoy:** login, listado de planes, filtros (auth realm `executive`).

**Fase 3 (pendiente):**

- Bandeja de cotizaciones recibidas (`Quote`)
- Envío por email (Resend, ya usado en cotizaciones públicas)
- Envío por WhatsApp (link wa.me o API Business)

### Admin (`/cotizador/admin`)

**Hoy:** CRUD planes, clínicas, coberturas, gestión básica.

**Fase 2–3 (pendiente):**

- CRUD de agentes/socios (`PartnerEntity` + `embedKey`)
- Dashboard de métricas: cotizaciones por agente, conversión, volumen por isapre

## Variables de entorno

```env
NEXT_PUBLIC_APP_URL=https://cotizadorpremium.cl
APP_BASE_URL=https://cotizadorpremium.cl
NEXT_PUBLIC_COTIZADOR_ROUTING=premium   # o legacy
DEFAULT_PARTNER_ENTITY_SLUG=cotizaloantes
EMBED_FRAME_ANCESTORS=https://cotizaloantes.cl https://desdetu7.cl ...
```

## Plan de refactorización por fases

### Fase 1 — Fundamentos (implementada en este branch)

- [x] Landing en `/`, cotizador en `/cotizador`
- [x] Parámetro `?agent=` + campo `embedKey` en BD
- [x] Salidas del widget hacia cotizadorpremium.cl
- [x] Documentación widget para socios

### Fase 2 — Multitenant operativo

- [ ] Admin UI: alta/edición de agentes y generación de `embedKey`
- [ ] Métricas globales en dashboard admin
- [ ] Asociar ejecutivos a agentes (opcional)

### Fase 3 — Productividad ejecutivos

- [ ] Inbox de cotizaciones en panel ejecutivo
- [ ] Botones "Enviar por email" / "Enviar por WhatsApp" desde el dashboard

### Fase 4 — Renombrado y deploy

- [ ] Renombrar carpeta/repo a `cotizador-premium`
- [ ] DNS `cotizadorpremium.cl` → Vercel
- [ ] Actualizar socios (desdetu7, cotizaloantes, isaprepremium) con nuevo script y agent keys
- [ ] Deprecar gradualmente `cotizador.cotizaloantes.cl` como dominio principal

## Qué NO tocar

- `src/domain/**` — cálculos de beneficiarios y factores
- `src/lib/plan-final-price.ts`, `risk-factor-table-604.ts`
- Importadores de planes y seed de isapres/planes/clínicas
- Lógica de `CoverageEntry` y filtros de cobertura

## Renombrado del proyecto

El nombre del paquete npm pasa a `cotizador-premium`. El renombrado físico de la carpeta puede hacerse cuando configures el nuevo repositorio:

```bash
mv cotizador-virtual cotizador-premium
# Actualizar remote de Git y proyecto en Vercel
```
