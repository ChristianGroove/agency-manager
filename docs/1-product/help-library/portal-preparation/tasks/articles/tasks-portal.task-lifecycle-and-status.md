---
schema_version: 1
id: tasks-portal.task-lifecycle-and-status
title: Gestionar el ciclo de vida y cambiar el estado de las tareas
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
  - estados
  - ciclo de vida
  - backlog
  - por hacer
  - en progreso
  - en revision
  - bloqueada
  - completada
  - dependencias
requirements:
  - Ser responsable de la tarea, revisor QA o Project Manager
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUpdateTaskStatus
    claim: Gestiona las transiciones de estado, valida impedimentos de dependencias bloqueadas y notifica a interesados.
  - path: src/modules/features/tasks/components/shared/task-status-interactive-badge.tsx
    symbol: TaskStatusInteractiveBadge
    claim: Renderiza la insignia interactiva de estado con menú desplegable contextual.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Gestionar el ciclo de vida y cambiar el estado de las tareas

## Propósito
Explicar las etapas formales por las que transita un requerimiento técnico en el portal de tareas, los permisos necesarios para realizar cada cambio de estado y las salvaguardas que previenen cierres prematuros o violaciones de dependencias.

## Requisitos y perfiles
- **Responsables de tarea:** Pueden mover sus tickets entre *Por hacer* (`todo`), *En progreso* (`in_progress`), *Bloqueada* (`blocked`) y *En revisión* (`in_review`).
- **Especialistas QA:** Tienen facultad para auditar requerimientos en revisión y autorizar el paso a *Completada* (`done`) o devolver a *En progreso*.
- **Project Managers / Líderes:** Control total sobre todas las etapas, incluyendo promover requerimientos desde el *Backlog* y reabrir tareas selladas.

## Ubicación en pantalla
- **En tarjetas y tabla:** Insignia interactiva de estado con selector desplegable.
- **En tablero Kanban:** Columnas organizadas; arrastra la tarjeta a la columna correspondiente.
- **En el Modal de Detalle:** Menú desplegable de estado en la cabecera superior.

## Flujo de estados y reglas operativas

### 1. Backlog (`backlog`)
- Requerimientos en espera de evaluación y aprobación por parte de la gerencia de proyectos.
- *Regla estricta:* Un colaborador ordinario no puede iniciar ni mover una tarea en Backlog hacia estados activos. Únicamente un Project Manager puede aprobar su incorporación al sprint.

### 2. Por hacer (`todo`)
- La tarea ha sido aprobada y asignada, pero el colaborador aún no ha comenzado su ejecución técnica.

### 3. En progreso (`in_progress`)
- El colaborador se encuentra trabajando activamente en el entregable.
- Al mover la tarea a este estado, se recomienda registrar un avance porcentual inicial o imputar las primeras horas dedicadas.

### 4. Bloqueada (`blocked`)
- Utiliza este estado cuando un impedimento externo (falta de accesos, caída de un servidor, insumos pendientes del cliente) te impida continuar.
- Al seleccionar *Bloqueada*, el portal te solicitará describir el motivo del bloqueo. Esta nota se notificará de inmediato al Project Manager para su gestión.

### 5. En revisión / QA (`in_review`)
- El desarrollo técnico ha finalizado y el entregable está listo para ser probado o revisado por el líder o especialista de control de calidad.
- El sistema ajusta automáticamente el avance porcentual a un mínimo del **90%**.

### 6. Completada (`done`)
- La tarea cumple todos los criterios de aceptación y ha sido validada.
- Al pasar a *Completada*, el sistema:
  - Fija el progreso al **100%**.
  - Sella el requerimiento, impidiendo que colaboradores estándar modifiquen subtareas o sigan imputando horas.
  - Desbloquea de forma automática cualquier tarea sucesora que estuviera esperando por este ticket.

## Salvaguardas de dependencias y entregables
1. **Predecesora pendiente:** Si tu tarea depende formalmente de otro ticket (`blocked_by_task_id`) y esa tarea predecesora aún no está completada, el sistema **rechazará cualquier intento de enviar tu tarea a revisión o completarla**.
2. **Entregables incompletos:** Si intentas marcar como *Completada* una tarea que aún tiene subtareas pendientes en su lista de verificación, el portal no la marcará como completada; la enviará a *En revisión* fijando su avance en **95%** hasta que se completen todas las subtareas.

## Errores y límites conocidos
- **Error "Requerimiento sellado":** Los colaboradores ordinarios no pueden reabrir una tarea finalizada ni cambiarla de estado una vez que está en *Completada*. Si se requiere una corrección, debes solicitar al Project Manager que reabra el ticket.
- **Reuniones sincrónicas:** Las actividades de tipo *Reunión* no admiten cambios de estado manuales a través de este menú; se gestionan exclusivamente desde la consola de reunión o se auto-cierran al finalizar su tiempo programado.

## Notas de verificación
- Lógica de transiciones: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalUpdateTaskStatus`)
- Desbloqueo automático: función interna `handlePortalTaskUnblocking`
