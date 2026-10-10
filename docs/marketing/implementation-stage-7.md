# Marketing · etapa 7: importación y confirmación final

Trabajo local en `codex/marketing-campaign-hardening`, sobre la etapa 6. La migración nueva se aplicó a Supabase Docker local. No se desplegó, no se enviaron mensajes y `MARKETING_EXECUTION_ENABLED` permanece deshabilitado.

## Resultado

- Importación CSV con revisión por fila, evidencia consultable y selección explícita. Revisar no crea contactos; importar no inscribe destinatarios en una campaña.
- Renovación independiente después de una baja, con evidencia nueva, fecha posterior y conservación del historial. No reinicia inscripciones canceladas.
- Revisión final del diseño guardado: emisor, horario/zona horaria, intervalo mínimo, destinatarios y exclusiones, pasos, texto de las plantillas y variables. Un diseño incompleto o un motor deshabilitado no pueden confirmarse.

## Importación

Columnas: `nombre,telefono,email,origen_autorizacion,evidencia,fecha_autorizacion`. Email puede estar vacío. Se admiten BOM, comillas escapadas y comas/saltos de línea entre comillas. Se exige teléfono internacional válido, sin adivinar el país, y fecha ISO con zona horaria no futura. Una conversación previa no sustituye la evidencia.

Cada revisión admite hasta **100 contactos y 1 MB**. Se informa cada fila inválida; SQL revisa duplicados del archivo/contactos, bajas registradas, solicitudes de baja pendientes y evidencia anterior al último cambio de consentimiento. Teléfonos repetidos y asociados a varios contactos se excluyen hasta resolver su duplicidad.

Confirmar solo acepta el identificador privado de revisión y las filas seleccionadas. Los datos revisados se guardan temporalmente en el servidor; no pueden reemplazarse al confirmar. Se revalidan permisos, organización, actor y estado del destinatario, con los locks de consentimiento existentes y orden común entre importaciones.

El lote confirmado es una transacción: un fallo o cambio de destinatario lo revierte completo. Repetir idéntica confirmación devuelve su resultado original sin duplicar contactos/evidencias; cambiar la selección no permite reutilizar una revisión consumida.

Los nuevos contactos usan `source=marketing_import` y los predeterminados de `leads`. Los existentes conservan nombre, email, origen, etiquetas, estado y asignación. No se llama a los motores de asignación/automatización ni a Meta. Los triggers de `leads` existentes se mantienen; este contrato no sustituye la importación general del CRM.

Se requieren permisos de **importación y ejecución de Marketing**, porque también se registra consentimiento. La interfaz adapta sus botones; las acciones y SQL vuelven a comprobar permisos.

## Renovación después de una baja

CSV y autorizaciones ordinarias no deshacen bajas. La renovación revisa un contacto existente y exige autorización posterior al último evento/fecha de baja; rechaza solicitudes de baja pendientes y cambios posteriores a la revisión.

Confirmar añade un evento `granted` con origen, evidencia, fecha y actor. Solo limpia indicadores de baja de contactos activos del mismo teléfono y organización. Conserva eventos anteriores e inscripciones canceladas. Reintentar con evidencia idéntica no añade otro evento; una evidencia diferente exige nueva revisión.

Pixy valida estructura, fechas, permisos y trazabilidad. La autenticidad de evidencia externa sigue siendo responsabilidad del operador; esta función no certifica cumplimiento legal.

## Revisión final

El ticket privado caduca en diez minutos y está vinculado al actor, organización y campaña. Puede revisarse con los envíos deshabilitados; confirmar sigue bloqueado.

Al confirmar se revalida el diseño en el servidor y SQL compara su fingerprint. En borradores también se compara el conjunto deduplicado de destinatarios elegibles y sus datos de personalización: nuevas altas o cambios exigen otra revisión. Se comprueba que el conjunto efectivamente congelado coincida con el revisado; una discrepancia revierte la activación. Reanudar conserva los destinatarios originales y los controles existentes de consentimiento/calidad antes de enviar.

Conteos y digest inicial comparten instantánea de consulta. Calcular el digest recorre la audiencia elegible; no es una operación de coste constante. No se certificó el tiempo de activación de campañas de cientos de miles de destinatarios.

