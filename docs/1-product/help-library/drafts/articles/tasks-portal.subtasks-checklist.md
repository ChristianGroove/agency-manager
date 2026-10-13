---
schema_version: 1
id: tasks-portal.subtasks-checklist
title: Gestionar y completar subtareas y entregables en el checklist
module: tasks
status: draft
surface: portal.tasks
audience: portal-collaborator
source_revision: 4063682d86bc2ad07e4977e54e89fbbddcd6d47b
verified_on: 2026-10-12
verification: source-only
routes:
  - /portal/tasks/[token]
keywords:
  - subtareas
  - checklist
  - entregables
  - lista de chequeo
  - asignacion de subtareas
  - avance automatico
requirements:
  - Acceso a la tarea asignada como responsable general, responsable de la subtarea o PM
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalToggleChecklist
    claim: Gestiona el completado de subtareas, valida que colaboradores solo marquen subtareas propias y auto-transiciona a in_review al llegar al 100%.
  - path: src/modules/features/tasks/components/detail/task-checklist-editor.tsx
    symbol: TaskChecklistEditor
    claim: Renderiza la lista interactiva de entregables con asignación por miembro y estimación horaria.
---

# Gestionar y completar subtareas y entregables en el checklist

## Propósito
Detallar el funcionamiento de la lista de chequeo (`checklist`) o entregables técnicos, cómo se reparte el trabajo entre varios colaboradores dentro de una misma tarea y el impacto automático que tiene el completado de subtareas sobre el avance general del requerimiento.

## Requisitos y perfiles
- **Quién puede marcar subtareas:**
  - El colaborador asignado específicamente a esa subtarea (`assigned_staff_id` del ítem).
  - El responsable general de la tarea principal.
  - Un Líder Técnico o Project Manager de la organización.
- **Protección de asignación cruzada:** Un colaborador secundario no puede marcar ni desmarcar subtareas asignadas a otros compañeros de equipo.

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Pestaña o sección central **Subtareas / Entregables** (icono de lista de chequeo).
- **En tarjetas de la cuadrícula:** Icono con contador de subtareas (ejemplo: `3/5`) que despliega un menú flotante con el estado de cada ítem.

## Procedimiento paso a paso

### 1. Consultar tus subtareas asignadas
1. Abre el modal de detalle de cualquier tarea donde participes.
2. En la sección **Subtareas / Entregables**, revisa los ítems listados.
3. Aquellas subtareas que tengan tu nombre o foto asignada son de tu exclusiva responsabilidad.

### 2. Marcar una subtarea como completada
1. Una vez que hayas terminado el entregable correspondiente, haz clic sobre la casilla de verificación situada a la izquierda de la subtarea.
2. El sistema registrará la fecha y hora exacta del completado y tu nombre de usuario.
3. El progreso general de la tarea se recalculará automáticamente de forma proporcional al número total de subtareas.

### 3. Transición automática a revisión
- Cuando marques la **última subtarea pendiente** de la lista (alcanzando el 100% de los entregables):
  - El sistema cambiará automáticamente el estado de la tarea de *En progreso* a **En revisión (`in_review`)**.
  - Se notificará de inmediato al líder técnico o especialista QA para que realice las pruebas pertinentes antes de sellar el requerimiento como completado.

### 4. Desmarcar una subtarea
- Si necesitas reabrir un entregable marcado por error, vuelve a hacer clic sobre la casilla de verificación.
- El avance general se recalculará hacia abajo y, si la tarea estaba en revisión, regresará a *En progreso*.

## Resultado esperado
División clara de responsabilidades en tareas colaborativas y sincronización automática entre los entregables individuales y el progreso global del proyecto.

## Errores y límites conocidos
- **Error "No tienes autorización...":** Aparece si intentas hacer clic en la casilla de verificación de una subtarea que tiene asignado a otro compañero de equipo. Solo el responsable de esa subtarea, el dueño de la tarea o un PM pueden marcarla.
- **Tareas selladas:** En requerimientos que ya se encuentran en estado *Completada* (`done`), ninguna subtarea puede ser marcada ni desmarcada por colaboradores regulares.
- **Creación de nuevas subtareas:** Los colaboradores ordinarios pueden añadir subtareas a sus tareas en curso, pero solo pueden asignárselas a sí mismos o dejarlas sin asignar; no pueden imponer subtareas a otros compañeros sin rol de PM.

## Notas de verificación
- Lógica de completado: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalToggleChecklist`)
- Componente de interfaz: `src/modules/features/tasks/components/detail/task-checklist-editor.tsx`
