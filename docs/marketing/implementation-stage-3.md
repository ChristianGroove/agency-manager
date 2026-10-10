# Marketing: activación transaccional y procesamiento con ritmo compartido

Esta etapa está implementada en `codex/marketing-campaign-hardening`, después de las etapas 1 y 2. No activa campañas existentes ni habilita emisiones en producción.

La [etapa 4](implementation-stage-4.md) completa posteriormente las bajas entrantes, las métricas agregadas y el cierre básico descritos aquí como pendientes. Los demás pendientes conservan su vigencia.

## Activación y reanudación

La acción exige permisos de ejecución y acceso al número emisor. Consulta el diseño guardado con una lectura consistente, aplica las mismas validaciones de plantillas, variables, audiencia y horarios que la revisión, y entrega a la transacción la huella calculada por la base de datos. El navegador no puede aportar su propia aprobación de diseño ni suplantar al actor.

La transacción bloquea la campaña, vuelve a comprobar la huella y la membresía con permiso de ejecución. Inscribe destinatarios únicos con consentimiento vigente, conserva nombre/empresa/teléfono del momento de activación y guarda el diseño aprobado, actor, fecha y cantidad. Una falla en cualquier escritura revierte la activación y todas las inscripciones. Una segunda activación no duplica destinatarios. Reanudar conserva las inscripciones originales: no incorpora contactos añadidos posteriormente a la audiencia.

Los pasos, canal, horario y snapshots quedan protegidos contra modificaciones después de activar. El consentimiento, la baja, el teléfono actual, la conexión y la aprobación de la plantilla se vuelven a verificar antes de emitir; guardar un snapshot no convierte una autorización revocada en permiso permanente. Los componentes de la plantilla se resuelven con el contrato actual del adapter existente, usando las variables conservadas del destinatario.

## Cola, ritmo y conversaciones

- Las operaciones `campaign:` reservan un intervalo en SQL, compartido por identificador físico del número de Meta. Se bloquea esa fila durante la reserva; diferentes campañas no pueden reservar simultáneamente el mismo intervalo. El número debe tener `phone_number_id` o `asset_id` en su conexión.
- Los intervalos mínimos actuales son 180, 30 y 5 segundos para los tres modos existentes. La variación opcional solo añade espera, nunca reduce el mínimo. Estos valores son controles de capacidad de Pixy; no certifican límites de Meta ni garantizan ausencia de restricciones.
- La reserva ocurre después de adquirir la operación del outbox y justo antes del adapter. La recuperación también respeta el horario IANA, su hora de cierre exclusiva, la programación y el próximo instante disponible. Una falla de validación o de base de datos impide emitir.
- La adquisición toma como máximo un trabajo por conexión en cada lote, con leases y `SKIP LOCKED`. El ritmo compartido sigue siendo necesario si se ejecutan varios ciclos concurrentes o hay varias conexiones para un número físico.
- Un envío conocido como `queued` o `sending` difiere el trabajo sin marcarlo fallido ni avanzar su paso. Reutiliza la misma clave de operación. Solo la aceptación con identificador externo permite avanzar; `unknown` y `failed` requieren revisión y no generan un reenvío ciego.
- La creación de conversaciones usa un RPC exclusivo de Marketing con bloqueo por organización/contacto/conexión y respeta `state='active'`. Se corrigió el uso de la columna inexistente `conversations.source`; el origen se guarda en `metadata`. No se reescriben conversaciones antiguas ni se cambian asignaciones.

La reserva autoriza un instante de despacho, no equivale a entrega. Una pausa o baja no puede retirar una solicitud ya enviada o aceptada por Meta. Una caída después de reservar puede perder un intervalo, pero no justifica repetir un resultado ambiguo.

## Bloqueo de activación del entorno

`MARKETING_EXECUTION_ENABLED` debe ser exactamente `true` para activar campañas, adquirir trabajos o recuperar emisiones de campaña. Su ausencia mantiene los tres caminos deshabilitados. No se añadió ni habilitó esta variable en `.env.local` o Coolify. El constructor recibe únicamente la disponibilidad booleana del servidor; conserva la posibilidad de pausar una campaña activa y diferencia activar de reanudar.

**No habilitar aún esa variable en producción.** Faltan bajas automáticas entrantes, salud real del número/plantilla, cierre y métricas completas de campañas, dimensionamiento del scheduler y validación de carga/Meta Live. La bandera protege esta etapa en desarrollo; no es una instrucción para poner en marcha campañas incompletas.

