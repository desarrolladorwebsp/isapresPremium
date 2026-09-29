---
name: feature-registry
description: >-
  Consulta FEATURES.md y PLANS.md antes de agregar comportamiento en Isapres
  Premium y los actualiza al cerrar el cambio. Usar al implementar, extender o
  proponer cotizador, CRM, cotizaciones, planes, leads, panel staff, correos o
  API pública, o cuando haya que evitar duplicar una función existente.
---

# Registro de funciones

## Antes de implementar

1. Lee `FEATURES.md` y busca el flujo (nombre, modelo o ruta).
2. Lee `PLANS.md`. Si el ítem está en **Cerrado**, no lo vuelvas a construir.
3. Si la función ya existe, modifica ese módulo. Los dos flujos de cotización no se fusionan:
   - `Quote` — lead del cotizador público.
   - `ClientQuotation` — documento comercial de la ficha.
4. Los huecos de `PLANS.md` no son un encargo. Impleméntalos solo si el usuario lo pide.

## Al cerrar el cambio

En el mismo diff:

- Agrega o ajusta la fila en `FEATURES.md` (qué hace, dónde vive, qué no hace).
- Si cerraste un ítem de `PLANS.md`, márcalo en **Cerrado** y quítalo de **Abierto** o de **Huecos**.
- No copies el inventario dentro de este skill ni de `AGENTS.md`.

## Qué no reescribir

El cálculo de precio Isapre (`domain/index.ts`, `lib/plan-final-price.ts`, `lib/risk-factor-table-604.ts`). El admin cambia catálogo, no la fórmula.
