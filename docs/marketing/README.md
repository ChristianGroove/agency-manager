# Campañas masivas: cierre de implementación

Fecha de actualización: 13 de octubre de 2026. Rama: `codex/marketing-campaign-hardening`.
La referencia anterior `8f82db13` corresponde a las etapas 1–13. La [etapa 14](implementation-stage-14.md) integra campañas de email con SMTP del tenant.

La rama incorpora también `master` en `fadd9ed7` (alta y activación de tenants). El [informe de sincronización](master-sync-2026-10-11.md) documenta el merge, su validación y la migración adicional requerida antes del despliegue.

La [segunda sincronización del 13 de octubre](master-sync-2026-10-13.md) incorpora `master` en `c5918870` (robot, ayuda y permisos de Tasks). Su informe actualiza la evidencia y enlaza el cierre de las migraciones de ayuda/tenants ya aplicado en el trabajo de esa rama.

El [preflight de producción](production-preflight-2026-10-13.md) confirma el destino y las 16 migraciones de Marketing pendientes mediante consultas reales y un dry-run acotado; documenta índices y el punto de recuperación antes de aplicarlas.

## Estado de entrega

La implementación actual está terminada y guardada localmente. Se ha comprobado con pruebas automatizadas y build, pero **no está habilitada para envíos masivos en producción**. Las migraciones de Marketing se aplicaron únicamente en Supabase Docker local. La revisión visual autenticada y una campaña real pequeña siguen pendientes.

WhatsApp y email mediante SMTP verificado comparten el flujo de campañas; SMS sigue aplazado. Email tiene permisos, bajas y outbox propios, sin sustituir el transporte Meta ni los correos transaccionales. SMTP solo acredita aceptación del servidor. Consulta la [etapa 14](implementation-stage-14.md) para migraciones, configuración y límites.

## Alcance implementado

- Producto **Campañas masivas**, con WhatsApp y email integrados en esta versión local. Meta Ads conserva su módulo independiente.
- Listado paginado con búsqueda y estados reales. Crear/abrir una campaña usa un espacio flotante; los enlaces directos siguen disponibles.
- Orden: canal, mensaje, destinatarios, revisión y envío. Actividad concentra resultados/historial. Filtros adicionales, segmentos y programación son opcionales.
- Plantillas WhatsApp validadas y variables por destinatario. Una secuencia principal de mensajes y esperas, con controles de orden y protección del diseño activado.
- Listas importadas con nombre y contactos compartidos con CRM. CSV de WhatsApp: teléfono obligatorio, nombre/email opcionales; email: email obligatorio y nombre opcional; hasta 1.000 filas y 5 MB. El formato antiguo con evidencia individual mantiene 100 filas y 1 MB.
- Importar guarda contactos, no envía ni concede autorización. La declaración explícita de autorización externa puede registrarse una vez por lista, con actor/fecha; Pixy no verifica retrospectivamente cómo se obtuvo. Bajas y revocaciones no se revierten por esa declaración.
- Revisión final con elegibles/exclusiones. Confirmación ligada al actor, organización, operación, contenido y audiencia; ticket de 10 minutos, invalidable ante cambios.
- Activación/snapshot transaccionales, idempotencia, pausa/reanudación sin reinscribir y recuperación de resultados inciertos sin reenvío ciego.
- Ritmo por número físico compartido entre campañas, ventana horaria y variación opcional. Conservador, Equilibrado y Rápido indican cadencia; no garantizan evitar restricciones de Meta.
- Espera opcional por destinatario entre campañas de una organización: 0–720 horas. Nuevos borradores proponen 24 horas; campañas antiguas sin ese campo conservan su configuración. El último contacto aceptado se conserva aunque falle un seguimiento posterior.
- En WhatsApp, respuestas reales detienen siguientes pasos de esa inscripción. Se comprueban al procesar/recuperar el siguiente paso y antes de reservar otro envío. No es cancelación instantánea por webhook ni puede retirar una solicitud ya enviada a Meta.
- Resultados distinguen procesamiento, aceptación, entrega, lectura y fallos. Historial paginado y exportación CSV protegidos por organización/permisos.

