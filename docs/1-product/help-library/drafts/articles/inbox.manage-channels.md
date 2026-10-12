---
schema_version: 1
id: inbox.manage-channels
title: Configurar y sincronizar canales de mensajería
module: inbox
status: draft
audience: tenant-admin
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /crm/settings/channels
keywords:
  - canales
  - whatsapp
  - meta
  - messenger
  - instagram
  - cloud api
  - coexistencia
  - desconectar
  - horarios
  - asignación
  - canal principal
requirements:
  - Módulo module_messaging activo en la organización
  - Permiso de administración de canales inbox.channels.manage o rol de administrador
evidence:
  - path: src/app/(dashboard)/crm/settings/channels/page.tsx
    symbol: ChannelsPage
    claim: Página de administración de canales que verifica membresía, rol y módulos activos.
  - path: src/modules/features/channels/components/channels-list.tsx
    symbol: ChannelsList
    claim: Lista los canales conectados, gestiona modales de conexión para WhatsApp, Messenger e Instagram, y enlaza al Marketplace.
  - path: src/modules/features/channels/components/channel-card.tsx
    symbol: ChannelCard
    claim: Muestra el estado en tiempo real del canal, permite marcarlo como principal, desconectarlo y abrir el panel de edición.
  - path: src/modules/features/channels/components/edit-channel-sheet.tsx
    symbol: EditChannelSheet
    claim: Permite configurar el nombre del canal, etapa de pipeline por defecto, mensaje de bienvenida, respuesta fuera de horario y reglas de horario laboral.
  - path: src/modules/features/channels/actions.ts
    symbol: deleteChannel
    claim: Desconecta un canal del sistema deteniendo el tráfico de mensajes en la plataforma.
---

# Configurar y sincronizar canales de mensajería

## Propósito
Administrar la vinculación técnica, supervisión operativa y configuración de los canales de mensajería omnicanal de la empresa (WhatsApp Business Cloud API, Facebook Messenger e Instagram Direct), definiendo canal principal, horarios de atención y respuestas automáticas.

## Requisitos y permisos
- Módulo de mensajería (`module_messaging`) activo en el tenant.
- Permiso granular de administración de canales (`inbox.channels.manage`) o rol administrativo (`admin` / `owner`).
- Para vincular WhatsApp: cuenta comercial en Meta Business Manager con número de teléfono habilitado para Cloud API o modo coexistencia.

## Ubicación en pantalla
- **Ruta web:** `/crm/settings/channels`
- **Menú lateral:** Sección **CRM** → subsección **Settings** → opción **Canales**.

## Vista general de canales conectados
En la página principal se listan las tarjetas interactivas de cada canal configurado:
- **Indicador de salud en tiempo real:** Punto luminoso que refleja el estado de conexión verificado periódicamente (`active`, `inactive`, `error`).
- **Distintivo de proveedor y modo:** Identifica la plataforma (WhatsApp, Instagram, Messenger) y el modo de conexión (por ejemplo `App + API` para coexistencia o `Cloud API` estándar).
- **Insignia de canal principal:** Una estrella dorada destaca el canal configurado por defecto para las comunicaciones salientes de la empresa.

## Procedimientos de gestión operativa

### 1. Vincular un nuevo canal de mensajería
1. Dirígete a `/crm/settings/channels`.
2. En la cabecera superior, haz clic en el botón correspondiente a la red que deseas integrar:
   - **WhatsApp:** Abre el asistente modal de conexión guiada para Meta Cloud API o registro integrado (Embedded Signup).
   - **Messenger:** Inicia el flujo seguro de autenticación OAuth de Facebook.
   - **Instagram:** Conecta la cuenta profesional de Instagram vinculada a tu página de Meta.
3. Autoriza los permisos requeridos en el portal de Meta y confirma la selección del activo.
4. El nuevo canal aparecerá de inmediato en la cuadrícula de canales de Pixy.

