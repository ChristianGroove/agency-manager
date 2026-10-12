---
schema_version: 1
id: inbox.saved-replies-and-templates
title: Respuestas rápidas y plantillas de mensaje en Inbox
module: inbox
status: draft
audience: tenant-user
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /crm/inbox
keywords:
  - inbox
  - respuestas rápidas
  - respuestas guardadas
  - plantillas
  - whatsapp
  - meta
  - ventana 24 horas
  - mensajes
  - redactor
  - variables
requirements:
  - Módulo module_messaging activo en la organización
  - Acceso al canal y a la conversación correspondiente
evidence:
  - path: src/modules/features/messaging/components/saved-replies-sheet.tsx
    symbol: SavedRepliesSheet
    claim: Gestiona respuestas rápidas locales para agentes, permitiendo crear, buscar, refinar con IA e insertar texto en el redactor.
  - path: src/modules/features/messaging/components/template-picker-sheet.tsx
    symbol: TemplatePickerSheet
    claim: Sincroniza y muestra plantillas oficiales aprobadas por Meta con meta_id, permitiendo rellenar variables dinámicas {{1}} y enviarlas fuera de la ventana de 24 horas.
  - path: src/modules/features/messaging/components/chat-area/chat-input.tsx
    symbol: ChatInput
    claim: Ofrece controles para alternar entre mensaje al cliente y modo nota interna privada, adjuntar archivos y abrir el selector de plantillas.
  - path: src/modules/features/messaging/actions/templates.ts
    symbol: getTemplatesForConversation
    claim: Recupera las plantillas de mensaje disponibles para la conversación activa.
  - path: src/modules/features/messaging/send-template-action.ts
    symbol: sendTemplateMessage
    claim: Envía la plantilla oficial con sus parámetros a través de la API oficial del proveedor de mensajería.
---

# Respuestas rápidas y plantillas de mensaje en Inbox

## Propósito
Explicar el uso, las diferencias operativas y las restricciones entre las respuestas rápidas guardadas localmente en Pixy y las plantillas oficiales homologadas por Meta en WhatsApp Business, así como el manejo de notas internas privadas en el redactor de conversaciones.

## Requisitos y permisos
- Organización con el módulo de mensajería (`module_messaging`) habilitado.
- Acceso asignado al canal correspondiente (mediante `inbox.conversations.global_view` o canales específicos concedidos al miembro del equipo).
- Para plantillas oficiales: disponer de plantillas previamente creadas y aprobadas en Meta Business Manager con identificador oficial (`meta_id`).

## Ubicación en pantalla
- **Ruta web:** `/crm/inbox`
- **Menú lateral:** Sección **CRM** → opción **Inbox**.
- **Controles de redacción:** En la parte inferior del área de chat central.

## Diferencia crítica: Respuestas rápidas vs. Plantillas oficiales de Meta

Es fundamental no confundir ambos mecanismos, pues responden a arquitecturas y normativas distintas:

1. **Respuestas rápidas (Saved Replies):**
   - Son fragmentos de texto reutilizables creados y almacenados localmente dentro de Pixy.
   - Su función es ahorrar tiempo de digitación a los agentes frente a consultas repetitivas (saludos, preguntas frecuentes, horarios).
   - Al pulsar sobre una respuesta rápida, su contenido se inserta directamente en el campo de texto del redactor.
   - **Restricción estricta:** Insertar una respuesta rápida equivale a redactar texto libre. Por tanto, **no evade ni supera la ventana de 24 horas de WhatsApp**. Si el cliente lleva más de 24 horas sin enviar un mensaje, intentar enviar una respuesta rápida como texto libre provocará un error de envío por políticas de Meta.

2. **Plantillas oficiales (Official Meta Templates):**
   - Son mensajes estructurados y pre-aprobados directamente por Meta a través de la WhatsApp Business Platform.
   - Cuentan con estado `APPROVED` y un identificador oficial (`meta_id`).
   - Soportan parámetros variables dinámicos como `{{1}}` o `{{2}}` (por ejemplo: nombre del cliente, número de pedido o fecha de cita).
   - **Función exclusiva:** Son el único medio autorizado por Meta para iniciar una conversación con un cliente o reabrir el canal cuando han transcurrido más de 24 horas desde la última intervención del usuario.

## Pasos para utilizar respuestas rápidas guardadas

