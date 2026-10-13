---
schema_version: 1
id: tasks-portal.task-lifecycle-and-status
title: Gestionar el ciclo de vida y cambiar el estado de las tareas
module: tasks
status: draft
surface: portal.tasks
audience: portal-collaborator
source_revision: ee0caeddc26ff23cb1188b6f67e74896a9095ea6
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
  - tarea
  - tareas
  - detenida
  - insumos
  - credenciales
  - impedimento
  - bloqueo
  - depende
  - dependencia
  - predecesora
  - trabajar
  - empezar
  - termine
  - bloqueaba
  - desbloqueo
  - companeros
  - avisarle
requirements:
  - Ser responsable asignado de la tarea, revisor QA designado o Project Manager del workspace
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUpdateTaskStatus
    claim: Gestiona las transiciones de estado, valida impedimentos de dependencias bloqueadas y notifica a interesados.
  - path: src/modules/features/tasks/components/shared/task-status-interactive-badge.tsx
    symbol: TaskStatusInteractiveBadge
    claim: Renderiza la insignia interactiva de estado con menú desplegable contextual.
  - path: src/modules/features/tasks/services/task-mutation-access.ts
    symbol: requirePortalTaskMutation
    claim: Valida token, PIN desbloqueado, tenant activo y precedencia de roles estructurados antes de autorizar mutaciones de tareas en el portal.
---

# Gestionar el ciclo de vida y cambiar el estado de las tareas

## Propósito
Explicar las etapas formales por las que transita un requerimiento técnico en el portal de tareas, los requisitos por registro necesarios para realizar cada cambio de estado y las salvaguardas que previenen cierres prematuros o violaciones de dependencias.

## Requisitos y perfiles
Los perfiles de usuario del portal de ayuda son informativos y no autorizan mutaciones directas en la base de datos del producto. Para cambiar el estado de un requerimiento, el sistema valida estrictamente las siguientes condiciones por registro:
- **Asignación formal de la tarea:** El colaborador debe figurar como responsable directo (`assigned_to`) o miembro asignado en el ticket para transicionar entre *Por hacer* (`todo`), *En progreso* (`in_progress`) y *Bloqueada* (`blocked`). No es posible alterar estados de tareas ajenas.
- **Revisor de Calidad asignado:** El paso de *En revisión* (`in_review`) a *Completada* (`done`) está reservado al especialista de QA asignado formalmente a la tarea (`qa_reviewer_id`) o al Project Manager.
- **Pertenencia al Workspace / Proyecto:** El colaborador debe tener acceso vigente al proyecto o espacio de trabajo del requerimiento.
- **Project Managers / Líderes:** Tienen facultad de gestión integral sobre todas las fases, incluyendo promover iniciativas desde el *Backlog* y reabrir tareas concluidas.
- **Prioridad, reasignación y eliminación:** Necesitas acceso activo al portal, una organización con Tasks habilitado y autorización de gestión sobre esas tareas. Si tienes PIN, desbloquea la sesión. La reasignación solo admite colaboradores activos de la misma organización. El perfil configurado determina tus facultades; escribir un cargo en una etiqueta no las amplía.

## Ubicación en pantalla
- **En tarjetas y tabla:** Insignia interactiva de estado con selector desplegable (`TaskStatusInteractiveBadge`).
- **En tablero Kanban:** Columnas organizadas por fase; arrastra la tarjeta a la columna correspondiente.
- **En el Modal de Detalle:** Menú desplegable de estado en la cabecera superior del ticket.

## Flujo de estados y reglas operativas

### 1. Backlog (`backlog`)
- Requerimientos en espera de evaluación y aprobación por parte de la gerencia de proyectos.
- *Regla estricta:* Un colaborador ordinario no puede iniciar ni mover una tarea en Backlog hacia estados activos. Únicamente un Project Manager puede aprobar su incorporación al sprint.

### 2. Por hacer (`todo`)
- La tarea ha sido aprobada y asignada, pero el colaborador aún no ha comenzado su ejecución técnica.

