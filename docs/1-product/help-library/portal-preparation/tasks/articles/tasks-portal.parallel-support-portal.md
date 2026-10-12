---
schema_version: 1
id: tasks-portal.parallel-support-portal
title: Operar el portal de soporte paralelo y dar seguimiento a tickets
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
  - soporte paralelo
  - portal soporte
  - tickets sup
  - atencion al cliente
  - consultas tecnicas
  - resolucion de incidencias
requirements:
  - Colaborador configurado con rol de soporte (`staff.task_role === 'support'`)
evidence:
  - path: src/modules/features/tasks/components/portal/task-parallel-support-portal.tsx
    symbol: TaskParallelSupportPortal
    claim: Despliega la interfaz dedicada de soporte con odómetro de resolución, listado de incidencias y modal de reporte SUP.
  - path: src/modules/features/tasks/components/portal/task-support-ticket-detail-modal.tsx
    symbol: TaskSupportTicketDetailModal
    claim: Modal de triaje y discusión entre el agente de soporte y el equipo técnico.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Operar el portal de soporte paralelo y dar seguimiento a tickets

## Propósito
Guiar al personal de atención al cliente y soporte técnico en el uso del portal especializado de soporte paralelo, diseñado para registrar incidencias de usuarios finales, hacer seguimiento al avance de los requerimientos y colaborar con los desarrolladores mediante consultas técnicas sin exponer la complejidad de los tableros internos de ingeniería.

## Requisitos y perfiles
- **Perfiles aplicables:** Personal de Soporte, Mesa de Ayuda y Atención al Cliente (`task_role: 'support'`).
- **Aislamiento de superficie:** Al iniciar sesión con un enlace de colaborador de soporte, la plataforma detecta el rol y sustituye automáticamente el portal de desarrollo por el **Portal de Soporte Paralelo** (`TaskParallelSupportPortal`).

## Ubicación en pantalla
- **Ruta web:** `/portal/tasks/[token]` (el mismo enlace privado de colaborador, renderizado en modo soporte).
- **Indicadores destacados:** Contador odómetro superior con el porcentaje de resolución de tickets, tickets recibidos, en curso y resueltos.

## Procedimiento paso a paso

### 1. Registrar una nueva incidencia o solicitud (Ticket SUP)
1. En la parte superior de tu portal, presiona el botón destacado **+ Nuevo Ticket de Soporte**.
2. En la ventana modal de reporte:
   - **Proyecto / Servicio afectado:** Selecciona la cuenta o sistema donde se presenta el problema.
   - **Título de la incidencia:** Resume el síntoma observado por el usuario final (por ejemplo: `Error 500 al procesar pagos con tarjeta de crédito`).
   - **Descripción detallada:** Especifica los pasos para reproducir el fallo, el navegador del usuario y los mensajes de error mostrados.
   - **Prioridad:** Define el impacto en la operación (*Baja*, *Media*, *Alta* o *Urgente / Crítica*).
   - **Adjuntos:** Puedes adjuntar capturas de pantalla o comprobantes en el área de archivos.
3. Presiona **Enviar Ticket**. El sistema generará el código identificador con prefijo `#SUP-` (por ejemplo, `#SUP-042`) y notificará al Project Manager en su bandeja de triaje.

### 2. Consultar el estado de resolución de tus tickets
- En el panel principal encontrarás la lista de tickets que has reportado:
  - **Recibido (Backlog / Por hacer):** La solicitud ha sido registrada y está en evaluación por el equipo de operaciones.
  - **En Gestión (En progreso / Bloqueada):** Un desarrollador o especialista está trabajando activamente en la solución técnica.
  - **Resuelto (Completada):** La incidencia ha sido subsanada y verificada.

### 3. Participar en consultas técnicas y responder a desarrolladores
1. Haz clic sobre cualquier ticket de la lista para abrir el modal `TaskSupportTicketDetailModal`.
2. En el hilo de discusión podrás leer las preguntas o solicitudes de aclaración enviadas por los ingenieros.
3. Escribe tus respuestas y utiliza menciones (@) si necesitas notificar a un compañero específico.
4. El sistema mantiene un contador de comentarios no leídos para avisarte cuando haya nuevas respuestas del equipo técnico.

## Resultado esperado
Un canal ágil, directo y trazable entre la primera línea de atención al cliente y el equipo de desarrollo, reduciendo los tiempos de respuesta y centralizando las incidencias sin fricción.

## Errores y límites conocidos
- **Sin acceso a tareas de desarrollo:** Los colaboradores de soporte no tienen acceso a los tableros Kanban de sprint, estimaciones de horas internas, ramas de Git ni configuraciones de proyectos; su alcance está estrictamente acotado a la resolución de sus tickets.

## Notas de verificación
- Componente de interfaz: `src/modules/features/tasks/components/portal/task-parallel-support-portal.tsx`
- Modal de detalle: `src/modules/features/tasks/components/portal/task-support-ticket-detail-modal.tsx`
- Control de lectura de hilos: `src/modules/features/tasks/utils/support-thread-read-state.ts`
