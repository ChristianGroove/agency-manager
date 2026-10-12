---
schema_version: 1
id: inbox.manage-conversations
title: Atender y gestionar conversaciones en la bandeja unificada (Inbox)
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
  - mensajería
  - whatsapp
  - chat
  - clientes
  - agentes
  - conversaciones
  - filtros
  - asignar
  - reasignar
  - notas internas
  - respuestas guardadas
  - plantillas
  - resolver
  - archivar
  - posponer
requirements:
  - Módulo module_messaging activo en la organización
  - Acceso al canal mediante vista global o autorización específica; ver todas las conversaciones no equivale a acceso a todos los canales
evidence:
  - path: src/app/(dashboard)/crm/inbox/page.tsx
    symbol: CRMInboxPage
    claim: Carga la vista de bandeja unificada a pantalla completa.
  - path: src/modules/features/messaging/components/inbox-layout.tsx
    symbol: InboxLayoutContent
    claim: Arquitectura de tres paneles (lista de hilos, chat central y deck de contexto del contacto con arrastre drag-and-drop).
  - path: src/components/layout/sidebar.tsx
    symbol: SidebarContent
    claim: Colapsa automáticamente el menú principal al navegar a /crm/inbox para maximizar el área de trabajo.
  - path: src/modules/features/messaging/components/sidebar/sidebar-conversation-list.tsx
    symbol: SidebarConversationList
    claim: Filtra conversaciones por estado, agente y búsqueda, respetando permisos de canales.
  - path: src/modules/features/messaging/components/chat-area/chat-input.tsx
    symbol: ChatInput
    claim: Permite alternar Nota y Modo Nota y abrir respuestas guardadas o plantillas.
  - path: src/modules/features/messaging/components/chat-area/chat-header.tsx
    symbol: ChatHeader
    claim: Ofrece acciones Resolver, Posponer y Archivar con actualización posterior a la acción de servidor.
  - path: src/modules/features/messaging/components/quick-assign-panel.tsx
    symbol: QuickAssignPanel
    claim: Selector de agente para asignar una conversación, sujeto a permisos.
  - path: src/modules/core/iam/utils/inbox-permissions.ts
    symbol: evaluateInboxPermissions
    claim: Distingue vista global de canales, supervisión de conversaciones y canales autorizados.
  - path: src/modules/features/messaging/components/saved-replies-sheet.tsx
    symbol: SavedRepliesSheet
    claim: Permite gestionar respuestas rápidas y seleccionar contenido para insertarlo en el redactor.
  - path: src/modules/features/messaging/components/chat-area/chat-area.tsx
    symbol: ChatArea
    claim: Abre respuestas guardadas y plantillas y conecta su selección con el campo de redacción.
  - path: src/modules/features/messaging/hooks/use-chat-actions.ts
    symbol: useChatActions
    claim: Distingue nota interna de mensaje normal al preparar el envío.
---

# Atender y gestionar conversaciones en la bandeja unificada (Inbox)

## Propósito
Centralizar las comunicaciones entrantes de clientes desde canales conectados (como WhatsApp y mensajería oficial), permitiendo a los agentes responder en tiempo real, asignar chats, registrar notas internas y consultar el historial del contacto sin salir de la bandeja.

## Requisitos y permisos
- Que la organización tenga habilitado el módulo de mensajería (`module_messaging`).
- Contar con permisos de acceso a canales:
  - *Vista Global (`inbox.conversations.global_view`):* Permite acceder a todos los canales conectados de la empresa.
  - *Asignación específica (`inbox_access`):* Si el usuario no tiene vista global, solo podrá ver los canales explícitamente autorizados en su perfil de miembro.
  - *Supervisión (`inbox.conversations.view_all`):* Permite leer conversaciones de otros agentes o no asignadas.
- Al menos un canal oficial de mensajería debe estar vinculado y activo.

## Ubicación en pantalla
- **Ruta web:** `/crm/inbox`
- **Menú lateral:** Sección **CRM** → opción **Inbox** (icono de bandeja de entrada). Al ingresar, el menú lateral principal se colapsa automáticamente para otorgar el máximo espacio a la conversación.

## Distribución de los tres paneles de trabajo
1. **Panel izquierdo (Bandeja y filtros):**
   - Pestañas **Conversaciones** y **Contactos**.
   - Filtros de conversaciones **Todos**, **No leídos**, **Asignados a mí**, **Pospuestos** y **Archivados**. El filtro de agente y **Sin Asignar** dependen de los permisos de supervisión.
   - Selector o filtro por canal de mensajería (números de WhatsApp activos).
   - Lista cronológica de conversaciones con indicador de mensajes no leídos, nombre del contacto y última hora de interacción.
