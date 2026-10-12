---
schema_version: 1
id: tasks-portal.support-tickets-collaboration
title: Identificar tickets de soporte paralelo (Prefijo SUP) y colaborar en consultas técnicas
module: tasks
status: draft
surface: portal.tasks
audience: portal-collaborator
source_revision: 5aaeec98767f13ec9b495eed33486fcdba65ab86
verified_on: 2026-10-12
verification: source-only
routes:
  - /portal/tasks/[token]
keywords:
  - tickets sup
  - prefijo sup
  - soporte paralelo
  - consultas tecnicas
  - atencion al cliente
  - incidencia
  - origen soporte
  - ticket sup
  - significa sup
requirements:
  - Acceso al portal operativo de tareas como colaborador asignado o participante del equipo
  - Requerimiento con origen en soporte técnico (código con prefijo SUP o origin_type support)
evidence:
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: TaskCollaboratorPortal
    claim: Detecta tickets con prefijo SUP o de origen support y abre el modal especializado de consulta técnica.
  - path: src/modules/features/tasks/components/portal/task-support-ticket-detail-modal.tsx
    symbol: TaskSupportTicketDetailModal
    claim: Renderiza la interfaz de triaje y discusión entre el colaborador técnico y el agente de soporte asignado.
---

# Identificar tickets de soporte paralelo (Prefijo SUP) y colaborar en consultas técnicas

## Propósito
Explicar a los desarrolladores, diseñadores y colaboradores del portal operativo qué significa el prefijo **SUP** en las tarjetas de requerimiento, cuál es su procedencia desde la mesa de ayuda y cómo interactuar con el agente de soporte asignado mediante la ventana modal de consulta técnica.

## ¿Qué significa el prefijo SUP en un ticket?
- **Origen en soporte paralelo:** El prefijo **#SUP-** (por ejemplo, `#SUP-042`) identifica requerimientos originados en el canal de soporte paralelo y atención al cliente, a diferencia de las tareas estándar de ingeniería identificadas con **#TK-**.
- **Incidencias de usuarios reales:** Proviene de una solicitud de asistencia técnica, reporte de falla o consulta remitida por un usuario final a través de la mesa de soporte.
- **Canal de comunicación directo:** Mantiene un canal bidireccional entre el equipo de ingeniería y el agente de soporte para resolver dudas técnicas sin exponer al cliente final a los tableros internos de desarrollo.
- **Clarificación de conceptos:** El prefijo `SUP` **no significa tarea de superadministrador** ni indica que el ticket carezca de proyecto asignado; está debidamente categorizado dentro del workspace correspondiente.

## Requisitos y perfiles
- **Perfiles aplicables:** Todos los colaboradores operativos (Desarrolladores, Diseñadores, Especialistas, QA y PMs).
- **Requisitos por registro:**
  - El colaborador debe pertenecer al workspace o proyecto al que fue derivado el ticket de soporte.
  - Para responder o aportar soluciones técnicas, se requiere estar asignado al ticket o participar en el hilo de discusión del proyecto.

## Ubicación en pantalla
- **Tablero Kanban y Lista de Tareas:** Las tarjetas muestran el distintivo `#SUP-XXX` en su etiqueta superior.
- **Modal de Consulta Técnica:** Al hacer clic sobre cualquier ticket con prefijo `SUP-` o con `origin_type === 'support'`, el portal abre automáticamente el modal `TaskSupportTicketDetailModal` en lugar del formulario de tarea convencional.

## Procedimiento paso a paso

### 1. Abrir un requerimiento de soporte en tu tablero
1. Localiza el ticket con prefijo `#SUP-` en tu lista o columna de trabajo.
2. Haz clic sobre la tarjeta.
3. El portal detecta el tipo de requerimiento y abre la consola de triaje `TaskSupportTicketDetailModal`.

### 2. Revisar los detalles y síntomas reportados
En el panel del ticket encontrarás:
1. **Descripción del cliente:** Resumen del problema reportado por el usuario final, pasos para reproducirlo y capturas adjuntas.
2. **Prioridad y urgencia:** Nivel de impacto asignado por el equipo de soporte (*Baja*, *Media*, *Alta*, *Urgente / Crítica*).
3. **Agente de soporte asignado:** Nombre y avatar del responsable de la mesa de ayuda que gestiona el caso con el cliente.

### 3. Responder consultas técnicas y colaborar
1. En el área de discusión técnica, redacta tu respuesta o diagnóstico técnico sobre la incidencia.
2. Utiliza menciones (`@Agente`) para notificar directamente al encargado de soporte.
3. El agente de soporte recibirá la notificación en su portal dedicado y transmitirá la orientación correspondiente al usuario final.

## Resultado esperado
Flujo de comunicación fluido y trazable entre la primera línea de atención al cliente y los ingenieros asignados, resolviendo incidentes complejos sin duplicar información ni confundir requerimientos contractuales con tickets de soporte.

## Errores y límites conocidos
- **Modal diferente al de tareas regulares:** Al hacer clic en un ticket SUP se despliega una interfaz simplificada de consulta (`TaskSupportTicketDetailModal`); no incluye selector de sprint ni desglose complejo de subtareas de desarrollo, ya que su propósito es la resolución ágil de la incidencia.
- **Solo personal de soporte opera el portal paralelo completo:** Los colaboradores técnicos colaboran en tickets SUP individuales desde su tablero habitual; el portal exclusivo de mesa de ayuda (`TaskParallelSupportPortal`) está reservado a personal con rol de soporte.

## Notas de verificación
- Detección de tickets SUP: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx` (`TaskCollaboratorPortal`, función `openTaskDetail`)
- Modal de consulta: `src/modules/features/tasks/components/portal/task-support-ticket-detail-modal.tsx` (`TaskSupportTicketDetailModal`)