## Relación con CRM e Inbox

Contactos nuevos importados quedan como `prospect`/`marketing_contact`, fuera del pipeline comercial. Importación, entrega, lectura y respuesta no los convierten automáticamente en oportunidades. Una transición explícita a una etapa comercial activa los convierte en `lead` mediante las reglas existentes.

Identidad, asignación y etapa de contactos existentes se conservan. Las consultas de analítica de leads se ajustaron a `contact_type='lead'`: este cambio sí modifica qué tipos aparecen en esos indicadores, sin reescribir registros históricos.

Los controles añadidos al outbox se condicionan a operaciones de campaña. No se sustituyen adapters, webhooks entrantes, conciliación general de estados, formatos multimedia o automatizaciones existentes. Las pruebas de regresión respaldan ese alcance; no sustituyen una verificación real de producción.

## Evidencia de validación

La [etapa 14](implementation-stage-14.md) añade email y está validada localmente:

- 271 pruebas de Marketing, rutas y SMTP en 29 archivos.
- 242 pruebas de regresión de canales, mensajería, CRM y notificaciones en 60 archivos; seis pruebas SMTP están incluidas en ambos recorridos.
- Ocho suites SQL con fixtures sintéticos y rollback, incluyendo email.
- Build `next build --webpack` completo y TypeScript correctos.
- Preview aislado en `localhost:3002`, con envíos deshabilitados y base Docker local. La sesión anterior caducó; falta el recorrido visual autenticado y el envío SMTP real controlado.

La evidencia histórica de la [etapa 13](implementation-stage-13.md) se conserva para comparación:

- 253 pruebas distintas de Marketing/outbox en 26 archivos. El recorrido completo inicial tenía 252; la prueba adicional de cancelación concurrente se comprobó después en el archivo del worker.
- Siete suites SQL locales con datos sintéticos y `ROLLBACK`: seguridad, operaciones revisadas, workspace, editor, listas, listas simples y respuesta/frecuencia.
- 260 pruebas distintas de regresión en 71 archivos. Cinco fallos iniciales de onboarding por ausencia de clave de cifrado del proceso se resolvieron al ejecutar ese archivo con una clave ficticia; no se cambió configuración ni código de onboarding.
- TypeScript y build local correctos; aviso previo de configuración local de FlowsCrypto conservado.
- Proveedores simulados: no son pruebas Meta Live, de volumen real ni de entrega a destinatarios.

Las evidencias detalladas y limitaciones se conservan en los reportes por etapa. No se atribuyen pruebas simuladas a entrega real o a producción.

## Preparación de producción pendiente

1. Revisar visualmente preparación, importación, declaración por lista, cierre con cambios pendientes y actividad con una sesión de prueba.
2. Integrar esta rama mediante revisión habitual. Este cierre no hace merge, push ni despliegue; el repositorio principal puede estar trabajando en otra rama.
3. Comprobar respaldo/esquema del destino. Aplicar solo migraciones pendientes en orden, con dependencias Meta/CRM disponibles; no reproducir migraciones archivadas sobre una base existente.
4. Desplegar aplicación/esquema compatibles manteniendo `MARKETING_EXECUTION_ENABLED` deshabilitado. No habilitar mientras falte alguna dependencia.
5. Configurar el programador de campañas y verificar permisos/credenciales, salud del canal y plantillas. No confundirlo con la tarea de mantenimiento de canales Meta.
6. Autorizar una campaña pequeña con destinatarios de prueba que hayan dado permiso; comprobar recepción, estados, pausa, baja, respuesta y seguimiento antes de habilitar gradualmente.

### Migraciones de esta implementación

Orden cronológico; archivos en `supabase/migrations/`:

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

