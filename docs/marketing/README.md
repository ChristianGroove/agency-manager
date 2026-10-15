# Campañas masivas: documentación vigente

Actualizado el **15 de octubre de 2026**, sobre `master`, después de los commits locales `44afadce` y `372884cb`. Esta revisión cierra la interfaz y los flujos locales de WhatsApp/email; no acredita entregas reales ni habilita producción.

## Estado actual

WhatsApp mediante plantillas aprobadas y email mediante SMTP verificado comparten creación, edición, listas, autorización, programación y actividad. El modal principal tiene dos pestañas: **Preparación** y **Actividad**. Iniciar, programar y reanudar son acciones directas con guardado y validación del servidor; se retiró la confirmación visual redundante.

La revisión incluye modales de importación y autorización más compactos, protección de cambios pendientes, recuperación de guardados parciales, métricas diferenciadas por canal y catorce ejemplos interactivos aislados, disponibles solo en desarrollo. Los envíos locales permanecen deshabilitados.

**Validación local:** 295 pruebas en 30 archivos, ocho suites SQL con rollback, ensayo de concurrencia sin leases duplicados, recorrido visual autenticado y build completo de producción en una copia aislada. El detalle y sus límites están en la [verificación integrada](integrated-verification-2026-10-15.md). El piloto con proveedores reales fue aplazado por el usuario.

## Qué consultar

| Documento | Contenido |
|---|---|
| [Estado del módulo y pendientes](module-state-2026-10-15.md) | Flujos completos, estados, permisos, configuración, operación, límites y próximos pasos |
| [Cierre de interfaz y ejemplos](ui-flows-closeout-2026-10-15.md) | Organización de los dos tabs, decisiones de UX y catorce escenarios de revisión |
| [Verificación integrada local](integrated-verification-2026-10-15.md) | Base real, worker apagado, concurrencia, pruebas, build y alcance de la evidencia |
| [Arquitectura](../2-architecture/modules/broadcasts-architecture.md) | Componentes, datos, aislamiento y ejecución |
| [Etapa 14: email](implementation-stage-14.md) | Transporte SMTP, bajas, outbox y requisitos de configuración |

## Pendiente antes de operar con envíos reales

1. Retomar el piloto cuando el usuario lo decida: organización concreta, emisores propios y destinatarios autorizados. La organización abierta no tiene emisor disponible y no hay SMTP configurado en local.
2. Confirmar la versión desplegada, el contrato de base, la configuración y el programador del destino. Los registros remotos del 13 de octubre son antecedentes; esta revisión no volvió a consultar ni modificar producción.
3. Configurar/verificar el emisor WhatsApp o SMTP y el cifrado compatible. Comprobar el flujo real de crear, guardar y reabrir con ese emisor.
4. Autorizar un piloto pequeño, comprobar recepción, estados, baja, respuesta WhatsApp, pausa y reanudación. Habilitar ejecución gradualmente después de esas comprobaciones.
5. Cerrar el procedimiento de resolución de resultados SMTP inciertos con evidencia y trazabilidad antes de una operación masiva sostenida.

SMS, rebotes/quejas email y recepción de respuestas email en Inbox no están implementados. La aceptación SMTP se muestra como aceptación, sin atribuir entrega, lectura o apertura. El [estado del módulo](module-state-2026-10-15.md) distingue estos límites de los pendientes de puesta en marcha.

## Esquema y antecedentes de despliegue

Las dieciséis migraciones canónicas, en `supabase/migrations/`, son:

1. `20261009120000_marketing_security_and_claims.sql`
2. `20261009143000_marketing_consent_and_preflight.sql`
3. `20261009160000_marketing_activation_and_pacing.sql`
4. `20261009173000_marketing_opt_out_and_results.sql`
5. `20261009200000_marketing_health_and_runtime.sql`
6. `20261010003000_marketing_history.sql`
7. `20261010020000_marketing_reviewed_operations.sql`
8. `20261010040000_marketing_workspace.sql`
9. `20261010050000_marketing_editor_controls.sql`
10. `20261010060000_marketing_contact_lists.sql`
11. `20261010070000_marketing_simple_lists.sql`
12. `20261010080000_marketing_recipient_followups.sql`
13. `20261011120000_marketing_email_campaigns.sql`
14. `20261011123000_marketing_email_lists.sql`
15. `20261011130000_marketing_email_integration.sql`
16. `20261011133000_marketing_email_permission.sql`

El [preflight remoto](production-preflight-2026-10-13.md) es anterior al [cierre de base](production-db-closeout-2026-10-13.md), que registra su aplicación autorizada el 13 de octubre. La [configuración en Coolify](production-activation-2026-10-13.md) registra la variable Runtime y el programador preparados entonces para el deploy manual. Ninguno de esos documentos demuestra por sí solo el estado remoto del 15 de octubre.

En local existen los contratos y pasan las suites SQL, aunque el ledger no contiene esas dieciséis versiones. **No reaplicar migraciones siguiendo una lista histórica:** comparar objetos, versiones y destino antes de actuar. Los índices de seguimiento/frecuencia pueden requerir preparación concurrente en bases grandes; ver [etapa 13](implementation-stage-13.md).

## Operación resumida

El programador usa `node scripts/marketing-worker.mjs` dentro del contenedor de la aplicación, cada minuto, con timeout de 120 segundos. Requiere `CRON_SECRET`, `PORT` y `MARKETING_EXECUTION_ENABLED`; deshabilitado termina sin solicitar envíos. El cron de mantenimiento de canales Meta es distinto.

Ante incidencias: pausar campañas afectadas y deshabilitar nuevos ciclos, conservar outbox/historial e investigar resultados inciertos. El flag no retira solicitudes que ya están en curso. No borrar operaciones para forzar un reenvío. El [manual del módulo](module-state-2026-10-15.md) desarrolla el procedimiento y los límites.

## Historial de implementación

Los reportes siguientes conservan las decisiones y evidencias de cada etapa; sus listas de pendientes no sustituyen el estado vigente de esta página:

- [Auditoría inicial de producto y UX](product-scope-and-ux-audit.md).
- [Etapa 1: motor](implementation-stage-1.md), [etapa 7: operaciones revisadas](implementation-stage-7.md), [etapa 8: paginación](implementation-stage-8.md), [etapa 9: editor](implementation-stage-9.md).
- [Etapa 10: espacio flotante](implementation-stage-10.md), [etapa 11: listas y CRM](implementation-stage-11.md), [etapa 12: importación y autorización por lista](implementation-stage-12.md), [etapa 13: respuestas y frecuencia](implementation-stage-13.md), [etapa 14: SMTP](implementation-stage-14.md).
- [Sincronización del 11 de octubre](master-sync-2026-10-11.md) y [sincronización del 13 de octubre](master-sync-2026-10-13.md).
