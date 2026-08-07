# API pública: registrar leads como clientes

Documentación operativa para humanos e IAs. El **motor del cotizador** vive en `isapresPremium` (prod: `https://isaprespremium.cl`). Cualquier formulario (Isapres Premium u otros) que deba crear un **cliente en el CRM del cotizador** debe usar esta API o el helper interno compartido.

## Cuándo usar qué

| Caso | Qué usar | Auth |
|------|----------|------|
| Formulario **dentro** de `isapresPremium` (mismo deploy) | Helper `registerLeadClient()` desde el route handler (como `/api/leads`) | No hace falta `PUBLIC_API_SECRET` (mismo proceso) |
| Formulario / backend **externo** (otro sitio, WordPress, Zapier, otra app) | `POST /api/public/v1/clients` | **Obligatorio** `PUBLIC_API_SECRET` |
| Solo notificar por email sin CRM | No uses esta API; el flujo marketing de `/api/leads` ya registra cliente + email |

**Nunca** llamar a `POST /api/public/v1/clients` desde el browser con la clave secreta. Solo **server-to-server**.

## Endpoint

```
POST https://isaprespremium.cl/api/public/v1/clients
```

Base path: `/api/public/v1`  
Autodocs (requiere secret): `GET /api/public/v1/docs`

### Autenticación

Una de:

```http
Authorization: Bearer <PUBLIC_API_SECRET>
```

```http
X-API-Key: <PUBLIC_API_SECRET>
```

Env var en el servidor del cotizador: `PUBLIC_API_SECRET`.

### Headers

```http
Content-Type: application/json
Authorization: Bearer <PUBLIC_API_SECRET>
```

### Body (JSON)

Campos **obligatorios**: `fullName`, `email`, `phone`.

| Campo | Tipo | Default | Notas |
|-------|------|---------|--------|
| `fullName` | string | — | 2–160 chars |
| `email` | string | — | Upsert por email (si existe CLIENT, actualiza) |
| `phone` | string | — | Con código país, ej. `+56 9 1234 5678` |
| `rut` | string | — | Opcional, RUT chileno válido |
| `source` | string | — | Id del formulario, ej. `isapres-premium`, `empresas` |
| `notes` | string | — | Máx. ~2000 chars |
| `preferenciaContacto` | string | — | `whatsapp` \| `telefono` \| `email` \| `video-llamada` |
| `metadata` | object | — | Máx. 20 claves; valores string/number/boolean/null |
| `executiveKind` | string | `ISAPRES_PREMIUM` | `ISAPRES_PREMIUM` \| `ISAPRES` \| `ZOOM` |
| `autoAssign` | boolean | `false` | Round-robin 1×1 al pool inbound (Javiera, Isidora, Catalina) si `true` |
| `notifyAdmin` | boolean | `false` | Aviso interno Resend (TO cotizaciones + CC `premiumisapres@gmail.com`) |

### Ejemplo curl

```bash
curl -sS -X POST "https://isaprespremium.cl/api/public/v1/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PUBLIC_API_SECRET" \
  -d '{
    "fullName": "Ana Pérez",
    "email": "ana@correo.cl",
    "phone": "+56 9 1234 5678",
    "rut": "12.345.678-9",
    "source": "empresas",
    "preferenciaContacto": "whatsapp",
    "notes": "Quiere cotizar para empresa",
    "metadata": {
      "región": "Metropolitana",
      "renta imponible": "1500000"
    },
    "executiveKind": "ISAPRES_PREMIUM",
    "autoAssign": false,
    "notifyAdmin": true
  }'
```

### Respuesta OK

- **201** si se creó el cliente  
- **200** si se actualizó uno existente  

```json
{
  "data": {
    "clientId": "cuid…",
    "email": "ana@correo.cl",
    "created": true,
    "assigned": true
  },
  "meta": { "version": "v1" }
}
```

`assigned` indica si quedó con ejecutivo; **no** se expone el ID del ejecutivo.

### Errores frecuentes

