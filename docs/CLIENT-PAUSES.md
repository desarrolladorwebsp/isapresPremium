# Pausa de clientes

- Estados: PAUSADO (En pausa) y PENDIENTE (Pendiente de revisión).
- Pausa manual, mes/año futuro y motivo obligatorio. La fecha es independiente del vencimiento de anualidad; se propone ese vencimiento al usar la oferta desde Previsión.
- Guardar sin pausar conserva la gestión activa. Cancelar la oferta vuelve al formulario sin guardar.
- No hay pausa masiva ni automática de anualidades ya registradas.
- Solo En pausa oculta gestiones, atrasos, recordatorios de anualidad y eventos de calendario. La ficha e historial siguen accesibles. Los horarios originales permanecen guardados.
- Al retornar, las agendas originales vuelven a ser visibles y se añade la gestión Pendiente de revisión; el ejecutivo decide qué hacer con esas agendas y el cliente.
- Se conserva siempre el responsable y el ejecutivo de seguimiento.
- Quien puede ver la ficha puede pausar, editar la pausa o reactivar a Pendiente. El permiso no habilita cambios de perfil, notas privadas, cartera o estados arbitrarios.
- Se registra quién pausó/editó/reactivó y el motivo en el historial habitual. Las notas privadas conservan su restricción de acceso.

## Operación

1. Aplicar la migración aditiva 20261102160000_client_pause y generar Prisma antes de publicar el código.
2. Definir CRON_SECRET en el entorno del despliegue. No publicar el token. Vercel ejecuta /api/cron/client-pauses cada hora con autenticación Bearer.
3. El día 1 del mes en America/Santiago las pausas vencidas pasan a Pendiente. También se comprueban vencimientos al cargar clientes desde una sesión staff autorizada para que el desarrollo no dependa de cron.
4. Cada actualización de estado y su nota es atómica. SKIP LOCKED evita carreras entre tareas. Se procesan 1.000 por lote y hasta 20 lotes en cron; complete=false indica que debe continuar en otra ejecución.
5. Si falta CRON_SECRET, cron responde 503; un token ausente/incorrecto responde 401. La consulta staff autorizada conserva la comprobación de vencimientos.

## Verificación

- scripts/test-client-pause.ts: validación de mes, permisos específicos, estados, exclusión de pendientes/anualidad y preservación del embudo.
- scripts/test-client-pause-db.ts: solamente desarrollo, crea un cliente ficticio. Prueba permisos, agenda, retorno manual/automático, concurrencia e idempotencia. Por defecto elimina el cliente ficticio y verifica hashes de todos los clientes y cotizaciones originales. Solo --keep-fixture lo conserva para validación visual; retirar luego con cleanup-client-pause-test.ts.
- scripts/test-client-pause-cron.ts: solamente desarrollo, prueba la autenticación de cron y su ejecución sin duplicados.
- Evidencia de este cambio: Store/2026-11-02/clientes-pausados/.

Los reportes mantienen el conteo por estado, pero no presentan las agendas de pausados como atrasadas. En pausa y Pendiente no se interpretan como un primer contacto completado.
