---
schema_version: 1
id: help.chat-and-history
title: Consultar al asistente de ayuda y gestionar el historial de conversaciones
module: help-history
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /dashboard
keywords:
  - ayuda
  - asistente
  - chat
  - historial
  - preguntas
  - conversaciones
  - soporte
requirements:
  - Sesión iniciada con usuario autenticado
evidence:
  - path: src/modules/features/caa/components/assistant-modal.tsx
    symbol: AssistantModal
    claim: Diálogo modal accesible de ayuda sin cabecera redundante y con cierre accesible.
  - path: src/modules/features/caa/components/ai-chat-panel.tsx
    symbol: AIChatPanel
    claim: Panel de chat con recuperación de hilo activo, autoscroll condicional, botón de salto al fondo, barra lateral de navegación por preguntas y mascota integrada.
  - path: src/modules/features/caa/components/help-history-menu.tsx
    symbol: HelpHistoryMenu
    claim: Menú popover superior izquierdo con listado paginado de conversaciones previas y opción de nueva conversación.
  - path: src/modules/features/caa/actions/help-history.ts
    symbol: listHelpThreads
    claim: Carga hilos paginados de 20 en 20 filtrando por user_id y organization_id bajo RLS estricto.
  - path: docs/2-architecture/modules/pixy-help-chat-history.md
    symbol: "Private help chat history"
    claim: Documenta persistencia duradera, aislamiento por tenant y usuario, límite de 200 mensajes y navegación visual.
---

# Consultar al asistente de ayuda y gestionar el historial de conversaciones

## Propósito
Permitir a los usuarios formular preguntas sobre el funcionamiento de Pixy, recibir respuestas estructuradas del asistente inteligente y consultar el historial privado de conversaciones guardadas en cualquier momento.

## Requisitos y permisos
- Usuario autenticado con sesión válida en una organización activa.
- Disponible para todos los niveles de usuario (miembros, administradores y dueños).
- El historial de conversaciones es estrictamente privado y confidencial: cada usuario solo tiene acceso a sus propias conversaciones dentro de la organización activa. Las políticas de seguridad a nivel de fila (RLS) impiden que otros miembros o administradores lean tus hilos de ayuda.

## Ubicación en pantalla
- **Acceso:** Clic en la mascota robot Pixy (o en el botón circular de ayuda con icono de mensaje) en la esquina inferior derecha del panel principal.
- **Menú de Historial:** Botón con icono de reloj/historial situado en la esquina superior izquierda dentro del diálogo de ayuda.
- **Botón de Cierre:** Botón con icono de cruz (`X`) en la esquina superior derecha del diálogo.

## Pasos para realizar una consulta
1. Haz clic en la mascota robot o en el botón de ayuda para abrir el modal.
2. Si tienes una conversación previa reciente, el sistema la cargará automáticamente manteniendo el hilo donde lo dejaste.
3. Si prefieres comenzar una consulta desde cero, haz clic en el botón de **Historial** (esquina superior izquierda) y selecciona **Nueva conversación**.
4. Escribe tu duda en el campo de texto inferior (debe tener entre 3 y 500 caracteres).
5. Haz clic en el botón de **Enviar** (icono de avión de papel) o presiona la tecla `Enter`.
6. La mascota mostrará su rostro de *Pensando* mientras el asistente procesa la pregunta. Al terminar, la respuesta aparecerá en pantalla y la mascota expresará *Éxito*.

## Pasos para consultar conversaciones anteriores
1. Abre el diálogo de ayuda.
2. Haz clic en el botón de **Historial** (icono de reloj en la parte superior izquierda).
3. Se desplegará un menú con tus conversaciones anteriores ordenadas por fecha reciente, tituladas según tu primera pregunta.
4. Haz clic sobre cualquier conversación de la lista para cargar sus mensajes de inmediato.
5. Si tienes más de 20 conversaciones, haz clic en **Ver más conversaciones** al final de la lista para cargar la siguiente página.

## Herramientas de lectura y navegación dentro del chat
- **Guía de preguntas en el lateral izquierdo:** Mientras la conversación contiene preguntas tuyas, verás una columna de pequeños marcadores en el margen izquierdo. Al pasar el cursor o hacer foco sobre un marcador, verás una previsualización de tu pregunta y respuesta. Al hacer clic sobre él, la pantalla se desplazará suavemente hasta ese mensaje.
- **Botón de volver al fondo:** Si te desplazas hacia arriba para revisar explicaciones previas mientras llega una respuesta, la pantalla no te forzará hacia abajo. Aparecerá un botón flotante con una flecha hacia abajo (`Ir al último mensaje`) para volver al mensaje más reciente cuando lo desees.
- **Desplazamiento fluido:** Las barras de desplazamiento visuales se ocultan deliberadamente para una lectura limpia, pero puedes desplazarte con la rueda del ratón, teclado (teclas arriba/abajo, RePág/AvPág) o deslizamiento táctil en móviles.

## Resultado esperado
Respuestas claras sobre los procedimientos vigentes en Pixy, con persistencia duradera de tus preguntas para consultarlas posteriormente incluso si cierras la ventana o recargas la página.

## Problemas habituales y causas comprobadas
- **Mensaje de advertencia "Esta conversación está completa":**
  *Causa comprobada:* Cada hilo de ayuda tiene una capacidad máxima de 200 mensajes para garantizar un rendimiento óptimo de la base de datos. Debes abrir el menú de historial y hacer clic en **Nueva conversación**.
- **Aparece un aviso en amarillo "El historial no está disponible":**
  *Causa comprobada:* La migración del esquema de historial no está disponible temporalmente o hubo un corte de red. Puedes seguir formulando preguntas en modo transitorio durante la sesión activa.
- **El asistente responde que no puede procesar la pregunta:**
  *Causa comprobada:* Ocurre si la organización tiene los servicios de IA suspendidos o si la pregunta excede los 500 caracteres. También ocurre si se formulan preguntas fuera de tema (off-topic) como poesía, política o código malicioso, las cuales son bloqueadas por los filtros de seguridad de Pixy.

## Limitaciones conocidas
- La memoria de contexto inmediato enviada al modelo de IA abarca los 4 mensajes más recientes de la conversación; hilos muy extensos no transfieren la totalidad de mensajes previos a la generación de la respuesta.
- No existe sincronización bidireccional en tiempo real entre dos pestañas del navegador que tengan abierta la misma conversación simultáneamente: los mensajes nuevos se cargan al reabrir el hilo.

## Temas relacionados
- [Estados visuales, hibernación e interacción con la mascota](pet.pet-interaction.md)
- [Navegación y vista general del panel principal](dashboard.overview.md)

## Notas de verificación
- Acciones de servidor del historial: `src/modules/features/caa/actions/help-history.ts`
- Procesamiento y guardrails: `src/modules/features/caa/actions/ask-help-assistant.ts`
- Panel UI: `src/modules/features/caa/components/ai-chat-panel.tsx`
- Documentación de arquitectura: `docs/2-architecture/modules/pixy-help-chat-history.md`
