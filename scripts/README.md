# Scripts operativos

Herramientas one-shot y de mantenimiento. **No forman parte del runtime** de Next.js en producción.

## Cómo usar

Los scripts recurrentes están cableados en `package.json` (`npm run import-banmedica`, `verify:vercel`, etc.). El resto se ejecuta con `npx tsx scripts/<archivo>.ts` o `node`/`python3` según extensión.

## Clasificación (referencia)

| Tipo | Ejemplos | Notas |
|------|----------|--------|
| Ops / cuentas | `upsert-*-account.ts`, `reset-admin-password.ts`, `verify-*.ts` | Uso puntual en entornos |
| Import catálogo | `import-*-plans.ts`, `parse-*-excel.py`, `upload-plan-pdfs.ts` | No borrar: re-importaciones |
| Audit / reportes | `audit-*`, `export-*`, `build-*-xlsx.py` | Generan XLSX/JSON locales |
| Debug one-off | `debug-*.mjs`, `search-plan-code.ts`, `test-*.ts` | Conservar hasta archivar con evidencia de no uso |
| Build helpers | `try-migrate-deploy.mjs`, `with-local-env.mjs`, `run-dev.sh` | Usados por `npm run build` / `dev` |

## Assets locales

Snapshots en `assets/` (raíz del repo): `planes.json`, `clinics.json`, `clinic-locations.json`. Usados por seed y scripts de clínicas, no por el cotizador en runtime (datos viven en Prisma/BD).

## Regla de limpieza

No eliminar un script solo porque no esté en `package.json`. Preferir archivar documentado tras confirmar cero uso operativo.

## Importación de carteras SendPulse

`node --import tsx scripts/test-sendpulse-bot-import.ts` verifica deduplicación, prioridad, 13.000 filas y bloqueo de autenticación BOT sin escrituras reales.

`APP_ENV=production node scripts/with-db-env.mjs -- node --import tsx scripts/import-sendpulse-clients.ts MANIFEST.json` genera un plan sin modificar datos. El manifiesto contiene `batch`, `rowsFile`, `reportDir`, `complete` y `bots` (`label`, `phone`, `sourceFile`, `ready`). Debe estar completo y no contener exportaciones idénticas. Las filas normalizadas conservan `sourceFile`, `sourceRow`, `contactId`, `phoneDigits` y `raw`.

Antes de aplicar: migración BOT instalada, respaldo revisado y plan definitivo. La escritura añade `CONFIRM_PRODUCTION_DB=1`, `--destructive` al wrapper y `--apply --plan-sha SHA_DEL_PLAN` al importador. Cambios del CRM entre preparación y aplicación invalidan el SHA. La escritura es transaccional y verifica las carteras; nunca llama al webhook, a SendPulse ni a servicios de correo. No marcar un lote incompleto como completo para omitir archivos pendientes.

La importación SendPulse protege siempre al responsable humano existente. `--dry-run` hace explícita la simulación (también es el modo por defecto). La escritura contrasta rol, ID de responsable y fecha con el plan; conserva administradores y ejecutivos, independientemente de su estado. `SENDPULSE_PGLITE_MODULE=/ruta/a/@electric-sql/pglite node --import tsx scripts/test-sendpulse-owner-protection.mjs` prueba el SQL real en PostgreSQL embebido sin red.
