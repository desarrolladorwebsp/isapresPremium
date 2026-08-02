# Integración del Widget Cotizador Premium

Guía para socios y agentes que desean incrustar una **vista previa** del cotizador en su sitio web (ej. `cotizaloantes.cl`, `desdetu7.cl`, `isaprespremium.cl`).

## Resumen

1. Obtienes tu **Agent Key** (código único) desde el equipo de Cotizador Premium.
2. Insertas un contenedor HTML y el script del widget en tu página.
3. El visitante ve hasta **4 planes** en el iframe.
4. Al hacer clic en **Cotizar** o **Ver todos los planes**, se abre el cotizador completo en `https://cotizadorpremium.cl/cotizador` con tu branding (logo y colores).

## Requisitos

- Tu sitio debe poder cargar scripts externos (`https://cotizadorpremium.cl/cotizador-widget.js`).
- Tu dominio debe estar autorizado en la política CSP del cotizador (configuramos `EMBED_FRAME_ANCESTORS` por socio).

## Paso 1 — Obtener tu Agent Key

Cada socio recibe un código único, por ejemplo:

| Socio | Agent Key (ejemplo) |
|-------|---------------------|
| Cotízalo Antes | `cotizaloantes` |
| Desde Tu 7 | `desdetu7` |
| Isapres Premium | `isaprespremium` |

Este valor corresponde al campo `embedKey` en la base de datos. **No es un secreto de servidor**, pero identifica tu marca en URLs públicas.

## Paso 2 — HTML mínimo

Coloca esto donde quieras mostrar el cotizador (recomendado: sección dedicada, ancho completo):

```html
<section
  id="cotizador-premium"
  data-cotizador-widget
  data-agent-key="TU_AGENT_KEY"
  data-full-width="true"
  data-min-height="720"
></section>

<script
  src="https://cotizadorpremium.cl/cotizador-widget.js"
  defer
></script>
```

### Atributos del contenedor

| Atributo | Obligatorio | Descripción |
|----------|-------------|-------------|
| `data-cotizador-widget` | Sí | Marca el contenedor para auto-inicialización |
| `data-agent-key` | Sí | Tu Agent Key / código de socio |
| `data-base-url` | No | URL del cotizador (default: `https://cotizadorpremium.cl`) |
| `data-full-width` | No | `true` = ancho 100% del viewport (default: `true`) |
| `data-min-height` | No | Altura mínima del iframe en px (default: `720`) |
| `data-mobile-scroll` | No | `auto` (default): iframe crece y la página hace scroll. `true`: scroll interno 72vh en móvil |
| `data-title` | No | Título accesible del iframe |

**Compatibilidad:** `data-partner` sigue funcionando como alias de `data-agent-key`.

### Prellenar criterios de búsqueda (opcional)

Puedes pasar parámetros iniciales con atributos `data-*`:

```html
<section
  data-cotizador-widget
  data-agent-key="cotizaloantes"
  data-region="rm"
  data-edad="35"
  data-ingreso="1500000"
  data-auto-search="true"
></section>
```

Parámetros soportados: `region`, `edad`, `sexo`, `ingreso`, `cargas`, `q`, `precioMin`, `precioMax`, `isapres`, `zonas`, `tipoPlan`, `coberturaH`, `coberturaA`, `orden`, `moneda`, `email`, `plan`, `vista`, `nombre`, `rut`, `telefono`.

### Ejemplo — Isapres Premium (WordPress)

```html
<section
  data-cotizador-widget
  data-agent-key="isaprespremium"
  data-base-url="https://cotizadorpremium.cl"
  data-full-width="true"
  data-mobile-scroll="auto"
  data-min-height="720"
></section>
<script
  src="https://cotizadorpremium.cl/cotizador-widget.js"
  defer
></script>
```

**WordPress / Elementor:** en el contenedor de la sección, evita `overflow: hidden` y alturas fijas. Si el iframe se corta, agrega esta clase CSS personalizada:

```css
[data-cotizador-widget].cv-widget {
  overflow: visible !important;
  max-height: none !important;
}
```

## Paso 3 — Inicialización manual (opcional)

Si prefieres controlar cuándo montar el widget:

```html
<div id="mi-cotizador" data-agent-key="cotizaloantes"></div>
<script src="https://cotizadorpremium.cl/cotizador-widget.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    window.CotizadorWidget.mount(document.getElementById("mi-cotizador"), {
      agentKey: "cotizaloantes",
      baseUrl: "https://cotizadorpremium.cl",
      fullWidth: true,
      minHeight: 800,
    });
  });
</script>
```

## Qué ocurre al hacer clic en "Cotizar"

El iframe redirige la ventana principal (no el iframe) a una URL como:

```
https://cotizadorpremium.cl/cotizador?agent=cotizaloantes&region=rm&edad=35&...
```

El parámetro `agent` aplica automáticamente:

- Logo del socio
- Paleta de colores (variables CSS `--primary`, etc.)
- Enlace de WhatsApp y botón "Volver al sitio" configurados para tu marca

## Verificar tu Agent Key (API)

Endpoint público de solo lectura:

```
GET https://cotizadorpremium.cl/api/agents/{embedKey}
```

Respuesta 200 (ejemplo):

```json
{
  "slug": "cotizaloantes",
  "name": "Cotízalo Antes",
  "logoUrl": "/images/logo-cotizalo-antes.png",
  "websiteUrl": "https://cotizaloantes.cl",
  "brandKey": "cotizalo-antes",
  "theme": { "primary": "#ed7d11", ... }
}
```

## Integración en Next.js / React

```tsx
"use client";

import Script from "next/script";

export function CotizadorEmbedSection() {
  return (
    <>
      <section
        data-cotizador-widget
        data-agent-key={process.env.NEXT_PUBLIC_COTIZADOR_AGENT_KEY}
        data-base-url={process.env.NEXT_PUBLIC_COTIZADOR_URL}
        data-full-width="true"
        className="w-full"
      />
      <Script
        src="https://cotizadorpremium.cl/cotizador-widget.js"
        strategy="afterInteractive"
      />
    </>
  );
}
```

Variables recomendadas en `.env.local` del sitio socio:

```env
NEXT_PUBLIC_COTIZADOR_URL=https://cotizadorpremium.cl
NEXT_PUBLIC_COTIZADOR_AGENT_KEY=cotizaloantes
```

## Desarrollo local

Para probar contra tu cotizador local (puerto 3001):

```html
<section
  data-cotizador-widget
  data-agent-key="cotizaloantes"
  data-base-url="http://localhost:3001"
></section>
```

Asegúrate de tener CORS/CSP local configurado y el cotizador corriendo con `npm run dev`.

## Solución de problemas

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Iframe vacío o bloqueado | Dominio no autorizado en CSP | Solicitar alta de tu dominio en `EMBED_FRAME_ANCESTORS` |
| Contenido cortado / altura fija en WordPress | Script desactualizado, `overflow:hidden` en Elementor, o **`data-agent-key` mal escrito** (`isaprepremium` → usar `isaprespremium`) | Usar snippet de abajo, CSS de overflow, y **siempre** `https://cotizadorpremium.cl/cotizador-widget.js` (no el dominio antiguo `cotizador-widget.vercel.app`) |
| Solo 4 planes visibles | Comportamiento esperado en embed | Usar "Ver todos" para ir al cotizador completo |
| 404 en iframe | URL base incorrecta | Usar `https://cotizadorpremium.cl` como `data-base-url` |

## Soporte

Contacto técnico: equipo Cotizador Premium / Isapre Premium.