| HTTP | code (aprox.) | Causa |
|------|---------------|--------|
| 401 | `MISSING_API_SECRET` / `INVALID_API_SECRET` | Falta o clave incorrecta |
| 413 | `PAYLOAD_TOO_LARGE` | Body > ~16 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | No es `application/json` |
| 429 | `RATE_LIMITED` / `EMAIL_RATE_LIMITED` | Demasiadas requests (IP, key o mismo email) |
| 400 | `INVALID_INPUT` | Validación Zod |
| 409 | `EMAIL_UNAVAILABLE` | Email ya usado por cuenta no-CLIENT |
| 503 | `PUBLIC_API_NOT_CONFIGURED` | Falta env `PUBLIC_API_SECRET` |

## Comportamiento CRM

- Origen del cliente: `FORMULARIO_WEB`
- Upsert por `email` (normalizado lowercase)
- Si el cliente ya existe con origen `COTIZADOR` / `MANUAL` / `CAMPANA_LEAD_WHATSAPP`, **no se pisa el origen**; se enriquecen teléfono/nombre/notas
- Notas van a `pipelineNotes` (sanitizadas y con tope de tamaño)
- `preferenciaContacto=whatsapp` → `preferredContactMethod=WHATSAPP`; `video-llamada` → `ZOOM`
- Con `autoAssign: true` se asigna ejecutivo elegible del `executiveKind` (round-robin)
- Con `notifyAdmin: true` se envía correo interno (Resend) al buzón de cotizaciones con **CC fijo** a `premiumisapres@gmail.com`

## Formulario Isapres Premium (interno)

Ruta marketing: `POST /api/leads` (mismo app).

1. Valida payload del formulario (`lib/leads/validation.ts`)
2. Llama `registerLeadClient()` vía `lib/clients/register-lead-client.ts` (`source: "isapres-premium"`)
3. Envía emails Resend (admin + cliente)
4. Protecciones: origen confiable, rate limit IP, honeypot `_hp`, rate limit por email

**No** uses `/api/leads` desde sitios externos: está pensado para el origin del marketing Isapres Premium. Los externos usan `/api/public/v1/clients` con secret.

## Archivos clave (código)

| Archivo | Rol |
|---------|-----|
| `app/api/public/v1/clients/route.ts` | Endpoint público |
| `lib/clients/register-lead-client.ts` | Lógica compartida upsert CLIENT |
| `lib/public-api/register-client-schema.ts` | Schema Zod del body |
| `lib/public-api/require-api-secret.ts` | Auth Bearer / X-API-Key |
| `lib/public-api/write-guard.ts` | Rate limit + tamaño + Content-Type |
| `lib/security/public-post-guard.ts` | Guard del formulario `/api/leads` |
| `lib/security/sanitize-plain-text.ts` | Sanitización notas/metadata |
| `app/api/leads/route.ts` | Formulario Isapres Premium |
| `lib/public-api/openapi.ts` | Guía embebida en `/docs` |

## Checklist para otra IA / nuevo formulario

1. ¿El formulario corre **dentro** de `isapresPremium`? → importa `registerLeadClient` en el route server.
2. ¿Es **otro sistema**? → `POST /api/public/v1/clients` con `PUBLIC_API_SECRET` solo en backend.
3. Enviar `source` distintivo por formulario.
4. Elegir `executiveKind` correcto (`ISAPRES_PREMIUM` para leads de Isapres Premium).
5. No exponer la secret en frontend, repos públicos ni widgets.
6. Manejar 429 con reintento / mensaje al usuario.
7. Tras deploy, verificar en panel ejecutivos que el cliente aparece con badge del `source` enviado (ej. **Formulario web - Isapres Premium**).

## Seguridad (no romper)

- No aflojar rate limits ni quitar `requirePublicApiSecret` en el endpoint público.
- No añadir CORS permisivo para POST con API key en el browser.
- No devolver `assignedExecutiveId` en respuestas públicas.
- Mantener honeypot y guards en `/api/leads`.
