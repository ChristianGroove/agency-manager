# Campañas masivas: estado funcional y operación

Referencia vigente al **15 de octubre de 2026** para la revisión local sobre `master`, base `372884cb`. Complementa el [índice](README.md), la [arquitectura](../2-architecture/modules/broadcasts-architecture.md) y la [evidencia de verificación](integrated-verification-2026-10-15.md). Los dos commits locales anteriores se conservan.

## Alcance de la entrega

Campañas masivas permite preparar campañas WhatsApp y email, reutilizar listas de contactos, registrar autorización, programar, pausar/reanudar y consultar resultados. WhatsApp usa las plantillas aprobadas del emisor seleccionado; email usa una conexión SMTP verificada de la organización. Meta Ads mantiene su módulo independiente. SMS sigue pendiente.

El cierre de interfaz elimina contenido duplicado, reduce los modales y organiza la configuración sin retirar controles necesarios. Mantiene la validación del servidor, aislamiento por organización, permisos, consentimiento, exclusiones, snapshot, idempotencia, ritmo y protección de resultados inciertos.

La implementación está verificada localmente con proveedores simulados y contratos SQL reales. **El piloto real está aplazado por decisión del usuario.** No se ha comprobado recepción Meta/SMTP ni se ha actualizado el despliegue remoto durante esta revisión. Esta entrega prepara un commit local; push y deploy son pasos posteriores.

## Interfaz y recorridos

La entrada es `/crm/marketing`. El listado permite buscar, filtrar por estado y abrir campañas; los enlaces directos continúan disponibles. Crear y editar usan el mismo modal y los mismos controles.

### Preparación

| Sección | Qué completa o consulta el operador |
|---|---|
| Identificación y emisor | Nombre de la campaña y conexión WhatsApp o SMTP. Sin emisor se indica dónde configurarlo; un error de consulta se distingue de una lista vacía. |
| Mensaje | Plantilla aprobada y variables WhatsApp, o asunto y texto email; vista previa del contenido. El primer mensaje puede prepararse antes del primer guardado. |
| Destinatarios | Listas, filtros y selección de contactos; elegibles y motivos de exclusión. La autorización por lista aparece cuando resulta necesaria. |
| Envío | Sección compacta con resumen: fecha, zona horaria, ventana diaria, ritmo, variación y espera entre campañas. |
| Opciones de audiencia | Filtros adicionales, asignación y selecciones guardadas accesibles sin ocupar todo el formulario. |

El resumen lateral repetido y la confirmación adicional de inicio se retiraron. Los errores se muestran en el contexto donde se resuelven. Los controles conservan ayuda breve cuando explica una decisión operativa.

### Actividad

Muestra métricas por canal, progreso y pendientes, incidencias e historial paginado. El diagnóstico técnico permanece plegado hasta que se necesita. Actualizar resultados también refresca el historial, conservando los filtros. Exportar aparece y funciona según permisos. La aceptación SMTP nunca se presenta como entrega o lectura.

### Crear, guardar e iniciar

1. Elegir canal y emisor propio. Completar nombre, contenido y destinatarios; ajustar Envío si se necesita programación o una cadencia distinta.
2. Importar contactos o seleccionar listas existentes. Revisar las exclusiones y registrar autorización externa solo cuando exista el respaldo correspondiente.
3. **Guardar cambios** conserva el borrador sin enviar. Abrir/cerrar el formulario o el editor vacío no crea campañas. Cambiar el nombre requiere guardar; ya no depende de perder el foco.
4. **Iniciar campaña** guarda todos los cambios pendientes, prepara una revisión vigente en el servidor y confirma la activación. **Programar campaña** aplica el mismo recorrido con inicio futuro. No hay un segundo modal para repetir la configuración.
5. El servidor verifica permisos de ejecución, flag, emisor, salud, plantilla/parámetros, consentimiento, audiencia y vigencia del ticket. Los bloqueos se explican en el formulario; guardar sigue siendo posible cuando ejecutar está deshabilitado.
6. Tras activar se actualiza el estado y el listado. Actividad permite seguir el progreso y pausar.

Se bloquean dobles clics. Un error parcial de guardado conserva el ID creado y los campos pendientes para reintentar sin duplicar el borrador. Una respuesta incierta de activación requiere actualizar el estado antes de otro intento. Los cambios de audiencia/configuración y los tickets caducados se vuelven a validar.