1. Abre la conversación con el cliente en `/crm/inbox`.
2. En la barra de redacción inferior, abre el panel de respuestas guardadas.
3. Se desplegará el panel lateral con la lista de respuestas disponibles y una barra de búsqueda para filtrar por palabras clave.
4. Si deseas redactar una nueva respuesta reutilizable para el equipo, presiona **Nueva Plantilla**, asigna un título, icono y contenido, y guarda los cambios. También dispones del botón de refinamiento con inteligencia artificial si requieres mejorar la redacción.
5. Haz clic sobre la respuesta rápida deseada. El texto se volcará de inmediato en la caja de redacción del chat.
6. Revisa y ajusta el texto si lo consideras pertinente antes de pulsar **Enviar** (o presionar la tecla `Enter`). La selección de una respuesta nunca envía el mensaje de forma instantánea al cliente sin confirmación.

## Pasos para enviar una plantilla oficial de Meta (fuera de la ventana de 24 horas)

1. En la conversación deseada, haz clic en el icono de documento/plantilla oficial ubicado en los controles inferiores del chat o en la cabecera.
2. El sistema se sincronizará automáticamente con Meta (`syncTemplatesForConversation`) y mostrará el catálogo de plantillas aprobadas vinculadas al número telefónico del canal.
3. Selecciona la plantilla que deseas remitir.
4. Si la plantilla contiene variables dinámicas (como `{{1}}` o `{{2}}`), la interfaz presentará campos de formulario individuales para que ingreses el valor de cada variable.
5. Verifica la previsualización del mensaje con las variables completadas.
6. Presiona el botón de envío. El sistema remitirá la plantilla mediante la acción de servidor (`sendTemplateMessage`), la cual invocará la API oficial de Meta y registrará el mensaje en el historial del chat.

## Modo Nota interna privada

Para dejar apuntes de seguimiento, recordatorios o directrices técnicas entre compañeros de equipo sin que el cliente las reciba:

1. En la parte superior de la caja de redacción del chat, haz clic en el conmutador **Nota**.
2. El control cambiará a **Modo Nota** y el área de texto adoptará una apariencia visual ámbar distintiva.
3. Escribe las observaciones deseadas y pulsa **Enviar**.
4. La nota se guardará en la base de datos de la conversación y se mostrará en el historial con un fondo destacado visible exclusivamente para los miembros autorizados del equipo.
5. Antes de responder al cliente, vuelve a pulsar el conmutador para desactivar el Modo Nota y regresar al redactor estándar.

## Resultado esperado
- Al insertar una respuesta rápida, el texto queda listo para edición o envío inmediato en el redactor.
- Al enviar una plantilla oficial, Meta valida la estructura y entrega el mensaje al destinatario fuera del horario convencional de atención.
- Las notas internas quedan archivadas cronológicamente en el hilo sin transferirse al canal de WhatsApp del cliente.

## Problemas habituales y causas comprobadas
- **Error al enviar mensaje por vencimiento de ventana:**
  *Causa comprobada:* Intentaste enviar texto libre o una respuesta rápida después de cumplidas 24 horas de inactividad del cliente. Solución: Utiliza el selector de plantillas oficiales para reactivar la conversación con una plantilla aprobada.
- **La plantilla requerida no aparece en la lista:**
  *Causa comprobada:* La plantilla aún está en revisión o fue rechazada en el administrador comercial de Meta, o bien pertenece a otro número/canal diferente al activo.
- **El cliente recibió una nota que debía ser privada:**
  *Causa comprobada:* Se redactó el mensaje sin verificar que el botón superior indicara activamente **Modo Nota** en color ámbar.

## Limitaciones conocidas
- Las plantillas oficiales deben gestionarse y homologarse previamente en la plataforma comercial de Meta; no pueden crearse arbitrariamente como texto libre en el momento del envío.
- Las variables dinámicas en plantillas oficiales no admiten saltos de línea ni caracteres especiales prohibidos por Meta.

## Temas relacionados
- [Atender y gestionar conversaciones en Inbox](inbox.manage-conversations.md)
- [Configurar y sincronizar canales de mensajería](inbox.manage-channels.md)

## Notas de verificación
- Gestor de respuestas rápidas: `src/modules/features/messaging/components/saved-replies-sheet.tsx`
- Selector de plantillas de Meta: `src/modules/features/messaging/components/template-picker-sheet.tsx`
- Redactor y notas: `src/modules/features/messaging/components/chat-area/chat-input.tsx`
- Envío oficial de plantillas: `src/modules/features/messaging/send-template-action.ts`
