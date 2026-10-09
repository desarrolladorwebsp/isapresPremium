# Funciones implementadas

Registro de lo que **ya existe** en este repo (revisado 2026-09-29). Antes de diseñar o programar una función, busca aquí. Si ya está, extiéndela; no abras un segundo flujo.

Al cerrar una función nueva, agrega una fila en la sección que corresponda (qué hace, dónde vive, qué no hace). El trabajo que todavía no está en el código va en `PLANS.md`.

## No confundir

| Concepto | Qué es | Dónde |
|----------|--------|--------|
| `Quote` | Solicitud / lead del cotizador público o del widget | `prisma` `quotes`, `/api/quotes`, panel Equipo → Cotizaciones |
| `ClientQuotation` | Documento comercial formal de la ficha (PDF, estados, envío) | `client_quotations`, `/api/executive/clients/[id]/quotations` |
| Compartir planes | Email con planes del cotizador ejecutivo, sin documento `ClientQuotation` | `POST /api/executive/share-plans-email` |
| `PartnerEntity` | Marca del cotizador (logo, colores, `embedKey`) | Catálogo compartido; no aísla planes ni clientes |
| Motor de precios | Fórmula Isapre (factor 604 + GES) | `domain/index.ts`, `lib/plan-final-price.ts` |

El tenant es de **marca**, no de datos. Isapres, planes, clínicas, coberturas y UF son globales.

## Marketing

| Función | Dónde |
|---------|--------|
| Home, empresas, nosotros, respaldo legal, políticas | `app/(marketing)/` |
| Fichas públicas de isapres | `app/isapres/[slug]/`, `lib/isapre-pages/` |
| Reseñas públicas | `GET /api/reviews/public`, modelo `PlanReview` |
| SEO / JSON-LD | `lib/seo/` |

## Cotizador público y widget

| Función | Dónde |
|---------|--------|
| Cotizador `/cotizador?agent=` | `app/cotizador/page.tsx`, `components/cotizador/` |
| Resolución de marca (`agent`, `entidad`, cookie, `DEFAULT_PARTNER_ENTITY_SLUG`) | `lib/partner-entity/` |
| Ruta legacy `/{partnerSlug}` y `/embed` | `app/[partnerSlug]/`, `app/embed/` |
| Widget `cotizador-widget.js` (iframe, 4 planes, salida al cotizador completo; host por defecto `https://isaprespremium.cl`) | `public/cotizador-widget.js`, `EMBED_WIDGET_PLANS_LIMIT` en `lib/plan-search-config.ts` |
| Búsqueda y filtros de planes (precio, isapre, zona, tipo, cobertura H/A, clínicas) | `GET /api/plans/search`, `lib/api/plan-search.ts`, `lib/apply-plan-filters.ts` |
| Precio final UF/CLP, escenarios, descuento por convenio de empresa | `lib/plan-final-price.ts`, `lib/plan-price-scenarios.ts`, `lib/company-agreements/plan-price-discount.ts` |
| UF | `GET /api/uf`, `lib/economic-indicators.ts` |
| PDF de plan | `GET /api/plans/[uniqueCode]/pdf` |
| Solicitud de plan / aviso de cotización | `POST /api/quotes`, `POST /api/cotizacion-notify`, página `/cotizador/mi-cotizacion` |
| Consulta de convenio por RUT | `GET /api/company-agreements/lookup`, `POST /api/company-agreement-inquiry` |
| Deep links del widget | `lib/deep-link/`, `lib/public-api/cotizador-url.ts`, `lib/public-api/solicitar-url.ts` |

## Catálogo (admin)

Secciones del panel unificado `/cotizador/ejecutivos?section=`:

| Sección | Función |
|---------|---------|
| `clinicas` | CRUD clínicas, ubicación, zonas |
| `ges` | Valores GES |
| `reportes-pdf` | Informe y carga de PDF de planes |
| `convenios` | Convenios de empresa e importación |
| `mapa` | Mapa de clínicas (Google Maps) |

También: importación masiva de planes (`POST /api/admin/plans/import`), alta/edición de planes e isapres (`/api/plans`, `/api/isapres`), storage de PDF (Blob, local o cPanel) en `lib/plan-pdf-storage/`. Scripts de import por isapre en `package.json` (`import-banmedica`, `import-colmena`, etc.).

