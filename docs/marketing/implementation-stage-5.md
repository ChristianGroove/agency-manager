# Marketing: salud del canal, ejecución y concurrencia

Implementado en `codex/marketing-campaign-hardening`, después de las etapas 1–4. La migración se aplicó solamente a Supabase Docker local. No se habilitaron campañas ni se enviaron mensajes reales; tampoco se modificaron producción, Coolify, credenciales o webhooks.

## Resultado

Marketing exige una comprobación reciente del número WhatsApp antes de activar o emitir una campaña. Los rechazos conocidos que afectan al número detienen sus campañas; los resultados ambiguos conservan la prohibición de reenvío automático. Resultados muestra la comprobación del canal y evidencia de las últimas ejecuciones del motor. La adquisición de trabajos rota entre conexiones para evitar que un grupo con una cola antigua monopolice los lotes.

Estas protecciones se aplican a operaciones de campañas. No certifican capacidad autorizada por Meta, entrega, elegibilidad para Marketing ni ausencia de restricciones futuras.

## Comprobación y restricciones

- El servidor consulta `quality_rating` del número en Graph v24.0, con credenciales resueltas después de verificar organización, conexión y referencia privada. El token viaja en el encabezado de autorización, nunca en la URL ni en la respuesta de la interfaz.
- Una comprobación GREEN o YELLOW tiene vigencia máxima de 24 horas. RED, UNKNOWN, falta de comprobación, conexión inactiva o restricción pendiente bloquean adquisición, activación y despacho de campañas en SQL. YELLOW se presenta como advertencia. Esto no altera el estado del canal utilizado por el Inbox.
- Con ejecución habilitada, cada ciclo adquiere hasta tres comprobaciones mediante leases y las consulta en paralelo con timeout de ocho segundos. Renueva comprobaciones positivas después de una hora y UNKNOWN después de cinco minutos. Una actualización fallida sustituye el resultado anterior por UNKNOWN; no conserva un positivo obsoleto. Con ejecución deshabilitada no hace estas consultas.
- Se conservan los códigos numéricos de rechazos estructurados de Graph HTTP 4xx. Los errores de transporte, respuestas 5xx y pérdida de confirmación siguen siendo ambiguos: no se repiten automáticamente. Los detalles y textos privados de Graph no se presentan como errores de campaña.
- La política operativa conservadora de Pixy retiene el número para los códigos 10, 190, 200, 131005, 131031, 131042, 131048 y 133010. El código 130429 aplica una espera interna de 15 minutos. Esa espera es una decisión de Pixy, no una cuota o duración prometida por Meta. Los errores de destinatario/plantilla, por ejemplo 131049, no retienen todo el canal por esta regla.
- Un recibo de fallo puede llegar antes o después de la confirmación local de aceptación. Ambos órdenes registran la restricción para la operación de campaña correspondiente. Los eventos anteriores a una revisión ya realizada no vuelven a imponer la misma restricción antigua.
- Comprobar calidad no elimina una restricción de cuenta, permisos o pagos. La recuperación manual exige permiso de ejecución, comprobación positiva de los últimos 30 minutos, confirmación explícita de que se resolvió la causa y coincidencia con la versión de restricción revisada. Un evento más reciente invalida esa revisión. Una espera posterior no rebaja una restricción manual pendiente. Liberar el canal no reenvía inscripciones fallidas.

La lectura de calidad no comprueba por sí sola facturación, todos los permisos, estado de todas las plantillas ni límites autorizados. Las validaciones de plantillas y consentimiento de las etapas anteriores siguen siendo necesarias. No se implementaron cobros, presupuestos ni cuotas comerciales nuevas.

## Protección de comportamientos existentes

El adaptador distingue campañas únicamente por metadatos construidos en el servidor para claves de outbox `campaign:`. Sus rechazos no abren el circuit breaker compartido `meta_api`: Marketing usa restricciones duraderas por conexión. Los envíos ordinarios conservan ese circuito y su tratamiento anterior de errores ambiguos.

No se cambiaron payloads multimedia, recepción de audios, asignación de leads, disparadores de automatizaciones ni reconciliación de estados del Inbox. Se añadieron observadores acotados para restricciones de Marketing sobre el outbox y los recibos existentes. Las pruebas de regresión cubren los servicios compartidos; esto no sustituye una comprobación real tras el despliegue.

## Equidad y recuperación

El claimer considera conexiones habilitadas con trabajos vencidos, ordenadas por su última adquisición. Adquiere hasta 25 conexiones con `SKIP LOCKED` y un trabajo por conexión; solamente rota las que realmente obtuvieron trabajo. Las leases duran 90 segundos y los checkpoints requieren el token vigente. La reserva de cadencia sigue compartida por identificador físico de número Meta, incluso si existen dos conexiones para ese mismo número.

El worker deja de comenzar trabajos nuevos después de 15 segundos de procesamiento para reservar margen a una última petición Graph de hasta 30 segundos. Las leases no utilizadas vencen normalmente. Es un presupuesto de inicio, no una garantía absoluta de terminar en 60 segundos: la latencia de base de datos y finalización también cuenta.

## Evidencia del motor y programador

La ruta autenticada de Marketing registra inicio, cierre y resultado sanitizado de cada ejecución habilitada. Un fallo de registro se informa como error; no se inventa una ejecución correcta. Resultados distingue ausencia de actividad, actividad antigua, ejecución en curso y fallo. Muestra únicamente fechas/estado del motor compartido, sin datos de otras organizaciones. Una ejecución del motor no prueba que esa campaña emitió ni entregó mensajes. La retención es de 30 días, con limpieza acotada por ciclo.