La migración de seguimiento/frecuencia añade índices de mensajes/outbox. En una base grande, su creación normal puede bloquear escrituras. La [etapa 13](implementation-stage-13.md) explica cómo prepararlos con `CREATE INDEX CONCURRENTLY` fuera de una transacción y reutilizarlos mediante `IF NOT EXISTS`. Preparar ese paso sobre el esquema/volumen reales antes del despliegue.

### Programador en Coolify

Lanzador: `node scripts/marketing-worker.mjs`, dentro del contenedor de la aplicación. Puede programarse cada minuto (`* * * * *`) con timeout de 120 segundos. La ventana de inicio de ciclos dura 45 segundos y una última solicitud puede ocupar hasta otros 55 segundos. No se ha configurado en producción en este trabajo.

Lee `MARKETING_EXECUTION_ENABLED`, `CRON_SECRET` y `PORT` del entorno del contenedor. Deshabilitado, termina sin solicitar envíos. Habilitado, llama a `127.0.0.1:<PORT>/api/marketing/run` con el secreto y comprueba el resultado. No incluir el secreto literalmente en comandos ni documentación/logs.

Realiza ciclos con separación mínima aproximada de cinco segundos durante una ventana de 45 segundos; no interrumpe artificialmente la solicitud final. El motor adquiere hasta 25 trabajos/ciclo y deja de comenzar nuevos trabajos tras 15 segundos para reservar tiempo de llamada/finalización. La cadencia por número se aplica en SQL; aumentar el cron no la anula.

Ante incidencias: deshabilitar nuevas ejecuciones y pausar campañas afectadas, conservar resultados inciertos y revisar el historial. Deshabilitar el flag no retira solicitudes en curso. No borrar outbox ni reactivar resultados ambiguos como si nunca se hubieran enviado. Un rollback de aplicación debe ser compatible con esquema/configuración existentes; no se prescribe un down destructivo automático.

## Deuda y trabajo aplazado

| Pendiente | Siguiente acción |
|---|---|
| SMS | Integrar proveedor por tenant, despacho, estados y bajas antes de habilitar. |
| Email: eventos y respuestas | SMTP está integrado; faltan eventos de entrega/rebotes/quejas y recepción de respuestas en Inbox. SMTP no acredita entrega ni lectura. |
| SMTP heredado | Revisar cifrado por defecto y migrar credenciales antes de cambiar `SMTP_ENC_KEY`; preservar correo transaccional. |
| Email incierto | Comprobar registros del proveedor y resolver administrativamente; no hay reenvío automático ni conciliación por webhook en esta etapa. |
| Importaciones mayores de 1.000 | Job por lotes con archivo privado, progreso y cancelación; medir antes de ampliar trabajo síncrono. |
| Audiencias grandes/capacidad | Medir consultas, latencia, equidad y throughput; decidir lotes/concurrencia limitada preservando idempotencia y ritmo. |
| Retención de revisiones/historial | Definir conservación y limpieza, revisar cascadas al eliminar contactos y probar recuperación/auditoría. |
| Presupuestos/precios | Estimaciones con tarifas verificadas/versionadas y consumo trazable; sin cobros ni costes ficticios en esta versión. |
| Atribución comercial | Definir respuesta/oportunidad atribuible; entrega/lectura no equivale a conversión. |
| Usabilidad/validación real | Recorrido autenticado y campaña pequeña antes de declarar producción habilitada. |

## Referencias

- [Arquitectura vigente](../2-architecture/modules/broadcasts-architecture.md).
- [Auditoría inicial de producto/UX](product-scope-and-ux-audit.md), diagnóstico histórico.
- [Etapa 1: motor y controles](implementation-stage-1.md), [etapa 7: operaciones revisadas](implementation-stage-7.md).
- [Etapa 8: simplificación/paginación](implementation-stage-8.md), [etapa 9: editor](implementation-stage-9.md).
- [Etapa 10: alcance multicanal/espacio flotante](implementation-stage-10.md).
- [Etapa 11: listas/CRM](implementation-stage-11.md).
- [Etapa 12: CSV simple/autorización por lista](implementation-stage-12.md).
- [Etapa 13: respuestas/frecuencia](implementation-stage-13.md).