Cerrar, recargar o descartar contenido modificado pide confirmación dentro de la aplicación. Un borrador antiguo sin audiencia ya no aparece modificado por el solo hecho de abrirlo; guardarlo explícitamente sí persiste la audiencia pendiente.

### Estados y acciones

| Estado o situación | Comportamiento |
|---|---|
| Borrador | Diseño editable; guardar, iniciar o programar según permisos y validación. |
| Programada | La fecha futura y la ventana regulan cuándo puede comenzar el trabajo; no implican un cron diferente por campaña. |
| En ejecución | Diseño protegido; seguimiento en Actividad y pausa con permiso. |
| Pausada | Conserva destinatarios y avance. Reanudar valida el estado y continúa las mismas inscripciones. No permite rediseñar una campaña ya activada. |
| Completada o archivada | Consulta del diseño y resultados; sin edición del diseño activado. |
| Fallos o resultados inciertos | Incidencias visibles y filtros de historial; no se asume que todo contacto pendiente se puede reenviar. |
| Solo lectura | Consulta sin controles efectivos de modificación, importación o ejecución. |

«Programada» describe el inicio futuro de una campaña activada; no requiere un estado de almacenamiento independiente. Las secuencias adicionales heredadas pueden consultarse/editarse cuando corresponde, pero solo la secuencia principal se puede activar como recorrido operativo. Una campaña activada no vuelve a borrador para alterar el snapshot.

## Contactos, listas y autorización

| Importación | Formato y límite |
|---|---|
| WhatsApp simple | `telefono,nombre,email`; teléfono con país obligatorio, nombre/email opcionales. |
| Email simple | `email,nombre`; email obligatorio. |
| Límite simple | Hasta 1.000 filas y 5 MB. |
| Formato heredado con evidencia individual | Hasta 100 filas y 1 MB. |

El importador permite revisar archivo, columnas, filas válidas y errores antes de guardar. Importar guarda contactos/listas, sin enviar ni conceder autorización automáticamente. La declaración externa por lista registra actor, fecha y referencia; Pixy no verifica retrospectivamente cómo se obtuvo el consentimiento. Una declaración no revierte bajas ni revocaciones existentes.

La identidad y los datos de contactos existentes se conservan. Los nuevos quedan como `prospect`/`marketing_contact`, fuera del pipeline comercial, aunque se almacenen en `leads`. Solo una transición comercial explícita los convierte en `lead`. Importar, entregar, leer o responder no crea automáticamente una oportunidad. Las consultas de analítica comercial filtran `contact_type='lead'`.

El consentimiento se evalúa por canal y organización. Las exclusiones por baja, falta de autorización, identidad inválida, contenido o emisor no válido permanecen visibles; no se compensa una exclusión usando otro tenant.

## Contenido y programación

WhatsApp valida plantilla aprobada de categoría Marketing, idioma, emisor y bindings por destinatario. Reutiliza el transporte y outbox de Meta existentes. Email permite asunto y cuerpo de texto con personalización; el HTML de envío se genera escapando el contenido. SMTP de campañas permanece separado del correo transaccional.

El editor conserva la secuencia de mensajes y esperas, con orden validado y diseño protegido tras activar. En WhatsApp, una respuesta real del destinatario detiene los seguimientos pendientes al procesarlos/recuperarlos y antes de reservar otro envío. No cancela instantáneamente mediante un webhook ni retira una solicitud ya enviada a Meta.

La fecha del formulario se interpreta en la zona local del navegador y se guarda como instante UTC; la precisión guardada se conserva hasta que se edita. La zona de Envío gobierna la ventana diaria. Revisar la zona cuando el operador y la audiencia estén en lugares distintos.

Los borradores nuevos proponen ventana 09:00–18:00, zona Bogotá, cadencia equilibrada de 30 segundos, variación activada y espera entre campañas de 24 horas. Los registros antiguos conservan sus valores o ausencias; abrirlos no aplica esos defaults como una edición implícita.

Conservador, Equilibrado y Rápido corresponden a mínimos de 180, 30 y 5 segundos. WhatsApp comparte el ritmo por número físico entre campañas; SMTP lo aplica por organización/emisor. La espera entre campañas para un destinatario admite 0–720 horas y conserva el último contacto aceptado aunque falle un seguimiento posterior. Cadencia y salud no garantizan evitar restricciones del proveedor.

## Métricas, historial y bajas

