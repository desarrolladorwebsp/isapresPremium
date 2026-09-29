# Planes de trabajo

Lo que **no** hay que construir de nuevo, y lo que sigue abierto. Lo ya implementado está en `FEATURES.md` (2026-09-29).

Si un ítem de aquí pasa a código, márcalo cerrado y agrega la fila en `FEATURES.md` en el mismo cambio. No abras una fase nueva sin que el usuario la pida.

## Cómo usarlo

1. Busca la función en `FEATURES.md`.
2. Si existe, extiende ese módulo.
3. Si este archivo la lista como cerrada, no la reimplementes aunque `docs/ARCHITECTURE-COTIZADOR-PREMIUM.md` la marque pendiente.
4. Los huecos de abajo no son un encargo. Impleméntalos solo si el usuario lo pide.

## Cerrado (no reabrir)

El roadmap histórico (fases 1–4 de `docs/ARCHITECTURE-COTIZADOR-PREMIUM.md`) describía la migración desde cotizador-virtual. Esto ya está en el código:

| Ítem que el doc marcaba pendiente | Estado real |
|-----------------------------------|-------------|
| Landing en `/` y cotizador en `/cotizador` | Hecho. Host del motor: `isaprespremium.cl` |
| `?agent=` + `PartnerEntity.embedKey` + widget | Hecho. Ver `FEATURES.md` |
| Bandeja de cotizaciones (`Quote`) en el panel | Hecho. Sección Cotizaciones y Prospectos |
| Envío por email y WhatsApp desde el equipo | Hecho, en dos flujos: compartir planes y `ClientQuotation` |
| Reportes de gestión para admin | Hecho. Sección Reportes (pipeline, primer contacto, Zoom) |
| Repo y deploy del motor | Hecho. Paquete `isapres-premium`; `/cotizador/admin` redirige al panel unificado |
| Documento comercial en la ficha (PDF, estados, email, WhatsApp) | Hecho. `ClientQuotation` |

También cerrado: no mover el código a `src/` ni reescribir `lib/plan-final-price.ts` / `lib/risk-factor-table-604.ts`.

## Abierto

No hay una fase de producto en curso. El siguiente trabajo lo define el usuario.

## Huecos conocidos (no implementar salvo pedido)

| Hueco | Qué hay hoy |
|-------|-------------|
| CRUD de socios en el panel | `PartnerEntity` se resuelve por BD, fallbacks y `npm run upsert-platform-partner`. No hay pantalla de alta de `embedKey`. |
| Ejecutivos por agente | `StaffAccount` no referencia `PartnerEntity`. La cartera es global; `Quote.partnerEntitySlug` solo etiqueta la marca de origen. |
| Métricas de conversión por socio | Los reportes miden pipeline y gestiones, no cotizaciones por `embedKey`. |
| Cobro de membresía | El acceso de `MEMBRESIA_ISAPRES_PREMIUM` depende de `subscriptionStatus` en BD. No hay Stripe ni checkout. |
| Docs de migración | `docs/WIDGET-INTEGRATION.md` y partes de `docs/email-actions-map.md` siguen citando `cotizadorpremium.cl` y `src/`. El widget en ese host redirige a este; la fuente de verdad de rutas es el código y `FEATURES.md`. |