2. **Panel central (Área de chat):**
   - Historial de mensajes entre el cliente y el agente.
   - Caja de redacción inferior con soporte para texto, emojis, notas internas privadas (visibles solo para el equipo) y envío de plantillas aprobadas.
3. **Panel derecho (Deck de contexto del contacto):**
   - Ficha del cliente: nombre, teléfono, correo y empresa.
   - Estado comercial del contacto en el embudo (Pipeline de ventas).
   - Acceso rápido a cotizaciones y notas históricas.

## Pasos para atender una conversación
1. Accede a **Inbox** en el menú lateral.
2. En la columna izquierda, haz clic sobre una conversación no leída o pendiente.
3. El panel central cargará el historial completo del chat.
4. Escribe tu mensaje en la barra inferior. Si deseas enviar una nota para que solo la lean tus compañeros de equipo sin que le llegue al cliente, activa la opción de **Nota interna**.
5. Presiona **Enviar** o la tecla `Enter`.
6. Para reasignar el chat, utiliza el selector de agente del panel de contexto si tu usuario tiene permiso. No confundas asignar un agente con arrastrar un chat entre zonas de estado.
7. Al concluir la gestión, utiliza **Resolver** en la cabecera del chat. **Posponer** aplaza la conversación hasta el día siguiente y **Archivar** la retira de la lista activa. Resolver y archivar son acciones distintas; no equivalen a borrar el historial.

## Resultado esperado
El sistema solicita el envío al proveedor y actualiza la conversación. La entrega depende del canal y de la conexión; un fallo puede generar un aviso. No se debe asumir entrega al teléfono por el solo hecho de redactar o pulsar Enviar.

## Notas internas y respuestas rápidas

- Para escribir algo solo para el equipo, activa **Nota** en el redactor. El control pasa a **Modo Nota**. Escribe la nota y envíala; vuelve a desactivar ese modo antes de redactar un mensaje para el cliente.
- Las respuestas guardadas permiten reutilizar texto. Abre el selector desde los controles del redactor, elige una respuesta y revisa el texto insertado antes de enviarlo. Puedes gestionar el contenido en el panel **Plantillas de Mensaje**, cuya opción de creación es **Nueva Plantilla**.
- Una respuesta rápida insertada en el redactor no debe confundirse con una plantilla oficial aprobada por el proveedor. El selector de plantillas oficiales tiene su propio panel. Cuando el canal restringe el texto libre, usar una respuesta guardada no evita esa restricción.
- No se envía un mensaje al cliente por el solo hecho de abrir o seleccionar una respuesta; revisa el contenido y confirma el envío.

## Problemas habituales y causas comprobadas
- **La bandeja aparece completamente vacía:**
  *Posibles causas a verificar:* No hay conversaciones en el filtro, el canal no tiene datos o tu usuario no tiene acceso. Prueba **Todos** y revisa el canal seleccionado. Si no tienes vista global ni canales autorizados, pide al administrador que revise tu acceso. Ver todas las conversaciones no concede automáticamente acceso a todos los canales.
- **Error al enviar mensaje fuera de la ventana de 24 horas:**
  *Causa comprobada:* Políticas oficiales de Meta (WhatsApp Business Cloud API) impiden enviar mensajes de texto libre si el cliente no ha interactuado en las últimas 24 horas. Debes utilizar una **Plantilla aprobada** para restablecer la comunicación.
- **El menú lateral se encogió solo:**
  *Causa comprobada:* Es un comportamiento de diseño intencionado: al entrar a `/crm/inbox`, el sidebar se colapsa para ofrecer mayor amplitud al chat y al deck de contexto. Puedes expandirlo cuando quieras con el botón rosa circular.

## Limitaciones conocidas
- La subida de archivos multimedia adjuntos (imágenes, audios, documentos) está sujeta a los límites de tamaño establecidos por la API de Meta y las políticas de almacenamiento del tenant.

## Temas relacionados
- [Gestión de contactos y prospectos en CRM](crm.manage-contacts.md)
- [Gestión de embudo de ventas y pipeline](crm.manage-pipeline.md)

## Notas de verificación
- Ruta de página: `src/app/(dashboard)/crm/inbox/page.tsx`
- Controlador de interfaz: `src/modules/features/messaging/components/inbox-layout.tsx`
- Permisos granulares de mensajería: `src/modules/core/iam/actions/permissions.ts` (grupo `INBOX`).