El control de intervalos tampoco crea un scheduler. La frecuencia real de invocación limita el rendimiento: un cron por minuto no consigue un envío cada cinco segundos por número. Antes de habilitar hay que dimensionar la cadencia, duración de los ciclos, conexiones simultáneas y presupuesto de ejecución para Coolify. No se configuró ninguna tarea externa en esta etapa.

## Validación y límites

Migración nueva: `20261009160000_marketing_activation_and_pacing.sql`. Se aplicó solo a Supabase Docker local. Las pruebas SQL crean fixtures sintéticos y terminan con `ROLLBACK`: huella obsoleta, actor no autorizado, rollback final, deduplicación de 1.101 contactos, idempotencia, reanudación sin reinscripción, snapshots inmutables, conversación reutilizable, bloqueo entre campañas del mismo número y horarios IANA/DST.

Las pruebas unitarias cubren bloqueo por entorno, revisión final, acceso al canal, datos conservados del destinatario, cola recuperable, resultados ambiguos y reserva antes de emitir. La regresión de Mensajería/Meta/Canales también verifica los flujos existentes de estados y multimedia. No se cambiaron sus adapters, recepción, asignaciones ni automatizaciones; el cambio del emisor compartido está condicionado a las claves `campaign:`.

Las pruebas de esta etapa usan mocks o SQL sin llamadas a Meta. No prueban entregabilidad real, cuotas o calidad actuales del número, todos los componentes de plantillas en Meta Live, ni capacidad a escala de producción. No se enviaron campañas reales ni se hizo deploy.

Pendientes principales: bajas entrantes y renovación explícita; salud y errores accionables; scheduler; finalización, historial y métricas completas; CSV revisable con evidencia; estimación opcional de presupuesto; prueba de carga y prueba pequeña autorizada antes de producción. Los pagos permanecen en Meta.

## Deuda que sigue abierta y solución prevista

| Prioridad | Falta | Solución y criterio de cierre |
|---|---|---|
| P0 | Baja automática entrante | Detectar el botón de baja y solicitudes inequívocas después de persistir el mensaje entrante. Registrar la revocación y cancelar las inscripciones usando el mismo servicio transaccional, sin omitir recepción, notificaciones o automatizaciones del Inbox. Reintentar el registro si la base de datos falla; no interpretar cualquier «no» como baja. |
| P0 | Salud real y errores de Meta | Usar los estados sincronizados de número/plantilla y errores sanitizados del outbox para bloquear restricciones conocidas. Distinguir congestión recuperable, configuración pendiente y resultado ambiguo. Mostrar motivo y acción al administrador; nunca reemitir un resultado ambiguo por un retry genérico. |
| P0 | Scheduler y capacidad demostrada | Dimensionar una cadencia que haga efectivos los intervalos, validar ciclos concurrentes y límites de conexión/tiempo con una carga sintética representativa. Verificar recuperación después de caída y equidad entre números. Los tests actuales no son una prueba de carga. |
| P0 | Cierre y trazabilidad de la campaña | Finalizar cuando no queden inscripciones ejecutables, conservando resultados fallidos y ambiguos visibles. Agregar métricas SQL por campaña y paso; separar inscripción, aceptación, entrega y lectura. Un porcentaje de completados no debe presentarse como entregabilidad. |
| P1 | Renovación explícita de consentimiento | Crear una acción independiente con evidencia posterior a la baja, confirmación específica y auditoría. No reutilizar la importación ordinaria para borrar una revocación. |
| P1 | Importación CSV | Mantener la ruta antigua bloqueada hasta tener previsualización con teléfonos internacionales, duplicados, errores por fila, evidencia y permisos de importación. Usar lotes acotados y una confirmación informada del resultado, respetando las bajas existentes. |
| P1 | UX de operación completa | Presentar revisión final y destinatarios antes de activar, estado real del motor y scheduler, errores accionables, historial paginado y exportación segura. Aclarar cambios sin guardar y conservar la audiencia original al reanudar. |
| P2 | Presupuesto estimado | Solo si se habilita esa funcionalidad: estimar con categoría, país y tarifas oficiales vigentes, indicando la incertidumbre y diferenciando estimación de cargos reales. No implementar cobros de Pixy ni pedir tarjetas; la facturación del canal queda en Meta. |

La ejecución permanece bloqueada mientras se cierran los P0 y se valida una campaña pequeña con destinatarios de prueba autorizados. No hace falta modificar webhooks de producción para completar las pruebas sintéticas del motor.