`/cotizador/admin` redirige a Prospectos. `/cotizador/admin/usuarios` es legacy de Usuarios.

## Staff, roles y acceso

Detalle de permisos: `docs/ROLES-AND-PERMISSIONS.md`. Menú: `lib/staff/staff-sections.ts`, `lib/staff/staff-nav.ts`.

| Función | Dónde |
|---------|--------|
| Login unificado | `/cotizador/acceso` |
| Roles `ADMIN` y `EXECUTIVE`; kinds `ISAPRES_PREMIUM`, `ZOOM`, `ISAPRES`, `MEMBRESIA_ISAPRES_PREMIUM` | `StaffAccount` |
| Invitación por correo (7 días) y activación | `POST /api/admin/accounts`, `/api/auth/staff-invite` |
| Recuperación y cambio de contraseña, onboarding de ejecutivo | `/api/auth/password-reset`, `components/executive/executive-onboarding-form.tsx` |
| Avatar | `/api/executive/profile/avatar`, `/api/staff/avatars/[id]` |
| Gate de suscripción **solo** para membresía (estado en BD) | `lib/auth/subscription.ts` |
| Suspensión de asignaciones | `StaffAccount.assignmentsSuspended` |

No hay integración Stripe. `stripeCustomerId` está en el schema y no lo usa ningún módulo.

Secciones por kind: admin ve catálogo, equipo, reportes y cotizaciones; Premium ve inicio, clientes, calendario, cotizador y mapa; Zoom/Isapres ven inicio, clientes y calendario; membresía solo el cotizador.

## CRM de clientes

Panel: sección `clientes`. Ficha Premium: `components/executive/client-premium-hub-view.tsx`.

| Función | Dónde |
|---------|--------|
| Cartera, alta manual, origen, pipeline (`NUEVO` … `PERDIDO`) | `/api/executive/clients`, `lib/client-pipeline/` |
| Flujos Zoom, Premium, Isapres y seguimiento | `client-protocolo-flow-view.tsx`, `client-seguimiento-flow-view.tsx` |
| Agenda, confirmación de llamado, reunión Zoom, recordatorios | `executive-calendar-panel.tsx`, `CalendlyBooking` |
| Webhook y link de agendamiento Calendly | `/api/webhooks/calendly`, `/api/executive/calendly/scheduling-link` |
| Derivación a ejecutivo Premium, Zoom o Isapres | `redirect-premium`, `redirect-zoom`, `redirect-isapres` |
| Planes asignados, plan elegido y plan aconsejado | `ClientAssignedPlan`, `/api/executive/clients/[id]/assigned-plans`, `advised-plan` |
| Historial de cambios de plan | `ClientActivity`, `client-plan-history-timeline.tsx` |
| Documentos (RUT, liquidación, plan, otros) | `ClientDocument`, `/api/executive/clients/[id]/documents` |
| Ficha PDF de protocolo | `client-ficha-pdf-modal.tsx` |
| Distribución round-robin de pendientes | `POST /api/executive/clients/distribute`, `lib/api/inbound-assignment-pool.ts` |
| Reportes de equipo (pipeline, primer contacto, Zoom, cotizaciones enviadas) | sección `reportes`, `lib/executive/admin-reports.ts`, `lib/executive/sent-quotation-kpi.ts` |
| Prospectos (bandeja admin de leads) | sección `prospectos` |
| Inicio con gestiones del día | `executive-dashboard-home.tsx`. El detalle de una tarjeta usa el mes y el ejecutivo ya elegidos en el dashboard, sin repetir esos filtros |
| KPI de cotizaciones en Inicio | `executive-dashboard-home.tsx`, `GET /api/executive/sent-quotations`. Enviadas, recepcionadas, aceptadas y rechazadas. Usan el mes y, en admin, el ejecutivo del dashboard. El filtro de isapres (una, varias o todas) cambia las cuatro tarjetas. El detalle de una tarjeta no repite esos filtros |

## Cotización comercial (`ClientQuotation`)

Cápsula «Cotización» en la ficha. No reemplaza a `Quote`.

