# Planes de trabajo

Lo que **no** hay que construir de nuevo, y lo que sigue abierto. Lo ya implementado está en `FEATURES.md` (2026-09-29).

Si un ítem de aquí pasa a código, márcalo cerrado y agrega la fila en `FEATURES.md` en el mismo cambio. No abras una fase nueva sin que el usuario la pida.

## Cómo usarlo

1. Busca la función en `FEATURES.md`.
2. Si existe, extiende ese módulo.
3. Si este archivo la lista como cerrada, no la reimplementes aunque `docs/ARCHITECTURE-COTIZADOR-PREMIUM.md` la marque pendiente.
4. Los huecos de abajo no son un encargo. Impleméntalos solo si el usuario lo pide.

## Cerrado (no reabrir)

- 2026-11-04: publicación conjunta de mejoras CRM de noviembre. Incluye todos los ítems locales siguientes, migración de pausas y vencimientos históricos. Auditoría: el release anterior contenía solo la agrupación por Isapre; el resto no había llegado a main. Validación: TypeScript, build, pruebas funcionales y de BD desarrollo; sin nuevos errores ESLint respecto de main. El aviso SendPulse conserva premiumisapres@gmail.com. Evidencia productiva en Store/2026-11-04/auditoria-publicacion.

- 2026-11-03: modales de las cinco tarjetas KPI de cotizaciones agrupados por Isapre. Activas mantiene clientes únicos por tarjeta y documentos/clientes agrupados en cada Isapre; documentos con varias Isapres se muestran en cada grupo sin alterar los conteos. Implementado en desarrollo.

- 2026-11-02: filtro múltiple por Origen en Clientes, combinado con Gestión, estados, ejecutivo y búsqueda. Incluye campañas, registro propio, cotizador, formulario y SendPulse; conserva selección al abrir/cerrar ficha y reinicia paginación al cambiar. Implementado y probado en desarrollo; publicación pendiente.

- 2026-11-02: Clientes nuevos movida a Cartera en Inicio, conservando contador, filtros y detalle. Implementado en desarrollo; publicación pendiente.

- 2026-11-02: tarjeta Clientes activos en Inicio: cartera actual única, excluyendo únicamente Perdido y En pausa; filtro por ejecutivo, visible solo con mes actual de Chile o Todos los meses, lista paginada y regreso desde ficha conservado. Conteo y permisos probados en desarrollo; publicación pendiente.

- 2026-11-02: tarjetas de Recordatorios de hoy y Cotizaciones activas en Inicio. Activas suma clientes únicos y agrupa documentos pendientes; respeta mes/ejecutivo/isapres y permite Todos los meses. Recordatorios muestra nota, horario Chile y ficha, excluyendo pausados/cerrados. Implementado y probado en desarrollo, pendiente de publicación.

- 2026-11-02: filtros múltiples de gestión, estados y ejecutivos, orden por campo con flechas en tabla y tarjetas, y pausa global temporal del reparto automático (nuevos leads y reparto masivo). Botones/motor conservados y cartera intacta; asignaciones manuales siguen activas. Implementación y pruebas en desarrollo, pendiente de publicación.

- 2026-11-02: En pausa con motivo y retorno mensual a Pendiente, filtro específico, oferta al guardar anualidad y exclusión de agenda. Implementado y probado en desarrollo. Publicación pendiente: aplicar migración aditiva y configurar CRON_SECRET en producción.

- 2026-11-02: anualidad con vencimiento en mes y año, propuesta anual editable, fechas históricas desde creación y recordatorio en Inicio desde el primer día del mes en Chile. Implementada y validada en desarrollo; pendiente de publicación productiva.

- 2026-10-27: convenios individuales por cotizante. Beneficio exclusivo de su titular; cargas sin descuento y GES intacto. Cálculo compartido y 22 pruebas. Publicación sin migraciones automáticas; conserva cotizaciones anteriores.

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

## Operación SendPulse — 2026-10-26

- Implementado: carteras BOT sin login e importador auditable con deduplicación y prioridad del responsable humano; tamaño del bot solo sin dueño humano.
- Lote autorizado: conservar PREMIUM 2; excluir la copia idéntica PREMIUM 9. Respaldos e informes en `Store/2026-10-26/sendpulse-clientes/`.
- Las identidades ambiguas quedan fuera de la aplicación y requieren revisión independiente sin fusionar ni borrar historiales.

- Corrección del 2026-10-26: restauradas 401 asignaciones humanas desde el respaldo (327 ejecutivos, 74 administradores), con comprobación de cambios posteriores. Evidencia privada en el Store del proyecto original: `2026-10-26/reversion-responsables/`.
