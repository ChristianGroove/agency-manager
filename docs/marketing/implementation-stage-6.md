# Marketing: historial completo y exportación protegida

Implementado en `codex/marketing-campaign-hardening`, después de las etapas 1–5. La migración `20261010003000_marketing_history.sql` se aplicó solamente a Supabase Docker local. Esta etapa añade consultas y reportes: no modifica el worker, las emisiones, los recibos, el consentimiento, las automatizaciones ni la multimedia del Inbox. No se habilitaron campañas ni se cambió producción.

## Qué puede consultar el usuario

Resultados conserva los indicadores agregados y añade un historial de toda la audiencia inscrita, con páginas de hasta 25 destinatarios. Permite buscar literalmente por nombre o teléfono y filtrar por procesamiento o por la presencia de mensajes en un estado concreto. Aplicar otro filtro vuelve a la primera página; cambiar de campaña reinicia el componente e ignora respuestas anteriores. Las búsquedas no se ejecutan con cada tecla: se aplican al enviar el formulario.

Cada destinatario muestra identidad registrada, estado de procesamiento, próximo paso, último avance y conteos de mensajes. «Ver pasos» consulta el detalle de esa inscripción solamente cuando se solicita. Incluye orden, nombre/tipo de paso, plantilla, avance de secuencia, estado del mensaje, fechas de operación, último evento de recibo y código numérico Meta cuando existe. El detalle también está paginado.

Los campos de identidad prefieren la instantánea de activación; las inscripciones antiguas sin ella usan el contacto existente. El avance registrado de un paso no demuestra entrega. Una pausa de secuencia se identifica como tal. Si no existe operación de envío, se indica «Sin registro de envío». Los errores ambiguos mantienen «Sin resultado confirmado» y la advertencia contra reenvíos automáticos. Los fallos de consulta se muestran como información no disponible, nunca como una audiencia vacía inventada.

Las fechas de cola/actualización son fechas de operación, no horas de lectura. «Último evento de recibo» es el timestamp conservado por el ledger de Meta; el reconciliador puede conservar el estado más alto aunque llegue después un evento de menor precedencia. No se atribuye una hora de lectura inexistente.

## Fuente de verdad y límites de consistencia

Las consultas vinculan organización, campaña, conexión, inscripción y clave estable del outbox. Para el estado consultan tanto el mensaje como el ledger de recibos, cubriendo confirmaciones que llegaron antes de asociarse al mensaje del Inbox. Conservan la precedencia read/delivered/failed utilizada en la reconciliación existente; no modifican ninguno de esos registros.

Los conteos por destinatario/CSV son categorías excluyentes del último estado observado: un leído está en «Leídos», no también en «Aceptados sin recibo de entrega». El indicador agregado anterior de «Aceptados por Meta» incluye operaciones que después se entregaron/leyeron; esa diferencia está identificada en los encabezados CSV. «Con mensajes en estado» filtra destinatarios que tienen al menos una operación en ese estado. Exportar sus pasos incluye todos sus pasos, para preservar contexto.

La paginación usa identificadores estables y orden de paso, sin offsets sobre el historial completo ni dependencia del límite de 1.000 filas de REST. El primer lote cuenta coincidencias; los siguientes no repiten ese conteo. Se añadió el índice `(organization_id, campaign_id, id)`. El helper SQL permite al planificador integrar filtros/cursor/límite y las consultas incluyen un límite inferior de ID aplicable al índice incluso con un plan genérico. Esto no promete que PostgreSQL elija siempre un índice para tablas pequeñas.

Cada página/lote es una lectura consistente propia, con fecha de consulta. No se mantiene una transacción global durante una exportación: los recibos o el consentimiento pueden cambiar entre lotes y, con filtros sobre estados cambiantes, el conteo inicial puede diferir de las filas que coincidan después. El CSV sirve para consultar los estados observados, no como cierre contable inmutable ni certificado de entrega. Las inscripciones modernas conservan identidad y audiencia congeladas; no se inventa trazabilidad histórica de diseños antiguos que no la guardaban.

## Permisos y privacidad

- Las acciones verifican sesión, organización, permiso de lectura y acceso al canal antes del reporte. Los RPC SQL repiten esos controles, incluyendo permisos efectivos y rutas de canales heredadas, por lo que invocarlos directamente no evita la autorización.
- Exportar exige lectura **y** permiso `marketing.campaigns.export`. Una denegación explícita prevalece sobre el rol. Cada lote del CSV revalida permisos y canal en SQL; una revocación interrumpe el reporte.
- Los helpers que devuelven filas internas no tienen ejecución concedida a usuarios autenticados. Los RPC públicos devuelven campos seleccionados, sin payload de mensaje, tokens, credenciales, logs arbitrarios ni errores de proveedor en texto libre.
- Los errores de inscripción se presentan como mensajes controlados. Los códigos Meta se limitan a números válidos. No se imprimen respuestas privadas del proveedor.

