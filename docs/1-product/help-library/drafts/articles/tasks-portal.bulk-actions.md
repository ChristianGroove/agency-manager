---
schema_version: 1
id: tasks-portal.bulk-actions
title: Ejecutar acciones masivas y eliminación en lote de tareas
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
---

# Ejecutar acciones masivas y eliminación en lote de tareas

## Propósito
Explicar el procedimiento para seleccionar múltiples requerimientos de forma simultánea en la vista de lista y ejecutar operaciones masivas de limpieza o depuración mediante la barra flotante de acciones en lote.

## Requisitos y perfiles
- **Quiénes pueden eliminar en lote:**
  - Project Managers y Líderes Técnicos (`isLeadOrPm: true`).
  - Colaboradores a quienes se les haya otorgado explícitamente el permiso `can_bulk_delete_tasks` en la configuración de personal de la empresa.
- **Restricción:** Colaboradores estándar sin este permiso pueden seleccionar tareas para consulta agrupada, pero el botón de eliminación masiva no estará disponible en la barra flotante o será rechazado por el servidor.

## Ubicación en pantalla
- **Modo de vista:** Requiere activar la **Vista de Lista (Tabla)** en el extremo superior derecho.
- **Barra flotante:** Aparece automáticamente en la parte inferior central de la pantalla tan pronto como se marca al menos una casilla de verificación en la tabla.

## Procedimiento paso a paso

### 1. Activar la vista de lista y seleccionar tareas
1. En la barra de herramientas superior derecha, haz clic en el icono de **Vista de Lista** (icono de lista/tabla).
2. En la primera columna de la tabla encontrarás casillas de verificación (*Checkboxes*):
   - Marca la casilla de la cabecera si deseas seleccionar **todas las tareas de la página actual**.
   - O marca individualmente las casillas correspondientes a las tareas específicas que deseas intervenir.
3. Observarás que en la parte inferior de la ventana emerge la **Barra flotante de acciones masivas** indicando el número de ítems seleccionados (por ejemplo: `3 tareas seleccionadas`).

### 2. Ejecutar la eliminación masiva
1. En la barra flotante inferior, presiona el botón rojo **Eliminar Seleccionados** (icono de papelera).
2. Se desplegará una ventana de advertencia y confirmación:  
   *«¿Estás seguro de que deseas eliminar permanentemente las tareas seleccionadas? Esta acción no se puede deshacer».*
3. Si entre las tareas seleccionadas existen actividades de tipo *Reunión*, el sistema advertirá que los eventos vinculados en Google Calendar también serán cancelados y removidos automáticamente.
4. Presiona **Confirmar Eliminación**.
5. Las tareas serán purgadas de la base de datos y desaparecerán de los tableros de inmediato.

### 3. Cancelar la selección masiva
- Para deseleccionar los elementos y ocultar la barra flotante, presiona el botón **Cancelar** en la barra inferior o desmarca la casilla general de la cabecera de la tabla.

## Resultado esperado
Depuración ágil de requerimientos duplicados, cancelados o pruebas operativas sin necesidad de abrir y eliminar cada ticket uno por uno.

## Errores y límites conocidos
- **Error "No tienes permiso para eliminar tareas en masa":** Aparece si un colaborador intenta invocar la eliminación sin contar con el permiso `can_bulk_delete_tasks` habilitado en su registro de personal.
- **Discrepancia con eliminación individual:** Si cuentas con el permiso `can_bulk_delete_tasks` pero no eres Project Manager, podrás borrar tareas en lote mediante la barra flotante, pero no verás el botón de papelera individual dentro del modal de detalle de una sola tarea.

## Notas de verificación
- Lógica de backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalBulkDeleteTasks`)
- Barra flotante: `src/modules/core/ui/components/bulk-actions-floating-bar.tsx`
