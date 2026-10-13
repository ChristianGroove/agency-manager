---
schema_version: 1
id: tasks-portal.bulk-actions
title: Ejecutar acciones masivas y eliminación en lote de tareas
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
  - acciones masivas
  - seleccion multiple
  - eliminacion en lote
  - bulk actions
  - barra flotante
  - permisos bulk
requirements:
  - 'Estar en modo Lista y contar con permiso de eliminación en lote (`can_bulk_delete_tasks: true` o `isLeadOrPm: true`)'
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalBulkDeleteTasks
    claim: Elimina un conjunto de tareas en lote validando staff.can_bulk_delete_tasks o rol de líder, cancelando reuniones asociadas en Google Calendar.
  - path: src/modules/core/ui/components/bulk-actions-floating-bar.tsx
    symbol: BulkActionsFloatingBar
    claim: Despliega la barra flotante en la parte inferior de la pantalla al seleccionar una o más casillas de verificación.
  - path: src/modules/features/tasks/services/task-mutation-access.ts
    symbol: requirePortalTaskMutation
    claim: Valida token activo, PIN, tenant activo, módulo habilitado, ámbito de liderazgo y regla de can_bulk_delete_tasks antes de autorizar el lote.
---

# Ejecutar acciones masivas y eliminación en lote de tareas

## Propósito
Explicar el procedimiento para seleccionar múltiples requerimientos de forma simultánea en la vista de lista y ejecutar operaciones masivas de limpieza o depuración mediante la barra flotante de acciones en lote.

## Requisitos y perfiles
- **Quiénes pueden eliminar en lote:**
  - Colaboradores autorizados expresamente para eliminar tareas en grupo. Esa autorización permite el lote dentro de su organización.
  - Project Managers y líderes con facultad de gestión, si la empresa no les ha deshabilitado expresamente esta acción.
- **Restricción configurada por la empresa:** La eliminación en grupo puede estar deshabilitada incluso para un Project Manager.
- **Liderazgo por proyecto o espacio:** Cuando el acceso depende de ser líder asignado y no de una autorización expresa para eliminar en grupo, solo puedes eliminar tareas de los proyectos o espacios que lideras.
- **Condiciones previas de seguridad:** El colaborador debe contar con token activo en un tenant activo con el módulo Tasks habilitado. Si tiene configurado un código PIN, la sesión del portal debe estar desbloqueada.
- **Alcance de la autorización:** La autorización para eliminar en grupo permite únicamente esa acción; no concede privilegios para reasignar tareas ni para eliminarlas individualmente desde su modal de detalle.

## Ubicación en pantalla
- **Modo de vista:** Requiere activar la **Vista de Lista (Tabla)** en el extremo superior derecho.
- **Barra flotante:** Aparece automáticamente en la parte inferior central de la pantalla tan pronto como se marca al menos una casilla de verificación en la tabla.

## Procedimiento paso a paso

### 1. Activar la vista de lista y seleccionar tareas
1. En la barra de herramientas superior derecha, haz clic en el icono de **Vista de Lista** (icono de lista/tabla).
2. En la primera columna de la tabla encontrarás casillas de verificación (*Checkboxes*):
   - Marca la casilla de la cabecera si deseas seleccionar **todas las tareas de la página actual**.
   - O marca individualmente las casillas correspondientes a las tareas específicas que deseas intervenir (hasta un máximo de 1000 tareas).
3. Observarás que en la parte inferior de la ventana emerge la **Barra flotante de acciones masivas** indicando el número de ítems seleccionados (por ejemplo: `3 tareas seleccionadas`).

### 2. Ejecutar la eliminación masiva
1. En la barra flotante inferior, presiona el botón rojo **Eliminar Seleccionados** (icono de papelera).
2. Se desplegará una ventana de advertencia y confirmación:  
   *«¿Estás seguro de que deseas eliminar permanentemente las tareas seleccionadas? Esta acción no se puede deshacer».*
3. Si entre las tareas seleccionadas existen actividades de tipo *Reunión*, el sistema advertirá que los eventos vinculados en Google Calendar también serán cancelados y removidos automáticamente.
4. Presiona **Confirmar Eliminación**.
5. Selecciona como máximo 1000 tareas por operación.
6. Si la selección inicial incluye tareas fuera de tu organización o alcance autorizado, se rechaza antes de empezar a borrar. Si ocurre un fallo durante el procesamiento de un lote, revisa qué tareas permanecen antes de reintentar.
7. Las tareas serán purgadas de la base de datos y desaparecerán de los tableros de inmediato.

### 3. Cancelar la selección masiva
- Para deseleccionar los elementos y ocultar la barra flotante, presiona el botón **Cancelar** en la barra inferior o desmarca la casilla general de la cabecera de la tabla.

## Resultado esperado
Depuración ágil de requerimientos duplicados, cancelados o pruebas operativas sin necesidad de abrir y eliminar cada ticket uno por uno.

## Errores y límites conocidos
- **Error "No tienes permiso para eliminar tareas en masa" o acceso denegado:** Puede aparecer cuando no tienes autorización de gestión o eliminación en grupo, la empresa deshabilitó esta acción, falta desbloquear el PIN, la organización está inactiva o la selección excede tu alcance.
- **Discrepancia con eliminación individual:** Si solo tienes autorización para eliminar en grupo, podrás borrar tareas en lote mediante la barra flotante, pero no verás el botón de papelera individual dentro del modal de detalle de una sola tarea.
- **Límite de selección:** Se admite un máximo de 1000 tareas únicas por lote; selecciones mayores o con identificadores inválidos son rechazadas antes de procesar.
- **Reuniones vinculadas:** La cancelación en Google Calendar y la eliminación de la tarea se procesan por separado. Si ocurre un error, comprueba ambos resultados antes de reintentar. Una selección rechazada al comprobar el acceso no inicia esas cancelaciones.
- **Ocultamiento de detalles internos:** Si se produce un error imprevisto de base de datos o de módulos, el sistema responde de forma controlada sin exponer detalles privados de la infraestructura.

## Notas de verificación
- Lógica de backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalBulkDeleteTasks`)
- Guard de seguridad de mutación: `src/modules/features/tasks/services/task-mutation-access.ts` (`requirePortalTaskMutation`)
- Barra flotante: `src/modules/core/ui/components/bulk-actions-floating-bar.tsx`