### 2. Establecer un canal como principal
1. En la tarjeta del canal que deseas priorizar, haz clic en el menú contextual de opciones (tres puntos verticales) o abre el panel de edición.
2. Selecciona **Marcar como principal**.
3. El canal recibirá el distintivo de estrella y será seleccionado automáticamente al abrir nuevas conversaciones salientes.

### 3. Configurar horarios laborales y respuestas automáticas
1. Haz clic directamente sobre la tarjeta del canal para abrir el panel lateral de configuración.
2. **Nombre de conexión:** Asigna una etiqueta interna clara para identificar el canal entre los agentes (ejemplo: "WhatsApp Ventas Bogotá").
3. **Etapa por defecto en el Pipeline:** Selecciona la fase del embudo comercial donde ingresarán automáticamente los nuevos prospectos que escriban a este canal.
4. **Mensaje de bienvenida:** Redacta el texto de saludo que se remitirá al usuario al iniciar su primer contacto.
5. **Horarios de atención (Working Hours):**
   - Activa el interruptor de horarios laborales.
   - Configura la zona horaria de operación (por ejemplo: `America/Bogota`).
   - Define los rangos de atención permitidos para cada día de la semana (por ejemplo, lunes a viernes de 09:00 a 18:00).
6. **Respuesta fuera de horario:** Escribe el mensaje automático que el sistema despachará cuando un cliente escriba fuera del horario comercial definido.
7. Presiona **Guardar cambios** para aplicar la configuración.

### 4. Desconectar un canal de Pixy
1. En la tarjeta del canal, abre el menú de opciones y haz clic en **Desconectar / Eliminar**.
2. **Diferencia técnica fundamental:**
   - La desconexión en Pixy elimina el registro del canal en la plataforma y detiene el tráfico de entrada y salida local (`deleteChannel`).
   - **No desvincula automáticamente el número en Meta.** Si el canal operaba en modo de coexistencia de WhatsApp Business, debes desvincularlo manualmente desde el dispositivo móvil en: *WhatsApp Business → Configuración → Cuenta → Plataforma empresarial → Desconectar cuenta*.
3. Confirma el cuadro de diálogo de seguridad para completar la desconexión.

## Resultado esperado
Los canales activos sincronizan los mensajes bidireccionalmente con la bandeja unificada (`/crm/inbox`), enrutando a los prospectos según las etapas y asignaciones fijadas.

## Problemas habituales y causas comprobadas
- **El estado del canal aparece en color rojo o error:**
  *Causa comprobada:* El token de acceso de Meta expiró, o el webhook de la API de WhatsApp fue revocado en la consola de desarrolladores. Se requiere reautenticar el canal mediante el asistente.
- **Los mensajes entran a Pixy pero no se despachan respuestas automáticas de noche:**
  *Causa comprobada:* El interruptor de horarios de atención está desactivado en la configuración del canal o la zona horaria configurada no coincide con la región de operación de la empresa.
- **Un agente no puede ver el canal en su bandeja:**
  *Causa comprobada:* El agente no posee el permiso `inbox.conversations.global_view` y el administrador no ha incluido este canal específico en la lista de canales autorizados de su perfil.

## Limitaciones conocidas
- Para vincular una línea de WhatsApp a Meta Cloud API, dicho número no debe estar registrado simultáneamente en la aplicación móvil de WhatsApp tradicional a menos que utilice el modo de coexistencia oficial habilitado por Meta.

## Temas relacionados
- [Atender y gestionar conversaciones en Inbox](inbox.manage-conversations.md)
- [Respuestas rápidas y plantillas de mensaje en Inbox](inbox.saved-replies-and-templates.md)
- [Gestión de roles y permisos IAM V2](iam.manage-roles.md)

## Notas de verificación
- Página principal: `src/app/(dashboard)/crm/settings/channels/page.tsx`
- Lista de canales: `src/modules/features/channels/components/channels-list.tsx`
- Tarjeta de canal: `src/modules/features/channels/components/channel-card.tsx`
- Panel de edición: `src/modules/features/channels/components/edit-channel-sheet.tsx`
- Acción de desconexión: `src/modules/features/channels/actions.ts`
