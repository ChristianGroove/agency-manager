# Marketing: seguridad de borradores y control del worker

Estado: primera etapa implementada; **no habilitar campañas reales todavía**.
La continuación y el estado actualizado de los bloqueos están en [implementation-stage-2.md](./implementation-stage-2.md).
Rama: `codex/marketing-campaign-hardening`, basada en `b4a2428a` (ajustes del Inbox).
La auditoría del 9 de octubre tiene 28 hallazgos. Este cambio cierra la primera etapa, no certifica todo el módulo.

## Cambios

- Todas las acciones de Marketing comprueban sesión, membresía vigente, permiso específico y organización activa. Se eliminó la selección por nombre de organización y la creación automática de tenants.
- La eliminación de audiencias usa sesión/RLS y un filtro explícito de tenant; ya no usa una clave de servicio sin autorización.
- Se añadieron permisos de ver, diseñar, ejecutar, importar y exportar a la pantalla de roles, dentro de `crm_broadcasts`. Administradores y dueños conservan acceso por defecto; las denegaciones explícitas y las membresías bloqueadas prevalecen.
- La migración reemplaza las políticas permisivas de las seis tablas de Marketing/difusión. No abre escrituras de inscripciones a usuarios.
- Los triggers validan relaciones de organización y congelan diseños ejecutados. La eliminación de borradores limpia secuencias y pasos; las campañas ejecutadas se deben archivar.
- El worker usa el cliente interno y claims de 90 segundos con `SKIP LOCKED`, máximo 25 trabajos por ciclo y presupuesto de 45 segundos. Los checkpoints verifican errores y la posesión del claim.
- El worker exige campaña activa, versión de ejecución 2 y canal explícito. Los datos antiguos no se activan ni se reasignan por esta migración.
- Solo las operaciones `campaign:<enrollment>:<step>` pasan por la nueva comprobación de pausa en el outbox, antes del claim y otra vez antes del emisor. Una petición ya en vuelo o aceptada por Meta no se puede retirar.
- Los retrasos admiten `value` y el formato anterior `duration`; el constructor guarda `value`. El guardado de configuración persiste también `scheduled_for` en UTC.
- Se retiró el emisor de difusiones que simulaba entregas al 95%. Los KPI consultan operaciones aceptadas y estados reales de mensajes, no los contadores simulados. La etiqueta de entrega ya no se llama engagement.
- La campaña rápida guarda un borrador. La UI avisa que el módulo está en preparación, recarga la lista al guardar y no ofrece TTL sin soporte. Se retiraron las promesas de anti-ban, listas frías y evasión de bots.

## Alcance de mensajería compartida

No se cambiaron adapters, formatos multimedia, credenciales, parsers de recepción, asignación, automatizaciones, embudo ni la conciliación general de estados del Inbox. El único cambio al envío común es un guard adicional **condicionado a una clave de operación de campaña**. Los demás emisores no consultan las tablas de Marketing.

La baja manual autorizada sí conserva su propósito: marca `marketing_opted_out` y cancela inscripciones del mismo tenant. No se conectó todavía un detector automático de bajas a los mensajes entrantes.

## Bloqueos que quedan para la siguiente etapa

La activación y la importación de Marketing retornan un error explícito sin inscribir ni importar contactos. No basta con quitar esas protecciones: primero hay que completar:

1. Activación transaccional, snapshot inmutable de audiencia/contenido y reanudación sin reinscripción. Campaña rápida y avanzada deben usar el mismo contrato.
2. Selector de conexión y plantillas por canal; validación completa de BODY, HEADER y botones, incluyendo variables nombradas y datos faltantes por destinatario.
3. Evidencia de consentimiento, revocación por destinatario y baja automática sin alterar las automatizaciones del Inbox. No interpretar `marketing_opted_out=false` como opt-in.
4. Importación CSV con preview, normalización internacional, duplicados y consentimiento. No usar el índice inexistente organización/teléfono ni agregar unicidad global a leads.
5. Pacing efectivo compartido por conexión, equidad entre campañas, zona IANA, revalidación de horario y recuperación sin ráfagas. Los intervalos actuales siguen siendo referencias de configuración.
6. Salud de número/plantilla, clasificación de errores y conciliación de resultados ambiguos. La infraestructura existente sigue evitando reenvíos ciegos.
7. Finalización de campaña, eventos por destinatario/paso, historial y métricas completas, búsqueda, paginación y exportación. El detalle de campaña todavía muestra conteos de ejecución, no un reporte completo de entregas.
8. Estimación/presupuesto opcional con fuentes y tarifas versionadas; no cobros dentro de Pixy. Carga sintética de volumen y validación real pequeña con destinatarios autorizados.

Los campos `execution_version`, `execution_snapshot`, `recipient` y `connection_id` preparan ese contrato; no existe aún una ruta de usuario que habilite ejecuciones de versión 2.

## Validación y operación

- Migración aplicada y probada **únicamente en Docker local** (`supabase_db_agency-manager`). No se aplicó en producción ni se modificaron tareas de Coolify/webhooks.
- Pruebas unitarias: permisos, denegaciones entre tenants, validación de payloads, bloqueo de caminos incompletos, campaña pausada, baja, relaciones cruzadas, retrasos y checkpoints fallidos.
- Pruebas SQL: RLS real, usuario bloqueado, denegación explícita, RPC interno inaccesible a usuarios, vínculos de canal/secuencia inválidos, unicidad por campaña/destinatario, lease vigente, congelamiento de diseño, pausa del outbox y cascada de borrador. El script `scripts/tests/marketing-security.sql` usa una transacción y hace `ROLLBACK`.
- Regresión: suites existentes de mensajería, canales, coexistencia, audio, estados y asignación. Las pruebas de onboarding requieren una `ENCRYPTION_KEY` ficticia de al menos 32 bytes en el proceso de pruebas; no usan claves reales ni acceden a Meta.
- TypeScript y build de Next.js comprobados localmente. Las advertencias locales existentes de claves de Flows pertenecen a otro módulo.

No configurar ni activar el scheduler de Marketing hasta superar los bloqueos anteriores. El mantenimiento de Meta y el worker de campañas siguen siendo tareas distintas.
