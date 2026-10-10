# Etapa 13: respuestas y frecuencia por destinatario

Se incorporan dos controles al motor de campañas WhatsApp existente. No se habilita ejecución, no se hacen envíos reales y no se modifican las automatizaciones, asignación de leads ni el procesamiento de entradas o multimedia de Inbox.

## Detención de seguimientos

- El worker consulta si el contacto respondió antes de procesar un mensaje o una espera. La recuperación del outbox y la reserva final también comprueban la respuesta.
- La respuesta pertenece a una conversación del mismo tenant y número conectado, después del comienzo de un envío de esta inscripción aceptado por Meta o con resultado incierto. Se toma el instante de adquisición del envío, con precisión de segundos compatible con los timestamps Meta; los registros antiguos sin ese dato usan su fecha de creación.
- Se ignoran los mensajes anteriores al envío, los ecos salientes de WhatsApp Business App y el historial importado en ambos formatos existentes de metadata. Una respuesta de texto, audio o multimedia puede detener los seguimientos.
- La inscripción pasa a cancelada con el motivo «El contacto respondió; seguimientos detenidos». Los mensajes de campaña todavía en cola se finalizan como no enviados con `campaign_replied`, usando el mecanismo existente que actualiza también el mensaje visible. Se conservan los envíos ya aceptados y todos los mensajes entrantes.
- Una cancelación que ocurre mientras otro worker guarda su resultado no se sobrescribe ni se convierte en un fallo del ciclo.

**Límite temporal:** la comprobación ocurre al procesar/recuperar el siguiente paso; no es un cambio instantáneo de estado al recibir el webhook. Una espera futura o una campaña pausada puede conservar su estado hasta la siguiente comprobación. El control bloquea su próximo envío. Una solicitud Graph que ya empezó no puede retirarse, y una respuesta que todavía no ha llegado al sistema no puede detectarse. No se añade un receptor de webhooks ni un trigger a los mensajes entrantes.

## Frecuencia entre campañas

- Campo en programación: espera por contacto de 0 a 720 horas, visible también en revisión final. 0 desactiva la espera de esa campaña; la mayor espera entre campaña anterior y actual se respeta.
- Los nuevos borradores creados por las acciones actuales proponen 24 horas, ajustables. Las campañas guardadas sin el campo conservan la ausencia de espera; no se migran ni se reconfiguran automáticamente.
- La clave es tenant y teléfono normalizado, compartida entre distintos números emisores de la misma organización. Otro tenant conserva su propia frecuencia. No afecta los mensajes ordinarios del Inbox.
- Los seguimientos de la misma campaña mantienen sus tiempos propios y el ritmo del número. Alternar a otra campaña no permite eludir su espera.
- La reserva se serializa en PostgreSQL antes de la llamada Graph, junto con la reserva de número existente. Un envío en curso o sin resultado confirmado impide un nuevo contacto automático; un rechazo definitivo no consume por sí mismo la espera.
- El último contacto aceptado se conserva aunque un seguimiento posterior falle. El plazo comienza desde la aceptación registrada. Las esperas aplazan la operación y su inscripción hasta el próximo intento; el motivo se muestra en el historial de destinatarios.

Este es un control configurable del producto, no un límite tarifario de Meta ni una garantía de evitar restricciones. Consentimiento, bajas, salud, revisión final, idempotencia y ritmo por número permanecen activos.

## Integración y pruebas

Migración nueva: `supabase/migrations/20261010080000_marketing_recipient_followups.sql`, aplicada solo en Supabase Docker local. Requiere las migraciones anteriores. Añade un registro privado por destinatario, índices limitados a consultas de respuesta y operaciones de campaña, y wrappers sobre los límites SQL existentes. El identificador de inscripción se indexa directamente para evitar explorar el outbox completo del tenant; la consulta de respuesta termina al encontrar una coincidencia.

- Marketing y outbox: 252 pruebas en 26 archivos; después se añadió y verificó una prueba de cancelación concurrente (253 distintas en total; 22 del archivo del worker).
- Siete suites SQL con fixtures sintéticos y `ROLLBACK`: aislamiento, autorización, activación, listas, revisión, respuesta de audio, exclusión de historial/eco/otro canal, plazo vencido, frecuencia compartida entre números, estados inciertos, conservación del contacto aceptado y permisos de funciones privadas. Sin llamadas a proveedores.
- Regresión: 260 pruebas distintas en 71 archivos de mensajería, Meta, automatizaciones, servicios CRM y endpoints de Marketing. El primer recorrido pasó 255 y falló 5 de onboarding por faltar la clave de cifrado del proceso de tests; el archivo se volvió a ejecutar con una clave ficticia y pasaron sus 7 pruebas, incluidas las 5 fallidas. No se modificó configuración ni código de onboarding. Proveedores simulados; no son pruebas Meta Live.
- TypeScript correcto. Build local comprobado antes del commit final; logs en `tmp/marketing-stage13-*` y `tmp/stage13-*`.
- No se declara prueba visual autenticada ni Meta Live. Quedan pendientes la revisión del flujo en navegador y una campaña real pequeña antes de habilitar ejecución.

En una base de producción con mucho historial, los dos índices nuevos pueden prepararse por separado con `CREATE INDEX CONCURRENTLY` fuera de una transacción antes de ejecutar la migración. Sus declaraciones usan `IF NOT EXISTS` para reutilizarlos. La creación normal dentro de la migración puede bloquear escrituras mientras construye los índices; este detalle debe contemplarse al preparar el despliegue.