Se añadió `scripts/marketing-worker.mjs`. Deshabilitado, termina antes de hacer HTTP. Habilitado, usa `CRON_SECRET` desde el entorno y POST al servidor del mismo contenedor por `127.0.0.1`, con `PORT` válido o 3000. No imprime secretos ni cuerpos privados. Ejecuta ciclos seriales con objetivo de cinco segundos entre inicios durante una ventana de 45 segundos; una llamada lenta puede extender esa ventana. No promete una cadencia continua de cinco segundos. Las leases y la reserva de número cubren solapamientos entre invocaciones.

**Configuración pendiente, después de desplegar código y migraciones:**

| Campo de Scheduled Task en Coolify | Valor |
|---|---|
| Nombre | `Marketing campaigns worker` |
| Comando | `node scripts/marketing-worker.mjs` |
| Frecuencia | `* * * * *` |
| Contenedor | Backend de Pixy que sirve la aplicación |
| Timeout | `120` segundos |

Antes de guardarla, comprobar que el contenedor incluye ese script, que `PORT` coincide con el servidor interno y que dispone de `CRON_SECRET`. La tarea de mantenimiento Meta existente no sustituye al programador de campañas. Mantener `MARKETING_EXECUTION_ENABLED` deshabilitado hasta preparar y autorizar una prueba pequeña. No se creó ni modificó esa tarea durante esta etapa.

## Verificación

- Regresión amplia: **368 pruebas en 73 archivos**, incluyendo Marketing, mensajería, multimedia, canales, adaptador Meta y rutas protegidas. Timeout de 15 segundos en esta invocación para imports en Windows; no se cambió la configuración global de pruebas.
- TypeScript sin emisión: correcto.
- SQL sobre tablas y funciones reales en Docker, dentro de transacción terminada en `ROLLBACK`: aislamiento, permisos, calidad vencida/RED, restricciones por número, recepción anterior a confirmación, revisión con versión vigente, cooldown, leases de comprobación y resultados sanitizados del motor. Todas las aserciones pasaron.
- Carga concurrente con esquema desechable: **6.000 destinatarios sintéticos, 30 conexiones y ocho workers**. Se hicieron 66 llamadas al claimer y se obtuvieron 320 leases distintas, **cero duplicadas**. Los 30 números participaron en los dos primeros lotes pese a que cinco tenían trabajos menos antiguos. Ocho reservas simultáneas del mismo número físico permitieron **una sola salida**. Se verificaron recuperación de lease vencida y rechazo del checkpoint del worker anterior. El esquema se eliminó al finalizar.
- Latencias observadas del claimer: p50 324,47 ms y p95 370,58 ms, incluyendo el coste de lanzar Docker desde Windows. No son cifras de throughput HTTP ni de Meta. El fixture de carga copia los algoritmos SQL; no replica RLS, triggers ni claves foráneas. Esos contratos se verifican en la prueba SQL transaccional sobre el esquema real. No fueron 6.000 envíos ni 320 entregas.
- Launcher ejecutado con la configuración deshabilitada: `{"disabled":true}`, sin llamadas HTTP ni Meta.
- Revisión local de Resultados: salud/motor sin datos se presentan como pendientes, la comprobación se deshabilita si falta canal y la activación sigue bloqueada. No se alteró el borrador del usuario.

El build de producción completó compilación, comprobación de tipos, generación de 52 páginas y trazas. Emitió advertencias de clave local no disponible en `FlowsCrypto` y de generación estática en una ruta con runtime edge; no se modificaron esos módulos ni su configuración.

La documentación oficial consultada sobre errores/webhooks devolvió HTTP 429; no se presenta esta clasificación operativa como validación completa de todas las condiciones nuevas de Meta. La comprobación real de Graph, el programador de producción y la entrega externa siguen pendientes.

## Despliegue y deuda restante

La migración `20261009200000_marketing_health_and_runtime.sql` requiere las etapas anteriores y debe aplicarse antes de ejecutar el código nuevo. No habilita campañas existentes ni transforma datos de campañas automáticamente. El despliegue y la configuración del programador quedan pendientes de autorización y ejecución del usuario.

| Prioridad | Pendiente | Criterio de cierre |
|---|---|---|
| P0 | Validación real y controlada | Número autorizado, calidad verificable, plantilla vigente, consentimiento demostrado, emisión pequeña, recibos y baja; comprobar también continuidad del Inbox. Sin promesa de inmunidad frente a bloqueos. |
| P0 | Programador en producción | Confirmar script/puerto/secreto, ejecución real, cadencia bajo latencia y recuperación tras caída; contrastar el registro del motor con la tarea. La prueba local no certifica ese entorno. |
| P1 | Historial completo | Destinatarios y pasos paginados, detalle sanitizado y exportación con permisos. Los agregados y diez actividades recientes no son un reporte integral. |
| P1 | Importación/renovación | CSV con revisión por fila, evidencia de consentimiento y renovación explícita auditada. Mantener bloqueada la importación antigua sin evidencia. |
| P1 | Revisión final de campaña | Consolidar audiencia, plantilla, variables, consentimiento, horario, número y restricciones en una confirmación clara antes de habilitar. |
| P1 | Pantallas antiguas | La vista antigua `MetaMarketingTab` conserva métricas/quotas simuladas; no usarla para certificar salud ni presupuestos reales. Reemplazarla o retirarla mediante una tarea acotada. |
| P2 | Presupuesto opcional | Si se solicita, estimación identificada como tal y separada del cobro real de Meta. |

La ejecución continúa deshabilitada por defecto. Esta etapa cierra los mecanismos locales de salud, restricciones, equidad y evidencia de ejecución; no declara todo Marketing listo para masivos de producción.
