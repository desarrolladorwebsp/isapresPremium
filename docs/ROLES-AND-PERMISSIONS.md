# Roles y permisos — Cotizador Premium

El sistema distingue **dos roles de staff** con tablas y sesiones separadas. Los **clientes** del cotizador público no tienen login.

## Resumen

| Rol | Acceso | Tabla | Ruta panel |
|-----|--------|-------|------------|
| **Administrativo** | Catálogo global, usuarios, asignaciones | `AdminAccount` | `/cotizador/admin` |
| **Ejecutivo** | Planes, cotizaciones, PDFs, clientes asignados | `ExecutiveAccount` | `/cotizador/ejecutivos` |
| **Cliente** | Solo cotiza en web (sin cuenta) | `User` | — |

---

## Rol Ejecutivo

### Puede

- Ver **todos los planes** con filtros (mismo catálogo que el cotizador público).
- **Descargar y ver PDF** de cada plan (`/api/plans/{code}/pdf`).
- Ver **cotizaciones** asignadas a su cuenta y las **sin asignar** (para tomarlas).
- **Asignarse** cotizaciones y clientes que cotizaron.
- Generar / registrar cotizaciones (vía flujo público + seguimiento en su bandeja).

### No puede

- Crear, editar o eliminar planes, clínicas o coberturas.
- Gestionar valores GES globales.
- Crear otros usuarios staff.
- Asignar clientes a otro ejecutivo (solo admin).

---

## Rol Administrativo

### Puede

- **Todo lo del catálogo**: planes, clínicas, coberturas, GES.
- Ver **todas las cotizaciones** del sistema.
- **Asignar un cliente** (`User`) a un ejecutivo.
- **Asignar una cotización** (`Quote`) a un ejecutivo.
- **Invitar usuarios** admin o ejecutivo desde `/cotizador/admin/usuarios`.

### Flujo de alta de usuarios (solo admin)

1. Admin ingresa **correo**, **rol** (admin/ejecutivo) y opcionalmente **RUT**.
2. El sistema envía un **correo con enlace único** (válido 7 días).
3. Solo quien recibe ese correo puede activar la cuenta.
4. En la activación la persona define:
   - **Nombre**
   - **Apellido**
   - **RUT** (debe coincidir si el admin lo registró en la invitación)
   - **Contraseña** (solo la conoce ella; mín. 8 caracteres)
5. Tras activar, puede iniciar sesión normalmente.

**Endpoints:**

- `GET /api/auth/staff-invite?token=` — valida invitación
- `POST /api/auth/staff-invite/activate` — crea cuenta y abre sesión

**Páginas de activación:**

- Admin: `/cotizador/admin/activar-cuenta?token=...`
- Ejecutivo: `/cotizador/ejecutivos/activar-cuenta?token=...`

---

## Asignación cliente ↔ ejecutivo

| Entidad | Campo | Quién asigna |
|---------|-------|--------------|
| Cliente (`User`) | `assignedExecutiveId` | Solo admin |
| Cotización (`Quote`) | `executiveAccountId` | Admin (cualquier ejecutivo) o ejecutivo (solo a sí mismo) |

Cuando un cliente cotiza en la web, se crea/actualiza un `User` y un `Quote`. El admin puede asignar ese cliente a un ejecutivo; el ejecutivo ve las cotizaciones en su panel.

---

## Matriz de permisos API

| Recurso | Cliente | Ejecutivo | Admin |
|---------|---------|-----------|-------|
| `GET /api/plans` | ✓ | ✓ | ✓ |
| `POST/PUT/DELETE /api/plans` | — | — | ✓ |
| `GET /api/quotes` | — | ✓ (propias + sin asignar) | ✓ (todas) |
| `PATCH /api/quotes/[id]` | — | ✓ (asignarse) | ✓ (asignar + estado) |
| `GET /api/users` | — | — | ✓ |
| `PATCH /api/users/[id]` | — | — | ✓ (asignar ejecutivo) |
| `POST /api/admin/accounts` | — | — | ✓ (invitación) |

---

## Motor de precios

Los cálculos Isapre (`src/domain/`, factores 604, GES) son **globales** y compartidos por todos los roles. Ningún rol modifica la lógica de precios desde su panel; solo el admin modifica el **catálogo** (planes base UF, coberturas).

---

## Variables de entorno (invitaciones)

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=Cotizador Premium <noreply@cotizadorpremium.cl>
NEXT_PUBLIC_APP_URL=https://cotizadorpremium.cl
```

---

## Roadmap inmediato

- [x] Invitación por enlace + activación con RUT y contraseña propia
- [x] Asignación cotización ↔ ejecutivo
- [x] Asignación cliente ↔ ejecutivo (admin)
- [x] Bandeja de cotizaciones en panel ejecutivo
- [ ] Envío de cotización por email/WhatsApp desde panel ejecutivo
- [ ] CRUD de agentes/socios (`PartnerEntity`) en admin
