# Marketing: bajas entrantes, resultados y cierre de campañas

Implementado en `codex/marketing-campaign-hardening`, después de las etapas 1–3. Esta etapa no habilita campañas, envía mensajes reales ni modifica producción. La migración nueva se aplicó exclusivamente a Supabase Docker local.

## Bajas de promociones

Un mensaje entrante nuevo de WhatsApp registra una solicitud duradera si contiene el botón con payload `BAJA_PROMOCIONES` o una frase inequívoca admitida: `STOP`, `unsubscribe`, `baja`, `baja_promociones`, `stop marketing messages`, `unsubscribe from marketing`, `no quiero recibir promociones`, `no quiero recibir más promociones`, `no me envíen más promociones`, `dejen de enviarme promociones`, `quiero darme de baja` o `quiero darme de baja de las promociones`. Se normalizan mayúsculas, acentos, espacios y puntuación exterior. No se interpreta un «no», la cancelación de un pedido ni cualquier coincidencia parcial como baja.

La captura SQL exige un mensaje insertado por el servicio, con identificador externo y remitente concordante con la conversación, contacto, organización y conexión WhatsApp. Ignora ecos y mensajes históricos. No existe backfill sobre conversaciones antiguas. Un fallo de contexto impide guardar esa solicitud y mantiene el evento Meta pendiente de recuperación; no se atribuye una baja a otro destinatario.

La solicitud se guarda en la misma transacción que el mensaje. Desde su commit, `marketing_recipient_allowed` bloquea al destinatario mientras esté pendiente, tanto en el worker como en la validación del outbox de campañas. Esto también bloquea audiencias y activaciones nuevas. La recepción ordinaria no añade consultas de Marketing para mensajes que no sean solicitudes reconocidas. La eliminación posterior del mensaje no elimina la solicitud ni restaura consentimiento.

Después de persistir, el Inbox intenta procesar únicamente esa solicitud. El servicio transaccional existente registra evidencia de revocación, actualiza contactos duplicados del mismo tenant y cancela inscripciones. Conserva la recepción y las automatizaciones existentes aunque falle este procesamiento. El cron de mantenimiento existente recupera hasta cinco solicitudes por ciclo, incluso con `MARKETING_EXECUTION_ENABLED` deshabilitado. Hay adquisición con `SKIP LOCKED`, timeout de espera de bloqueos de dos segundos, intentos y reintento tras cinco minutos; un fallo revierte cambios parciales de preferencias y conserva el bloqueo inmediato. La recepción no mantiene bloqueos de campañas/contactos mientras inserta el mensaje: se evita mezclar ese trabajo con los bloqueos habituales de conversaciones del Inbox.

La identidad del mensaje impide procesar dos veces la misma solicitud. Los permisos del navegador no permiten ejecutar los RPC de procesamiento ni crear solicitudes de baja directamente. El mantenimiento informa conteos de solicitudes procesadas/fallidas y devuelve error si hubo fallos. Los logs de esa recuperación no contienen texto, teléfonos ni credenciales.

Esta protección no puede retirar un mensaje que ya estuviera en tránsito hacia Meta al recibirse la baja. El reconocimiento es deliberadamente limitado a las frases documentadas; las solicitudes distintas requieren gestión manual de la baja. Renovar consentimiento después de una revocación sigue necesitando un flujo independiente con evidencia, aún pendiente.

## Resultados y finalización

Un RPC con permiso de lectura devuelve una instantánea por organización/campaña: inscripciones totales, activas, completadas, fallidas y canceladas; operaciones en cola, enviándose, aceptadas, entregadas, leídas, fallidas y ambiguas; y las diez inscripciones con actividad más reciente. No descarga toda la audiencia al navegador ni depende del límite de 1.000 filas de REST. Los errores de lectura muestran información no disponible, sin inventar ceros.

El vínculo con el outbox utiliza la clave de operación estable, organización y conexión de campaña. Entrega y lectura provienen del estado persistido del mensaje; un rechazo posterior a la aceptación también cuenta como fallo. Los indicadores no son categorías excluyentes: leídos está incluido en entregados, y ambos están incluidos en aceptados. Un mensaje aceptado puede fallar posteriormente. Los conteos representan operaciones de mensajes; una campaña con varios pasos puede tener más mensajes que destinatarios.

