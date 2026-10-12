---
schema_version: 1
id: inbox.manage-conversations
title: Atender y gestionar conversaciones en la bandeja unificada (Inbox)
module: inbox
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
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
requirements:
  - Módulo module_messaging activo en la organización
  - Acceso a canales mediante permisos IAM (inbox.conversations.view_all o canal asignado)
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
   - Pestañas superiores para filtrar chats: *Todos*, *Míos / Asignados*, *Sin Asignar*, y *Resueltos*.
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
6. Si requieres reasignar el chat a otro compañero, utiliza el selector de agente en la parte superior del chat o arrastra la tarjeta a la zona de asignación.
7. Al concluir la gestión, haz clic en **Resolver conversación** para archivarla de la vista principal de pendientes.

## Resultado esperado
Los mensajes se envían de forma instantánea al teléfono del cliente a través del proveedor conectado, y las respuestas entrantes se sincronizan en tiempo real mediante Supabase Realtime.

## Problemas habituales y causas comprobadas
- **La bandeja aparece completamente vacía:**
  *Causa comprobada:* Tu usuario no tiene el permiso `inbox.conversations.global_view` y no tiene canales asociados en su perfil, o no hay conversaciones en el filtro seleccionado. Selecciona la pestaña *"Todos"* o solicita a un administrador que asigne canales a tu usuario en Configuración de Equipo.
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
