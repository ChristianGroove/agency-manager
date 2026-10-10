# Marketing: destinatarios, plantillas y revisión previa

Etapa implementada en `codex/marketing-campaign-hardening`. **No habilita envíos reales todavía**: la activación transaccional del motor sigue bloqueada.

## Cambios verificables

- Los permisos de Marketing requieren membresía activa: las invitaciones pendientes no dan acceso, incluso si el rol propuesto es administrador.
- Campaña rápida: el número emisor, la audiencia, la campaña, la secuencia, el paso y el registro de difusión se guardan en una transacción. Un fallo revierte todos esos registros. La audiencia queda vinculada; antes los filtros estaban solo en el registro legado.
- Ambos constructores seleccionan plantillas por el canal autorizado. No se consultan ni transmiten credenciales en la configuración de Marketing. Los emisores se identifican por nombre y teléfono, cuando está disponible.
- Los pasos WhatsApp dejan de guardarse como texto libre: requieren identificador de plantilla, nombre, idioma y variables separadas por componente. El servidor vuelve a validar la pertenencia al canal, categoría MARKETING, aprobación e identificador de Meta.
- El contrato contempla BODY y HEADER de texto con variables posicionales o nombradas, encabezados IMAGE/VIDEO/DOCUMENT, URL dinámica y QUICK_REPLY. Los componentes no soportados se señalan explícitamente; no se omiten en silencio. Los parámetros se construyen dentro de Marketing y pasan por el emisor/outbox existente.
- Las variables de contacto admitidas son nombre, empresa y teléfono. No se sustituyen campos faltantes por texto vacío. La revisión identifica destinatarios autorizados que necesitan completar datos.
- El constructor avanzado ofrece creación explícita de secuencia y selección del flujo principal. Una secuencia adicional no se activa automáticamente. Cambiar el principal es transaccional y solo se admite en borradores.
- Los pasos nuevos reciben `max(order_index)+1` con bloqueo de la campaña, evitando duplicados tras eliminar posiciones intermedias. Los órdenes antiguos duplicados no se reescriben: la revisión los detecta.
- Se corrigen las referencias a columnas inexistentes: empresa usa `company_name`; los filtros temporales usan `last_activity_at`. Los antiguos filtros `last_contact_*` se rechazan con error; no se reinterpretan como si midieran contactos reales.
- Los horarios validan zona IANA y apertura anterior al cierre. El cálculo del worker usa esa zona, contempla saltos/repeticiones de horario de verano y admite cierre a las 24:00; no depende del reloj local del servidor.
- La UI distingue revisión de diseño, registro de autorización, guardado de borrador y activación. Ya no afirma que la protección automática por salud esté implementada.

## Autorización y bajas

`marketing_consent_events` conserva evidencia, origen, fecha, actor y eventos de autorización/revocación por organización y destinatario. Usuarios autenticados solo pueden leerlos según su permiso de Marketing; las escrituras pasan por una acción autorizada y un RPC interno. La cuenta de servicio tiene INSERT/SELECT, sin UPDATE/DELETE sobre ese historial.

Registrar una autorización exige un teléfono internacional válido, un contacto existente en la organización, evidencia, fecha no futura y confirmación expresa. Se añadió `libphonenumber-js` con versión fijada; esta validación no certifica que un teléfono esté registrado en WhatsApp. No hay país por defecto ni opt-in automático para contactos antiguos. Tampoco se inventa un doble opt-in obligatorio de WhatsApp: se registra permiso de marketing de la empresa.

La baja manual se registra y cancela inscripciones en una transacción, incluyendo los contactos duplicados con ese teléfono. Si no hay teléfono utilizable, la baja y su evidencia se conservan por identificador de contacto. Una autorización importada no sobrescribe una baja previa. El worker y las comprobaciones del outbox para operaciones de campaña consultan la autorización vigente. Desmarcar una bandera de baja en otro lugar no borra el evento de revocación por teléfono.

**Pendiente:** renovación explícita de un permiso revocado y detección automática de bajas entrantes. El payload `BAJA_PROMOCIONES` es una respuesta configurable de botón; todavía no tiene un detector automático asociado. No debe ofrecerse como baja automática operativa hasta completar ese punto.

## Audiencias y revisión

La revisión usa un filtro SQL común sobre todo el conjunto, excluye contactos eliminados y cuenta destinatarios únicos. Muestra coincidencias, destinatarios autorizados, duplicados, bajas, falta de permiso y teléfonos sin formato utilizable. No hay paginación REST que recorte el conteo a 1.000 filas.

La categoría «teléfono sin formato utilizable» corresponde a formato SQL; la validez internacional se comprueba al registrar el permiso. Un número con dígitos pero país inválido nunca se autoriza desde esa acción y puede figurar entre los contactos sin autorización. Los conteos guardados en las audiencias son referencias del momento de guardado; la revisión calcula los datos actuales.

La revisión lee el diseño y sus conteos con un snapshot de lectura. No crea inscripciones ni es una autorización permanente para enviar: la activación debe revalidar y congelar el diseño dentro de su propia transacción. Los resultados de interfaz obsoletos se descartan si cambia la campaña mientras la consulta está en curso.

## Alcance y validación

Migración adicional: `20261009143000_marketing_consent_and_preflight.sql`, después de `20261009120000_marketing_security_and_claims.sql`. Ambas se aplicaron **solo en Docker local**. No se configuraron schedulers ni se modificó producción, Coolify, webhooks, conexiones o credenciales de Meta.

No se editaron adapters, el emisor compartido, recepción multimedia, conciliación general de estados, asignaciones ni automatizaciones del CRM en esta etapa. Se amplió el RPC utilizado exclusivamente por claves de operación de campaña. La baja manual conserva su cambio deliberado de los campos de marketing del contacto.

Las pruebas SQL usan fixtures sintéticos y ROLLBACK: ausencia de consentimiento implícito, 1.101 contactos sin truncamiento, deduplicación, falla en la última escritura sin registros parciales, canal/audiencia vinculados, principal exclusivo, orden con huecos, revocación de duplicados, leases cancelados y conservación de evidencia. Hay pruebas unitarias de permisos, plantillas completas, consentimiento, campos faltantes, horarios IANA/DST y comportamiento del worker sin llamadas a Meta.

El payload de plantillas se verificó mediante pruebas y el contrato del adapter existente. La documentación técnica de Meta sobre envío de plantillas respondió 429 durante esta revisión: **no se presenta esto como validación Meta Live** de todos los componentes.

## Qué falta antes de activar

1. Activación y reanudación transaccionales, snapshot inmutable de diseño/destinatarios y revisión final bajo bloqueo; no basta con habilitar el botón.
2. Pacing efectivo compartido por número, revalidación del horario en la recuperación del outbox y scheduler dimensionado para campañas; los modos de ritmo siguen siendo referencias.
3. Bajas automáticas y salud real de número/plantilla; reconciliación y estados claros para envíos en cola o ambiguos.
4. Importación CSV revisable con evidencia y duplicados; no se ha habilitado la importación antigua.
5. Historial, métricas completas, finalización, paginación/exportación y presupuesto estimado opcional. Los pagos siguen gestionados por el cliente en Meta.
6. Prueba de carga y campaña pequeña con destinatarios de prueba autorizados, antes de un despliegue aprobado por el usuario.

Ningún intervalo o herramienta garantiza ausencia de restricciones de Meta. La autorización y las bajas responden a su [política de mensajería](https://whatsappbusiness.com/policy/).
