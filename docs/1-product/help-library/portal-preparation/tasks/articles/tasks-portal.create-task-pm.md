---
schema_version: 1
id: tasks-portal.create-task-pm
title: Crear y planificar tareas avanzadas como Project Manager o Líder
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
  - crear tarea pm
  - planificacion
  - project manager
  - lider tecnico
  - asignacion
  - horas estimadas
  - sprint
  - fecha limite
  - qa asignado
requirements:
  - Tener perfil verificado de Project Manager o Líder (`isLeadOrPm: true`)
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalCreateTask
    claim: Permite a PMs y líderes definir horas estimadas oficiales, fechas de vencimiento, asignar responsables y QA, vincular sprints y fijar estado inicial.
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: TaskCollaboratorPortal
    claim: Despliega el modal completo de creación con 2 columnas y controles avanzados para directores de proyecto.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Crear y planificar tareas avanzadas como Project Manager o Líder

## Propósito
Instruir a los Project Managers y Líderes Técnicos en la creación integral de requerimientos, tickets de desarrollo y compromisos operativos desde el portal de tareas, configurando asignaciones formales, presupuesto de horas, revisores de calidad y vinculación a sprints activos.

## Requisitos y perfiles
- **Perfiles aplicables:** Exclusivamente Project Managers, Líderes de Área, Coordinadores y Directores (`isLeadOrPm: true`).
- **Condición:** Identificada automáticamente por el sistema al detectar palabras clave de liderazgo en tu rol o al ser designado líder de un workspace o proyecto.

## Ubicación en pantalla
- **Botón principal:** **+ Requerimiento** en la barra superior del portal.
- **En la vista de Gestión o Dashboard:** Accesible también desde los accesos rápidos de creación por proyecto.

## Procedimiento paso a paso

### 1. Configuración general del requerimiento
1. Haz clic en **+ Requerimiento**. Se abrirá el modal de creación avanzado de dos columnas.
2. **Proyecto / Workspace:** Selecciona el proyecto de destino.
3. **Tipo de actividad:** Elige entre *Entregable / Requerimiento* (`feature` o `task`), *Corrección de Bug* (`bug`), o *Reunión / Actividad Sincrónica* (`meeting`).
4. **Título y Descripción:** Ingresa el enunciado claro del ticket y detalla los requerimientos de negocio o especificaciones de diseño.

### 2. Planificación operativa y gobernanza
1. **Responsable Principal (`assigned_staff_id`):** Selecciona el colaborador de tu equipo que liderará el desarrollo. Puedes elegir cualquier miembro activo de los workspaces autorizados.
2. **Especialista de QA (`qa_staff_id`):** Selecciona al revisor de calidad o tester encargado de certificar el entregable una vez finalizado.
3. **Horas estimadas (`estimated_hours`):** Define el presupuesto oficial de horas asignado para la tarea. Este valor alimentará el análisis de velocidad del sprint y los reportes de ritmo semanal.
4. **Fecha límite de entrega (`due_date`):** Fija la fecha perentoria de entrega en el calendario.
5. **Sprint (`sprint_id`):** Vincula el ticket al sprint activo o déjalo en el backlog de la versión para programación futura.
6. **Prioridad inicial:** Selecciona entre *Baja*, *Media*, *Alta* o *Urgente*.

### 3. Desglose de subtareas y entregables
1. En la sección inferior, presiona **+ Añadir Subtarea**.
2. Redacta el nombre de cada entregable atómico.
3. Puedes delegar subtareas específicas a diferentes miembros del equipo (por ejemplo: subtarea de diseño para el diseñador y subtarea de frontend para el desarrollador) e indicar horas estimadas por ítem.

### 4. Guardar y publicar el requerimiento
1. Revisa los parámetros definidos y haz clic en **Crear Tarea**.
2. La tarea se generará de inmediato con estado inicial *Por hacer* (`todo`) —o el estado que hayas seleccionado—, apareciendo en los tableros del equipo y notificando a los colaboradores asignados.

## Resultado esperado
Un requerimiento estructurado, presupuestado y formalmente asignado que entra directamente al ciclo de ejecución sin pasar por restricciones de backlog.

## Errores y límites conocidos
- **Asignación fuera de workspace:** Si un colaborador no forma parte del workspace al que pertenece el proyecto seleccionado, no figurará en la lista desplegable de responsables para garantizar la privacidad y contención entre equipos.
- **Reuniones en backlog:** Las actividades de tipo *Reunión* no deben crearse en estado de backlog ni vincularse a sprints de desarrollo de software; deben programarse con fecha y hora específicas.

## Notas de verificación
- Lógica de servidor: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalCreateTask`)
- Detección de perfil PM: `isStaffLeadOrPmRole` en `src/modules/features/tasks/types.ts`
- Componente modal: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx`