Esta protección del botón/ruta de exportación no pretende impedir que un usuario autorizado a leer copie manualmente información que ya puede consultar.

## CSV

Hay dos reportes: destinatarios y pasos de campaña. Ambos respetan los filtros aplicados y se sirven desde una ruta autenticada con `private, no-store`, tipo CSV y descarga adjunta. No usan el endpoint del worker ni secretos de cron.

El servidor produce lotes de hasta 100 filas con backpressure, máximo 50.000 filas y ventana de preparación de 45 segundos. Cada RPC tiene timeout de diez segundos. Un reporte grande/lento requiere filtros más estrechos; no se trunca silenciosamente como si estuviera completo. La cancelación evita solicitar más lotes, aunque una consulta ya iniciada puede tardar hasta su timeout en terminar.

La interfaz recibe el archivo completo antes de iniciar la descarga y rechaza respuestas HTML, errores HTTP y streams interrumpidos. Durante la preparación muestra su estado. Este enfoque evita descargar deliberadamente un CSV parcial, pero mantiene el archivo completo temporalmente en memoria del navegador dentro del límite indicado; para volúmenes mayores quedaría como evolución un job de exportación con archivo privado y vencimiento.

Los CSV usan UTF-8, BOM, escape de comillas/saltos de línea y protección de fórmulas de hoja de cálculo. Los teléfonos se exportan como texto para conservar prefijos, ceros y precisión. Ninguna fórmula procedente de nombres u otros campos queda ejecutable por diseño del exportador.

## Verificación

- Contratos, autorización, CSV y rutas: 21 pruebas iniciales correctas. Interfaz: cuatro pruebas iniciales y una adicional para rechazar una respuesta HTML de login; todas correctas. Se comprueba aislamiento antes de leer, filtros/cursor, revisión del canal, permiso de exportación, stream interrumpido, fórmulas, Unicode, teléfono y ausencia de campos privados.
- SQL en Docker sobre funciones/tablas reales y transacción terminada en `ROLLBACK`: **1.105 destinatarios** recorridos completamente, páginas acotadas y sin repetición; **3.315 filas de pasos** recorridas sin omisiones/duplicados; búsqueda más allá de 1.000 filas; filtro literal; diferencia entre avance y entrega; recibo de fallo tras aceptación; detalle numérico; controles de organización/canal y denegación explícita de exportación. Se verifica que logs y errores privados sintéticos no se serializan.
- La regresión amplia pasó **392 de 393 pruebas en 77 archivos**. Una prueba del cron de backup superó su timeout explícito de diez segundos mientras corría el build. Al repetir el archivo de guards junto con la interfaz nueva pasaron **46 pruebas en dos archivos**, incluyendo esa prueba y la adicional de HTML. No se aumentaron sus timeouts ni se modificó el cron de backup. No se presenta esa primera ejecución como completamente verde.
- TypeScript pasó. El primer build y el build final, después de la última comprobación del cliente CSV, terminaron con código 0. Persisten las advertencias locales de clave no disponible en FlowsCrypto y de generación estática con runtime edge; esos módulos no se modificaron.
- En localhost se verificó con la sesión existente el historial vacío real del borrador, permisos de exportación y ruta autenticada: HTTP 200 y confirmación de recepción del CSV completo en la interfaz. El intento sin sesión obtuvo HTTP 400 y no exportó. El navegador integrado no notificó un evento nativo de descarga del blob; no se afirma haber inspeccionado el archivo final en Descargas. El contenido y recorrido del CSV se verificaron en pruebas de ruta/contratos y SQL.

La validación local no equivale a una campaña real ni a una certificación de Meta. La ejecución sigue deshabilitada por defecto.

## Qué falta antes de habilitar masivos

El historial integral queda implementado con los límites anteriores. Siguen pendientes:

1. Importación CSV con revisión por fila, evidencia de consentimiento y renovación auditada; la importación antigua continúa bloqueada.
2. Revisión final de campaña que reúna audiencia, plantilla/variables, número, consentimiento y horario antes de activar.
3. Sustituir o retirar las métricas simuladas de la pantalla antigua `MetaMarketingTab`, sin tocar el envío ordinario.
4. Desplegar código/migraciones en orden, configurar el programador de campañas y comprobar su ejecución real.
5. Autorizar y validar una campaña pequeña con Meta, recibos y baja, junto con continuidad del Inbox.

Otra deuda existente de retención: `marketing_enrollments.contact_id` conserva `ON DELETE CASCADE` hacia contactos. El reporte consulta las inscripciones que existen; eliminar físicamente un contacto puede eliminar su inscripción y reducir el historial. Esta etapa no cambia esa semántica compartida. Una solución independiente debe definir retención e invalidación auditada y preservar eventos mínimos de campaña con referencia opcional al contacto, respetando la política de eliminación elegida; no conservar datos personales indefinidamente por defecto.

No se añadieron cobros, presupuesto, límites comerciales, notificaciones automáticas ni despliegues.