El worker finaliza hasta 25 campañas activas de versión 2 cuando todas sus inscripciones son terminales y no quedan operaciones pendientes o ambiguas. Limpia operaciones todavía en cola de inscripciones canceladas/fallidas; preserva mensajes con aceptación externa. Una operación `sending` o `unknown` impide el cierre y no dispara reenvío. Las pausas del usuario se conservan y la finalización es idempotente. «Completada» describe el procesamiento; no certifica entrega de todos los mensajes.

Resultados está disponible también en borradores. La interfaz diferencia aceptación, entrega y lectura, presenta errores de ejecución y resultados ambiguos, y permite actualizar la información. Se retiraron las afirmaciones de «tiempo real» y «procesando activamente» sin evidencia. La tarjeta de configuración muestra si la ejecución está deshabilitada o la campaña está en borrador/pausa; no certifica que el scheduler esté funcionando.

## Verificación y límites

- SQL sintético en Docker local, dentro de una transacción con `ROLLBACK`: captura, bloqueo inmediato, fallo y reintento de preferencias, ausencia de efectos en otro tenant, duplicados, eliminación de historial, permisos/RLS, resultados de entrega/lectura/fallo y cierre idempotente sin cerrar pausas ni resultados ambiguos.
- Pruebas de reconocimiento y recuperación, mantenimiento aun con ejecución deshabilitada y continuidad de automatizaciones del Inbox tras un fallo de preferencia.
- Regresión de Marketing, mensajería, multimedia, Meta y canales; comprobación de tipos, build local y revisión de la vista Resultados en localhost.

La suite focal pasó 115 pruebas en 12 archivos. La regresión amplia pasó 290 de 291: una prueba de desconexión superó su timeout de cinco segundos. Al repetir aisladamente ese archivo junto con las pruebas afectadas de Inbox y bajas, pasaron las 32 pruebas. TypeScript y el build terminaron con código 0; SQL concluyó con `ROLLBACK` y todas sus aserciones correctas. No se modificó el timeout ni la prueba de desconexión para ocultar el resultado.

Estas verificaciones no equivalen a una prueba de carga, una prueba de entrega real ni una garantía contra restricciones de Meta. No hubo mensajes reales ni cambios en Coolify, credenciales o webhooks. Antes de desplegar este código deberá aplicarse la migración `20261009173000_marketing_opt_out_and_results.sql`, después de las migraciones de las etapas anteriores. La tarea de mantenimiento existente usa la misma ruta; no se configura otra tarea para esta etapa.

## Pendientes antes de habilitar masivos

| Prioridad | Pendiente | Criterio de cierre |
|---|---|---|
| P0 | Salud de número/plantillas y errores accionables | Bloquear restricciones conocidas con información vigente y presentar motivo, acción y recuperación segura; mantener resultados ambiguos sin reenvío automático. |
| P0 | Scheduler y capacidad | Validar cadencia real, concurrencia, recuperación tras caída y equidad entre números con carga sintética. La tarea de mantenimiento no sustituye por sí sola al programador de campañas. |
| P0 | Prueba pequeña autorizada | Después de lo anterior, comprobar emisión, baja y recibos con destinatarios de prueba autorizados y observar el canal antes de ampliar volumen. |
| P1 | Historial y reportes completos | Destinatarios y resultados por paso con paginación, detalles sanitizados y exportación con permisos. Los conteos y diez actividades no constituyen ese historial completo. |
| P1 | Importación y renovación | CSV con revisión por fila/evidencia y renovación explícita auditada. Mantener la importación antigua bloqueada y no borrar revocaciones mediante importación. |
| P2 | Presupuesto opcional | Estimación separada de cargos reales, únicamente si se solicita; los pagos del canal permanecen en Meta. |

La ejecución sigue deshabilitada por defecto. Esta etapa cierra la captura/reintento automático de bajas, las métricas agregadas reales y la finalización básica; no declara listo todo el módulo para producción.

La [etapa 5](implementation-stage-5.md) implementa después los mecanismos de comprobación del número, restricciones, equidad y evidencia del motor, y verifica concurrencia local. Conserva pendientes la validación real de Meta y la configuración del programador en producción; la tabla anterior registra el estado al cerrar esta etapa 4.
