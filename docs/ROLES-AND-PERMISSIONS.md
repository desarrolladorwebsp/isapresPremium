# Roles y permisos — Cotizador Premium

El acceso de staff usa `StaffAccount` con `role` (`ADMIN` | `EXECUTIVE`) y, en ejecutivos, `executiveKind`.

## Resumen

| Rol / kind | Acceso | Ruta panel |
|------------|--------|------------|
| **Administrador** | Panel completo | `/cotizador/ejecutivos` |
| **Ejecutivo Isapres Premium** | Inicio, clientes, calendario, cotizador, mapa | `/cotizador/ejecutivos` |
| **Ejecutivo Zoom / Isapres** | Inicio, clientes, calendario | `/cotizador/ejecutivos` |
| **Membresía Isapres Premium** | Solo cotizador (sin clientes ni otras vistas) | `/cotizador/ejecutivos?section=cotizador` |
| **Cliente** | Solo cotiza en web (sin cuenta) | — |

La membresía es para usuarios externos: no reciben asignación de clientes ni aparecen en selectores de cartera.

---

## Rol Ejecutivo (operativo)

### Puede

- Ver **todos los planes** con filtros (mismo catálogo que el cotizador público).
- **Descargar y ver PDF** de cada plan (`/api/plans/{code}/pdf`).
- Ver **cotizaciones** / clientes según su `executiveKind` y secciones permitidas.
- **Asignarse** cotizaciones y clientes que cotizaron (excepto membresía).

### No puede

- Crear, editar o eliminar planes, clínicas o coberturas (salvo admin).
- Gestionar valores GES globales.
- Crear otros usuarios staff.
- Asignar clientes a otro ejecutivo (solo admin).

---

## Membresía Isapres Premium

### Puede

- Usar el **cotizador** del panel (`section=cotizador`).
- Leer el catálogo de planes necesario para cotizar.

### No puede

- Ver ni gestionar **clientes**, calendario, mapa u otras secciones.
- Recibir clientes por asignación automática o manual.
- Usar APIs de CRM (`/api/executive/clients*`) — responden 403.

---

## Rol Administrativo

### Puede

- **Todo lo del catálogo**: planes, clínicas, coberturas, GES.
- Ver **todas las cotizaciones** del sistema.
- **Asignar un cliente** (`User`) a un ejecutivo operativo, a Zoom o a **otro administrador** (no a membresía).
- **Recibir clientes asignados** como destino operativo (misma elegibilidad que Ejecutivo Isapres Premium y Zoom en redirects y round-robin).
- **Asignar una cotización** (`Quote`) a un ejecutivo o administrador.
- **Invitar usuarios** admin, ejecutivo o membresía desde Usuarios.

### Flujo de alta de usuarios (solo admin)

1. Admin ingresa **correo**, **rol** (admin / ejecutivo / membresía) y opcionalmente **RUT**.
2. El sistema envía un **correo con enlace único** (válido 7 días).
3. Solo quien recibe ese correo puede activar la cuenta.
4. En la activación la persona define nombre, apellido, RUT y contraseña.
5. Tras activar, puede iniciar sesión normalmente.

**Endpoints:**

- `GET /api/auth/staff-invite?token=` — valida invitación
- `POST /api/auth/staff-invite/activate` — crea cuenta y abre sesión

**Páginas de activación:**

- Admin: `/cotizador/admin/activar-cuenta?token=...`
- Ejecutivo / membresía: `/cotizador/ejecutivos/activar-cuenta?token=...`

---

## Asignación cliente ↔ ejecutivo

| Entidad | Campo | Quién asigna |
|---------|-------|--------------|
| Cliente (`User`) | `assignedExecutiveId` | Solo admin (ejecutivos operativos, Zoom, o admin; no membresía) |
| Cotización (`Quote`) | `executiveAccountId` | Admin o ejecutivo operativo |

Los **administradores activos** aparecen en selectores de asignación manual y en redirecciones a Isapres Premium / Zoom, y pueden entrar al round-robin automático de esos kinds. No requieren suscripción de ejecutivo.

Cuando un cliente cotiza en la web, se crea/actualiza un `User` y un `Quote`. El admin puede asignar ese cliente a un ejecutivo o a un administrador; el asignado ve las cotizaciones en su panel.

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