| Indicador o función | Interpretación |
|---|---|
| Progreso de destinatarios | Estado de procesamiento de inscripciones, separado de entrega. |
| Aceptaciones | WhatsApp y SMTP identificados por separado. |
| Entregados y leídos | Estados WhatsApp; entregados incluye los ya leídos. |
| Tasa de entrega | Denominador de aceptaciones WhatsApp. Sin aceptaciones WhatsApp no hay tasa medible. |
| Aceptado SMTP | El servidor SMTP aceptó el mensaje; no prueba recepción, apertura o lectura. |
| Incierto | No hay evidencia suficiente para decidir aceptación/fallo; evita reenvío ciego. |
| Historial/exportación | Paginación de 25 destinatarios y CSV protegido hasta 50.000 filas. Conserva filtros, incluido SMTP y resultados inciertos. |

Cada email incluye una baja vinculada a organización/dirección mediante token almacenado con hash. Abrir el enlace GET muestra confirmación sin revocar; POST aplica la baja, también mediante los encabezados de baja de un clic. Una revocación bloquea posteriores envíos según el contrato del motor. Las respuestas email van al buzón configurado; todavía no ingresan a Inbox.

## Permisos, seguridad y ejecución

El servidor resuelve sesión autenticada, organización activa y membresía/rol activos. Los permisos de ver, gestionar, importar, exportar y ejecutar son independientes; las denegaciones explícitas prevalecen. La habilitación del motor no concede permiso al usuario. Las restricciones de acceso a canales se conservan.

La base aplica RLS y vínculos por organización. Las operaciones privadas se reservan al rol de servicio; los RPC de lectura mantienen sus comprobaciones autenticadas. No se confía en IDs del navegador para otorgar acceso. La revisión de activación produce un ticket de diez minutos ligado al actor, organización, operación, diseño y audiencia; confirmar lo vuelve a validar y crea el snapshot de forma transaccional/idempotente.

El runner usa leases de dos minutos y `SKIP LOCKED`, con hasta 25 trabajos por ciclo y reparto entre WhatsApp/email. Deja de iniciar trabajo nuevo tras un presupuesto de 15 segundos para reservar finalización. Reanudar conserva inscripciones; un trabajador con token vencido no puede confirmar el trabajo del sucesor.

WhatsApp usa `execution_version=2` y operaciones estables del outbox Meta; email usa versión 3 y outbox privado por inscripción/paso con identificador de mensaje estable. La evidencia persistida de aceptación evita despachar de nuevo. No se reintentan ciegamente resultados ambiguos.

SMTP exige verificación, TLS en 465/587 y resolución DNS pública validada/fijada; rechaza destinos internos. Las credenciales son de la organización y requieren cifrado compatible con la configuración existente. Cambiar la clave sin migrar secretos puede romper conexiones existentes.

## Configuración y operación del destino

| Requisito | Comprobación antes del piloto |
|---|---|
| Aplicación y base compatibles | Versión desplegada, tablas, funciones, permisos e índices; comparar historial con objetos antes de migrar. |
| `MARKETING_EXECUTION_ENABLED` | Mantener deshabilitado durante preparación. Habilitar solo al autorizar ejecución controlada en el destino. |
| `CRON_SECRET` | Configurado en la aplicación y launcher; no copiar valores a documentación, comandos visibles o logs. |
| `PORT` | Puerto interno de la aplicación para el launcher; predeterminado 3000 si no se configura. |
| SMTP | Cuenta verificada propia y configuración `SMTP_ENC_KEY` compatible; preservar correo transaccional. |
| URL pública | URL HTTPS correcta para enlaces de baja y acceso externo. |
| WhatsApp | Canal autorizado activo, salud y plantilla aprobada del emisor seleccionado. |

El programador ejecuta `node scripts/marketing-worker.mjs` en el contenedor, cada minuto, con timeout de 120 segundos. El launcher inicia ciclos separados aproximadamente cinco segundos durante una ventana de 45 segundos; cada petición admite hasta 55 segundos y deja terminar la última. Llama a `127.0.0.1:<PORT>/api/marketing/run` con el secreto. Deshabilitado termina sin solicitar envíos. El endpoint también aplica autenticación y flag; el cron de mantenimiento de canales Meta no sustituye este trabajo.

Ante un incidente:

1. Pausar la campaña afectada y deshabilitar nuevos ciclos si el problema alcanza al motor. Las solicitudes que ya salieron pueden terminar.
2. Conservar outbox, historial, identificadores y evidencia del proveedor. Diferenciar error recuperable, exclusión y resultado incierto.
3. Revisar salud, permisos, plantilla, horario, frecuencia y logs sin publicar credenciales o datos de destinatarios.
4. Contrastar un resultado incierto con el proveedor antes de resolverlo administrativamente. No borrar operaciones ni marcarlas como nuevas para forzar un envío.
5. Reanudar únicamente tras resolver la causa y comprobar el estado. Un rollback de aplicación debe ser compatible con el esquema existente; no hay un down destructivo automático prescrito.

## Evidencia y ejemplos para revisión

Se comprobaron 295 pruebas en 30 archivos, ocho suites PostgreSQL con rollback y concurrencia aislada con 6.000 destinatarios sintéticos, ocho trabajadores y cero leases duplicados. El build de producción pasó en una copia aislada para preservar el `.next` de localhost:3001. El endpoint real devolvió 401 sin secreto y 200 con ejecución deshabilitada. Los detalles, conteos y límites están en la [verificación integrada](integrated-verification-2026-10-15.md).

En la UI autenticada real se comprobó lectura/apertura/cierre de un borrador existente sin modificarlo. El recorrido real crear–guardar–reabrir con emisor, los transportes y la recepción siguen pendientes del piloto. Los recorridos de escritura de la UI se comprobaron con el adaptador aislado y pruebas; las suites SQL verificaron persistencia con rollback.

El laboratorio `/crm/marketing/examples` contiene catorce casos con los mismos componentes y operaciones en memoria: creación WhatsApp/email, lista preparada, programación, ejecución, pausa, completada, incertidumbre SMTP, fallo WhatsApp, fallo parcial de guardado, falta de emisor, falta de autorización, motor deshabilitado y solo lectura. Incluye CSV ficticios. No tiene fallback a acciones reales ni inserta fixtures en Supabase; devuelve `notFound()` en producción. Ver el [detalle de UX](ui-flows-closeout-2026-10-15.md).

No se declara ESLint global limpio: una revisión ampliada encuentra incidencias heredadas de hooks y dependencias en componentes existentes. TypeScript, build y pruebas pasan; se revisaron de forma acotada los componentes nuevos. El aviso de hidratación del sidebar general y los avisos previos de Calling/FlowsCrypto no se resolvieron dentro de este alcance.

## Pendientes y orden recomendado

| Prioridad | Pendiente | Criterio de cierre |
|---|---|---|
| Puesta en marcha, aplazada por el usuario | Elegir organización, configurar emisores propios y cifrado SMTP | Conexiones verificadas, permisos correctos, plantillas y URL pública válidos. No usar canales de otro tenant. |
| Puesta en marcha | Confirmar despliegue, base, flag y cron del destino | Versión compatible y respuesta autenticada del worker; no asumir que la configuración remota del 13 de octubre sigue igual. |
| Puesta en marcha | Crear, guardar, reabrir y ejecutar un piloto por canal | Recepción verificada con destinatarios autorizados; estados, baja, respuesta WhatsApp, pausa/reanudación y seguimiento comprobados. |
| Operación sostenida | Conciliación administrativa de SMTP incierto | Procedimiento/herramienta con evidencia del proveedor, permisos y trazabilidad; sin reenvío ciego. |
| Evolución email | Rebotes, quejas, entrega y respuestas en Inbox | Integración de eventos y buzón por tenant con estados verificables. SMTP actual no ofrece esos eventos. |
| Capacidad | Carga real y audiencias grandes | Medir throughput/latencia/equidad con proveedores; el ensayo SQL no certifica capacidad de entrega. |
| Escala de importación | Más de 1.000 filas | Job por lotes, archivo privado, progreso y cancelación, antes de ampliar el trabajo síncrono. |
| Mantenimiento | Retención y recuperación de auditoría | Política de conservación, limpieza y cascadas probadas; resolución de la discrepancia del ledger local sin reaplicar a ciegas. |
| Mantenimiento | Credenciales SMTP heredadas | Inventario/migración de cifrado antes de rotar claves, conservando el correo transaccional. |
| Evolución comercial | SMS, presupuestos/precios y atribución | Integraciones completas y costes verificables; definir conversión sin equipararla a entrega o lectura. |

Los registros de migraciones remotas aplicadas y configuración de Coolify del 13 de octubre permanecen como antecedentes en el [índice](README.md). Esta revisión no ejecutó migraciones, no cambió credenciales ni habilitó envíos para obtener pruebas satisfactorias.
