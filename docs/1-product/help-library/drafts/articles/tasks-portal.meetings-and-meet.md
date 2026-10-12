---
schema_version: 1
id: tasks-portal.meetings-and-meet
title: Gestionar reuniones sincrónicas, pase de lista y Google Meet
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
  - reuniones
  - google meet
  - videollamada
  - pase de lista
  - asistencia
  - minuta
  - auto-cierre
requirements:
  - Actividad de tipo 'meeting' asignada o convocada en el portal
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalCompleteMeetingSession
    claim: Sella la sesión de reunión, marca estado 'done', registra notas de cierre y confirma la lista de asistentes en comentarios.
  - path: src/modules/features/tasks/components/meetings/task-meeting-console.tsx
    symbol: TaskMeetingConsole
    claim: Provee la consola interactiva con botón 'Unirse a Google Meet', temporizador y lista de verificación de asistencia.
  - path: src/modules/features/tasks/components/meetings/task-meeting-detail-modal.tsx
    symbol: TaskMeetingDetailModal
    claim: Modal especializado para visualización y ejecución de sesiones sincrónicas.
---

# Gestionar reuniones sincrónicas, pase de lista y Google Meet

## Propósito
Explicar el funcionamiento de las actividades de tipo Reunión en el portal de tareas: cómo unirse a la sala virtual de Google Meet, registrar la asistencia de los participantes y consolidar la minuta o compromisos alcanzados durante la sesión.

## Requisitos y perfiles
- **Perfiles aplicables:** Todos los colaboradores convocados como asistentes (`meeting_attendees`) o convocantes de la sesión.
- **Integración:** Enlaces a Google Meet generados automáticamente cuando la organización cuenta con integración activa de Google Calendar.

## Ubicación en pantalla
- **Alternador de actividades:** En la barra superior de la vista de gestión, presiona el botón **Ver Reuniones**.
- **En la cuadrícula o lista:** Las reuniones se identifican visualmente con una insignia distintiva de color púrpura y el prefijo `#MTG-`.
- **En el Calendario:** Bloques de tiempo destacados según la hora de inicio (`meeting_start_at`).

## Procedimiento paso a paso

### 1. Consultar detalles de la reunión y unirse a Google Meet
1. Haz clic sobre la tarjeta de la reunión para abrir la **Consola de Reunión** (`TaskMeetingDetailModal`).
2. En la parte superior verás la modalidad (*Virtual*, *Híbrida* o *Presencial*), la fecha y hora de inicio, y la duración programada en minutos.
3. Si la reunión es virtual y cuenta con enlace, presiona el botón destacado **Unirse a Google Meet**. La sala de videollamada se abrirá en una nueva pestaña del navegador.

### 2. Pase de lista y confirmación de asistencia
1. Durante la sesión, desplázate a la sección **Asistentes Convocados**.
2. Verás la lista de colaboradores invitados con su foto y cargo.
3. El anfitrión o cualquier asistente autorizado puede marcar la casilla junto al nombre de cada compañero presente para confirmar su asistencia formal.
4. Las personas ausentes permanecerán desmarcadas para efectos de auditoría y métricas de puntualidad.

### 3. Redactar la minuta y cerrar la reunión
1. En el campo de texto inferior **Minuta / Notas de Cierre**, escribe los acuerdos clave, conclusiones o compromisos definidos en la reunión.
2. Al finalizar la llamada, presiona el botón **Finalizar Sesión**.
3. El sistema:
   - Cambiará el estado de la reunión a **Completada (`done`)**.
   - Fijará el progreso al **100%**.
   - Publicará automáticamente la minuta y el listado de asistentes confirmados en el feed de comentarios del ticket para consulta histórica de todo el equipo.

## Auto-cierre inteligente de reuniones expiradas
- Si los participantes concluyen la reunión pero olvidan presionar el botón de cierre manual:
  - El servidor evalúa en segundo plano la hora de inicio más la duración programada.
  - Una vez transcurrido el tiempo límite, el sistema **marca automáticamente la reunión como completada (`done`)** para evitar que sesiones antiguas continúen apareciendo como pendientes en los tableros activos.

## Errores y límites conocidos
- **No se pueden mover en Kanban:** Las reuniones no forman parte de las columnas de desarrollo técnico (no se pueden arrastrar a *Por hacer* ni *En revisión*).
- **Cancelación de evento en Google Calendar:** Si un Project Manager elimina una reunión desde el portal, el sistema intentará de forma automática cancelar y eliminar la cita en Google Calendar si la cuenta del convocante está vinculada.

## Notas de verificación
- Lógica de cierre: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalCompleteMeetingSession`)
- Consola visual: `src/modules/features/tasks/components/meetings/task-meeting-console.tsx`
- Detección de auto-cierre: líneas 558–581 de `collaborator-portal-actions.ts`