Se mantienen controles existentes de calidad/restricciones y se añade comprobación SQL del acceso del actor al canal. La carga del constructor ignora respuestas tardías de otra campaña y corrige la selección de secuencia si la anterior no existe en la campaña cargada.

## Datos temporales y retención

`marketing_review_tickets` no es legible por sesiones `anon/authenticated`; sus RPC son internas. No contiene tokens Meta ni claves. Tras importar/renovar se borra su copia temporal de contactos/evidencias y queda el resultado para reintentos; la evidencia válida permanece en el ledger.

Diez minutos limitan la confirmación, **no garantizan borrado físico a los diez minutos**. Preparar nuevas revisiones limpia hasta 100 tickets vencidos hace más de un día. Sin actividad no corre esa limpieza: una retención garantizada requiere tarea periódica. No se añadió ninguna tarea de producción ni alertas.

## Verificación

- Suite completa de Marketing: **168 pruebas correctas en 20 archivos**, con CSV, autorización, confirmación explícita e invalidación de formularios.
- Regresión de mensajería, conexiones, servicios Meta, automatizaciones, multimedia privada, rutas de Marketing y gestión de leads: **213 pruebas correctas en 66 archivos**. La primera ejecución tuvo cinco fallos de Embedded Signup por ausencia de `ENCRYPTION_KEY`. Con una clave ficticia exclusiva del proceso de pruebas pasaron sus siete casos y la regresión completa. No se cambiaron secretos ni código de conexiones.
- SQL real en Docker: suite anterior de seguridad/historial correcta y nueva suite con rollback. Aislamiento, permisos, conservación de datos CRM, reintentos, cambio de selección, lote de 100 contactos, baja entre revisión/confirmación, renovación posterior y solicitudes pendientes. Activación por ticket de **102 destinatarios sintéticos**, rechazo por expansión de audiencia/acceso revocado, reintento sin duplicados y renovación sin reiniciar inscripciones canceladas. Cero operaciones de salida.
- TypeScript con `--incremental false`: correcto. El comando incremental encontró un permiso de escritura sobre `tsconfig.tsbuildinfo`; no se alteró ese archivo ni la configuración para ocultarlo.
- Builds locales correctos. Advertencias locales de FlowsCrypto sin clave disponible y runtime edge en módulos no modificados.
- Navegador local: revisión del borrador real con problemas y envío deshabilitado; diálogo de importación con contrato/límites visibles. Las mutaciones se probaron con fixtures sintéticos y pruebas de interfaz; no se registró consentimiento real ni se activó la campaña del usuario.

## Producción y deuda pendiente

Esta etapa modifica Marketing y dos textos de traducción de ese módulo. No modifica el envío/recepción de Inbox, conversión de audio, multimedia, reconciliación de estados, asignación o ejecución de automatizaciones. Crear contactos y renovar sus indicadores de baja sí son acciones expresas de este flujo.

Para desplegar: aplicar `20261010020000_marketing_reviewed_operations.sql` después de las migraciones anteriores y conservar los envíos deshabilitados durante la preparación. La migración recarga la caché REST; no activa campañas existentes.

Pendientes:

1. Revisar la pantalla alternativa de Meta Marketing que conserva elementos simulados y dirigir al flujo operativo validado. La identificación precisa y la propuesta de simplificación están en [la auditoría de producto y UX](product-scope-and-ux-audit.md); se trata de `MarketingTab` del panel interno, no de una pestaña de masivos llamada `MetaMarketingTab`.
2. Validar una campaña real pequeña, programador, recibos y bajas antes de habilitar ejecución. Las pruebas locales no certifican Meta Live.
3. Definir retención del historial cuando se borran contactos: la relación existente usa cascada, como se documentó en la etapa 6.
4. Integrar limpieza periódica de revisiones si se exige plazo garantizado de eliminación de datos temporales.
5. Para miles de filas, implementar un job por lotes con almacenamiento privado temporal, progreso y cancelación. Esta versión publica el límite de 100; no simula importar archivos mayores.
6. Integrar las cadenas nuevas en el catálogo completo de idiomas.

No se implementaron presupuestos, cobros ni alertas. La ejecución masiva continúa deshabilitada.