| Función | Dónde |
|---------|--------|
| Crear documento con 1 a 3 planes ya agregados a la propuesta | `POST …/quotations`, `lib/api/client-quotation-store.ts` |
| Estados borrador, enviada, aceptada, recepcionada, rechazada, anulada | `ClientQuotationStatus`. Aceptada: el cliente aceptó. Recepcionada: la Isapre aceptó y el proceso terminó. Rechazo y anulación piden motivo |
| PDF formal | `GET …/quotations/[quotationId]/pdf`, `lib/client-quotation/pdf.ts`. Al final incluye una nota discreta: los planes pueden cambiar y el equipo mantiene el catálogo al día |
| Envío por email (Resend) o WhatsApp (`wa.me` + descarga del PDF) | `POST …/quotations/[quotationId]/send`, `lib/email/send-client-quotation.ts` |
| Historial auditable | `ClientQuotationActivity` |
| KPI de enviadas, recepcionadas, aceptadas y rechazadas | Inicio y Reportes. Enviadas por `sentAt` (siguen contando si cambian de estado). Las otras tres cuentan el estado actual y la fecha de ese cambio. Borrador y anulada no entran. Una cotización cuenta una vez si incluye al menos una isapre del filtro. No mide `Quote` |
| Acceso según la misma cartera que la ficha | `lib/api/client-quotation-access.ts` |
| UI | `components/executive/client-quotation-manager.tsx` |

Migración: `prisma/migrations/20260928170000_client_commercial_quotations`. Si producción conserva el esquema anterior vacío (`user_id`, `client_quotation_plans`), `prisma/safe-schema-patches.sql` lo reemplaza en el deploy.

## Leads y API pública

| Función | Dónde |
|---------|--------|
| Formulario del sitio → cliente + email | `POST /api/leads`, `registerLeadClient()` |
| Alta server-to-server | `POST /api/public/v1/clients` (`PUBLIC_API_SECRET`) |
| Catálogo, preview, URLs de cotizador/solicitar, guía de UI | `GET/POST /api/public/v1/plans`, `plans/preview`, `cotizador/url`, `solicitar/url`, `ui/filters`, `ui/plan-card` |
| Autodocs | `GET /api/public/v1/docs` |
| Rate limit, write-guard, honeypot, CORS | `lib/public-api/`, `lib/security/` |

Origen CRM del formulario: `FORMULARIO_WEB`. Guía: `docs/PUBLIC-API-LEADS-CLIENTS.md`.

## Correos (Resend)

Implementación en `lib/email/` (el mapa `docs/email-actions-map.md` todavía cita `src/lib/email/`).

| Envío | Módulo |
|-------|--------|
| Invitación y clave temporal de staff | `send-staff-invite.ts` |
| Aviso de cotización pública | `send-cotizacion-notify.ts` |
| Lead de formulario | `send-public-lead-notify.ts` |
| Asignación de cliente al ejecutivo | `notify-executive-client-assignment.ts` |
| Recuperación de contraseña | `send-password-reset.ts` |
| Compartir planes desde el cotizador ejecutivo | `send-executive-share-plans.ts` |
| Cotización comercial PDF | `send-client-quotation.ts` |
| Consulta de convenio | `send-company-agreement-inquiry.ts` |
| Disparador SendPulse | `send-sendpulse-trigger-notify.ts`. Aviso a `ahurtado@smartpro.cl` (o `SENDPULSE_NOTIFY_EMAIL`) |

## SendPulse

El chatbot avisa un disparador de negocio. Esta etapa no crea el cliente ni lee la API de SendPulse.

| Función | Dónde |
|---------|--------|
| Salud del webhook: `true` si puede enviar el correo, `false` si no | `GET /api/webhooks/sendpulse` |
| Recibe `id`, `nombre` opcional, `telefono`, `bot` (teléfono del bot con +) y `disparador` (`contratar`, `hablar_ejecutivo`, `no_responde`). Responde `true` solo si el correo salió o era un duplicado reciente | `POST /api/webhooks/sendpulse`, `lib/sendpulse/handle-webhook.ts` |
| Token por número de WhatsApp, rotación, revocación y registro de cada llamada | Sección `sendpulse` del panel admin, `SendpulseBotLine`, `SendpulseWebhookEvent` |

En SendPulse se configura con el elemento Solicitud API (POST, cabecera `Authorization: Bearer`). El token se muestra una sola vez al crearlo.

## Operación

| Función | Dónde |
|---------|--------|
| Postgres vía Prisma; local usa Neon DEV | `lib/prisma.ts`, `scripts/with-db-env.mjs` |
| Health check | `GET /api/health` |
| Semilla | `prisma/seed.ts` |