### 3. En progreso (`in_progress`)
- El colaborador se encuentra trabajando activamente en el entregable.
- Al mover la tarea a este estado, se recomienda registrar un avance porcentual inicial o imputar las primeras horas dedicadas en la bitácora.

### 4. Bloqueada (`blocked`)
- Utiliza este estado cuando un impedimento externo (falta de accesos, caída de un servidor, insumos pendientes del cliente) te impida continuar.
- Al seleccionar *Bloqueada*, el portal te solicitará describir el motivo del bloqueo. Esta nota se notificará de inmediato al Project Manager para su gestión.

#### ¿Qué hacer si tu tarea está detenida por falta de credenciales o insumos?
Si tu trabajo está detenido porque te faltan credenciales de acceso, contraseñas, APIs, diseños o insumos del cliente:
1. Abre el selector de estado en la tarea y cámbiala inmediatamente a **Bloqueada**.
2. En la ventana emergente, redacta con precisión qué insumos o credenciales hacen falta para reanudar la labor.
3. El sistema notificará de inmediato al Project Manager para que gestione los accesos con el cliente.
4. *Nunca elimines la tarea ni la marques como completada* para retirarla de tu vista; mantenerla en estado Bloqueada permite auditar el tiempo de espera y proteger tus métricas operativas.

### 5. En revisión / QA (`in_review`)
- El desarrollo técnico ha finalizado y el entregable está listo para ser probado o auditado por el revisor de calidad.
- El sistema ajusta automáticamente el avance porcentual a un mínimo del **90%**.

### 6. Completada (`done`)
- La tarea cumple todos los criterios de aceptación y ha sido validada.
- Al pasar a *Completada*, el sistema:
  - Fija el progreso al **100%**.
  - Sella el requerimiento, impidiendo que colaboradores estándar modifiquen subtareas o sigan imputando horas.
  - Ejecuta el desbloqueo automático de cualquier tarea sucesora.

## Salvaguardas de dependencias y entregables

### Identificar dependencias antes de empezar a trabajar
Antes de empezar a trabajar en un requerimiento, comprueba si la tarjeta o el modal de detalle muestra la insignia **Bloqueada por #TK-XXX**:
- El distintivo identifica cuál es la tarea predecesora y en qué estado se encuentra.
- Si la tarea de la cual depende tu trabajo aún no ha sido terminada, el sistema **rechazará cualquier intento de enviar tu tarea a revisión o marcarla como completada**.

### Desbloqueo automático al terminar tareas que bloqueaban a otras
Si ya terminaste la tarea predecesora que mantenía bloqueados a otros requerimientos del equipo:
- No es necesario que abras una a una las tareas dependientes ni que avises manualmente a tus compañeros.
- Al cambiar tu tarea a **Completada** (`done`), el sistema ejecuta automáticamente la rutina `handlePortalTaskUnblocking`:
  1. Registra una nota de auditoría en los tickets sucesores indicando que la dependencia fue resuelta.
  2. Desbloquea las tareas dependientes si no tienen otros impedimentos activos.
  3. Notifica a los compañeros asignados para informarles que su entregable ya está listo para comenzar.

### Entregables y subtareas incompletas
Si intentas marcar como *Completada* una tarea que aún tiene subtareas pendientes en su lista de verificación, el portal no la marcará como completada; la enviará a *En revisión* fijando su avance en **95%** hasta que se completen todas las subtareas.

## Errores y límites conocidos
- **Error "Requerimiento sellado":** Los colaboradores ordinarios no pueden reabrir una tarea finalizada ni cambiarla de estado una vez que está en *Completada*. Si se requiere una corrección, debes solicitar al Project Manager que reabra el ticket.
- **Reuniones sincrónicas:** Las actividades de tipo *Reunión* no admiten cambios de estado manuales a través de este menú; se gestionan exclusivamente desde la consola de reunión o se auto-cierran al finalizar su tiempo programado.

## Notas de verificación
- Lógica de transiciones y guards por registro: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalUpdateTaskStatus`)
- Desbloqueo automático de dependencias: función interna `handlePortalTaskUnblocking`
- Guard de seguridad de mutaciones de tareas: `src/modules/features/tasks/services/task-mutation-access.ts` (`requirePortalTaskMutation`)
