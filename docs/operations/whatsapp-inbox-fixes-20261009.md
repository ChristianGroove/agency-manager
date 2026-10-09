# Correcciones del inbox WhatsApp — 9 de octubre de 2026

Rama: `codex/whatsapp-inbox-fixes`, creada desde `master` actualizado (`b0f3cf9e`).

## Causas comprobadas

- **Nombre genérico:** algunos eventos incluyen `profile.username` en lugar de `profile.name`; los ecos identifican al cliente en `to`. El parser solo buscaba el nombre del remitente. Un lead creado como `WhatsApp User` tampoco recibía enriquecimiento posterior.
- **Reloj de envío:** la base de producción ya contiene estados `sent` y `delivered`. El chat ignoraba una inserción cuyo ID coincidía con el mensaje optimista y no escuchaba las actualizaciones de `messages`. La sincronización manual tampoco reemplazaba filas existentes.
- **Audio saliente:** Meta devuelve `131053`. El detalle indica un audio declarado como MP4 cuyo contenido no pudo reconocer. El conversor quitaba los bits de identificación de los elementos WebM, por lo que no encontraba los paquetes Opus y devolvía el WebM original. Después el proveedor lo reclasificaba como MP4. El empaquetado anterior también truncaba paquetes mayores de 255 bytes.
- **Scroll:** `firstItemIndex` disminuía al añadir mensajes nuevos. Ese índice solo debe disminuir al anteponer historial. También faltaba acompañar el cambio de altura al cargar multimedia y se usaba un índice inicial absoluto fuera del rango de la lista.

## Alcance

Los nombres se enriquecen únicamente cuando son genéricos, vacíos o el propio teléfono. Se conservan los nombres editados en el CRM mediante una condición de actualización sobre el valor anterior y el tenant. Los ecos buscan el perfil del destinatario.

El chat usa los estados persistidos y una suscripción de actualización filtrada por conversación. Las respuestas y eventos de una conversación anterior se descartan al cambiar de chat. El scroll acompaña los mensajes y la carga multimedia cuando se está al final; conserva la posición al leer historial.

La conversión de audio conserva los paquetes Opus completos, la cabecera original, las duraciones y los CRC de Ogg. Una grabación inválida produce error en lugar de enviarse con una etiqueta falsa. OGG nativo y MP4 nativo conservan su formato. La frontera de subida comprueba el contenedor y el MIME del audio antes de subirlo a Meta.

No se requiere migración, variable nueva ni cambio de webhook. Los motores de automatización, asignación, outbox, conciliación de estados y recepción de multimedia conservan su implementación.

## Validación

- Pruebas de regresión de mensajería, aislamiento de tenants, onboarding, recuperación de outbox, webhooks y acceso a multimedia privada.
- Pruebas nuevas de nombres, actualización de estados, cambio de conversación y anclaje de historial.
- Fixture de un tono sintético generado por Chrome MediaRecorder, sin micrófono ni datos de clientes. El OGG convertido se decodificó en Chrome con la misma duración que el original.
- Navegador con Virtuoso real: apertura, mensaje entrante, imagen de carga tardía, historial antepuesto, envío desde historial y cambio de altura del compositor. Se conservaron el fondo y el anclaje según correspondía.
- TypeScript con `--noEmit --incremental false`.

La corrección del contenedor sigue las especificaciones de [Matroska/Opus](https://www.matroska.org/technical/codec_specs.html) y [Ogg/Opus (RFC 7845)](https://www.rfc-editor.org/rfc/rfc7845). El anclaje y la carga multimedia usan la [API de Virtuoso](https://virtuoso.dev/react-virtuoso/api-reference/virtuoso/).

Las pruebas de onboarding requieren una `ENCRYPTION_KEY` sintética de al menos 32 bytes en el proceso de pruebas. No requieren claves de producción.

## Despliegue y verificación final

Desplegar la rama después de integrarla. Recargar el inbox para obtener el cliente actualizado. Comprobar con la WABA de prueba: un mensaje entrante con nombre, respuesta de texto con actualización de estado, una nota de voz nueva recibida en el teléfono y una imagen mientras el chat está al fondo. Comprobar también que leer historial no salte al fondo con un mensaje entrante.

Los audios fallidos antiguos conservan su estado; no se reenvían automáticamente. Para repetir la prueba, grabar un audio nuevo.

La lectura de producción encontró 13 leads genéricos con un nombre recuperable en eventos guardados de los últimos 30 días. La corrección los puede enriquecer con un nuevo evento; para evaluar una recuperación histórica sin reenviar mensajes ni disparar automatizaciones, usar la consulta de solo lectura `whatsapp-contact-name-candidates.sql`. Esa recuperación de datos no está aplicada por estos cambios.
