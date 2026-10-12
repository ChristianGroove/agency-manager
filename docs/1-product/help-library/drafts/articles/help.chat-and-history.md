---
schema_version: 1
id: help.chat-and-history
title: Consultar al asistente de ayuda y gestionar el historial de conversaciones
module: help-history
status: draft
audience: tenant-user
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
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
    claim: Carga hilos paginados de 20 en 20 filtrando por user_id y organization_id bajo RLS estricto, ordenados por fecha de creación (created_at DESC).
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
- El historial de ayuda permite consultar solo tus conversaciones dentro de la organización activa. Los administradores y superadministradores tampoco pueden abrir los historiales de otras personas mediante esta función. La persistencia depende de la disponibilidad del servicio y de que las tablas de historial estén instaladas en ese entorno.

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
3. Se desplegará un menú con tus conversaciones anteriores ordenadas por la fecha de creación del hilo (las más recientes primero, según `created_at`), tituladas según tu primera pregunta.
4. Haz clic sobre cualquier conversación de la lista para cargar sus mensajes de inmediato.
5. Si tienes más de 20 conversaciones, haz clic en **Ver más conversaciones** al final de la lista para cargar la siguiente página.

## Herramientas de lectura y navegación dentro del chat
- **Guía de preguntas en el lateral izquierdo:** Mientras la conversación contiene preguntas tuyas, verás una columna de pequeños marcadores en el margen izquierdo. Al pasar el cursor o hacer foco sobre un marcador, verás una previsualización de tu pregunta y respuesta. Al hacer clic sobre él, la pantalla se desplazará suavemente hasta ese mensaje.
- **Botón de volver al fondo:** Si te desplazas hacia arriba para revisar explicaciones previas mientras llega una respuesta, la pantalla no te forzará hacia abajo. Aparecerá un botón flotante con una flecha hacia abajo (`Ir al último mensaje`) para volver al mensaje más reciente cuando lo desees.
- **Desplazamiento fluido:** Las barras de desplazamiento visuales se ocultan deliberadamente para una lectura limpia, pero puedes desplazarte con la rueda del ratón, teclado (teclas arriba/abajo, RePág/AvPág) o deslizamiento táctil en móviles.

## Resultado esperado
Con el historial disponible, las preguntas y respuestas guardadas se conservan en la conversación privada. Si falla la creación de una nueva conversación, el sistema puede continuar con ayuda transitoria y muestra un aviso de que los mensajes podrían perderse al cerrar. Si no puede verificar o cargar una conversación existente, rechaza continuar ese hilo; puedes intentar nuevamente o iniciar una conversación nueva. Si falla el guardado de una pregunta en un hilo existente, debes reintentar; no se garantiza que todo fallo de persistencia permita continuar.

## Problemas habituales y causas comprobadas
- **Mensaje de advertencia "Esta conversación está completa":**
  *Causa comprobada:* Cada hilo tiene una capacidad máxima de 200 mensajes para acotar su tamaño. Abre el menú de historial y selecciona **Nueva conversación**.
- **Aparece un aviso en amarillo "El historial no está disponible":**
  *Causas posibles:* El servicio de historial no está disponible, faltan las tablas en ese entorno o falló una solicitud. El aviso no identifica por sí solo la causa exacta. Una conversación nueva puede continuar de manera transitoria si falla su creación, con advertencia de guardado; un hilo existente que no pueda verificarse no continúa hasta que se recupere el acceso o se inicie otro hilo.
- **El asistente responde que no puede procesar la pregunta:**
  *Causa comprobada:* Ocurre si la organización tiene los servicios de IA suspendidos o si la pregunta excede los 500 caracteres. También ocurre si se formulan preguntas fuera de tema (off-topic) como poesía, política o código malicioso, las cuales son bloqueadas por los filtros de seguridad de Pixy.

## Limitaciones conocidas
- En la versión estándar activa de la ayuda, la memoria conversacional enviada al modelo abarca los últimos 4 mensajes del hilo. La variante v2 (diseñada para transferir hasta 12 mensajes completos bajo un presupuesto de 10.000 caracteres) corresponde a una tarea en evaluación restringida al piloto y no está habilitada de manera general en el entorno base. Los hilos extensos no transfieren la totalidad del historial a cada nueva consulta.
- No existe sincronización bidireccional en tiempo real entre dos pestañas del navegador que tengan abierta la misma conversación simultáneamente: los mensajes nuevos se cargan al reabrir el hilo.

## Temas relacionados
- [Estados visuales, hibernación e interacción con la mascota](pet.pet-interaction.md)
- [Navegación y vista general del panel principal](dashboard.overview.md)

## Notas de verificación
- Acciones de servidor del historial: `src/modules/features/caa/actions/help-history.ts`
- Procesamiento y guardrails: `src/modules/features/caa/actions/ask-help-assistant.ts`
- Panel UI: `src/modules/features/caa/components/ai-chat-panel.tsx`
- Documentación de arquitectura: `docs/2-architecture/modules/pixy-help-chat-history.md`
