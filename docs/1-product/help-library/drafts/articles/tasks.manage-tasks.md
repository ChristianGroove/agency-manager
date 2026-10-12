---
schema_version: 1
id: tasks.manage-tasks
title: Administrar proyectos y tareas en TaskFlow
module: tasks
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /operations/tasks
keywords:
  - tareas
  - proyectos
  - taskflow
  - kanban
  - entregables
  - operaciones
  - responsables
requirements:
  - Módulo module_tasks y capacidad tasks.management activos
  - Permiso operations.tasks.view para consultar y operations.tasks.manage para editar
evidence:
  - path: src/app/(dashboard)/operations/tasks/page.tsx
    symbol: TasksPage
    claim: Carga la vista de gestión operativa de proyectos, tareas y tableros Kanban.
  - path: src/modules/core/saas/module-config.ts
    symbol: MODULE_ROUTES
    claim: Mapea /operations/tasks a la categoría Operaciones bajo module_tasks exigiendo operations.tasks.view.
  - path: src/modules/core/iam/actions/permissions.ts
    symbol: PERMISSIONS.OPERATIONS.TASKS_VIEW
    claim: Define permisos para ver tableros y gestionar proyectos, tickets y colaboradores asignados.
---

# Administrar proyectos y tareas en TaskFlow

## Propósito
Permitir a los equipos coordinar la ejecución operativa de proyectos y servicios mediante un sistema ágil de tareas (TaskFlow) con tableros Kanban, asignación de responsables, fechas de entrega y listas de verificación.

## Requisitos y permisos
- Que la empresa tenga habilitado el módulo de tareas (`module_tasks`) y la capacidad `tasks.management`.
- Permisos requeridos:
  - *Ver tareas y proyectos:* Permiso `operations.tasks.view`.
  - *Crear, editar y mover tareas:* Permiso `operations.tasks.manage`.
  - *Eliminación masiva en lote:* Permiso `can_bulk_delete_tasks`.

## Ubicación en pantalla
- **Ruta web:** `/operations/tasks`
- **Menú lateral:** Sección **Operaciones** → opción **Tareas** (icono de tablero de tareas).

## Vistas del módulo
El módulo ofrece dos modos de visualización:
1. **Tablero Kanban:** Agrupa las tareas en columnas según su estado de avance (*Por hacer*, *En progreso*, *En revisión* y *Completada*), permitiendo cambiar de estado arrastrando las tarjetas.
2. **Vista de Lista:** Presenta una tabla con detalles de prioridad, fechas de vencimiento, etiquetas y opciones de selección múltiple para acciones masivas.

## Estructura de una tarea
Cada tarea incluye los siguientes campos clave:
- **Título y descripción:** Detalle claro del requerimiento o entregable.
- **Proyecto y cliente:** Vinculación opcional con un proyecto global o con la ficha de un cliente del CRM.
- **Responsable:** Miembro del equipo encargado de llevar a cabo la labor.
- **Prioridad:** Nivel de urgencia (*Baja*, *Media*, *Alta* o *Urgente* con distintivo visual en color).
- **Fecha límite de entrega (`Due Date`):** Alerta visual cuando una tarea está próxima a vencer o vencida.
- **Subtareas (Checklist):** Pasos concretos que deben marcarse como concluidos para completar la tarea principal.

## Pasos para crear una tarea
1. Accede a **Tareas** en el menú de Operaciones.
2. Haz clic en el botón superior **Nueva Tarea**.
3. En el formulario modal:
   - Ingresa el título de la tarea.
   - Selecciona el proyecto o cliente correspondiente.
   - Asigna al colaborador responsable.
   - Define la fecha de vencimiento y el nivel de prioridad.
   - Añade subtareas en la lista de chequeo si aplica.
4. Presiona **Crear Tarea**.

## Pasos para actualizar el estado de una tarea
- **En vista Kanban:** Arrastra la tarjeta de la tarea desde su columna actual a la columna de destino (por ejemplo, de *En progreso* a *Completada*).
- **En vista de Lista o Detalle:** Haz clic sobre la tarea para abrir su modal y cambia el estado directamente desde el selector de estado.

## Acciones en masa (Bulk Actions)
1. En la vista de lista, selecciona las casillas de verificación de múltiples tareas.
2. Aparecerá en la parte inferior la **Barra flotante de acciones masivas**.
3. Desde allí podrás reasignar responsable en bloque, modificar fecha límite o eliminar tareas seleccionadas (si cuentas con el permiso `can_bulk_delete_tasks`).

## Resultado esperado
Coordinación transparente del trabajo en equipo, trazabilidad en los tiempos de entrega y visibilidad del progreso para supervisores y clientes.

## Problemas habituales y causas comprobadas
- **No aparece la opción de eliminar tareas en lote:**
  *Causa comprobada:* Tu rol no tiene habilitado el permiso especial `can_bulk_delete_tasks` en la configuración de IAM de la empresa.
- **La tarea vencida no envía alerta al correo:**
  *Causa comprobada:* Las alertas de vencimiento automáticas requieren tener configurado un flujo en el módulo de *Automatizaciones* que reaccione a tareas no completadas.

## Limitaciones conocidas
- Los colaboradores externos con acceso únicamente al portal de tareas solo pueden visualizar y actualizar el estado de las tareas que les han sido asignadas directamente.

## Temas relacionados
- [Crear y gestionar flujos de trabajo automáticos](automation.create-workflows.md)
- [Administrar contactos y prospectos en el CRM](crm.manage-contacts.md)

## Notas de verificación
- Página: `src/app/(dashboard)/operations/tasks/page.tsx`
- Acciones de servidor: `src/modules/features/tasks/actions/task-actions.ts`
- Barra de acciones masivas: `src/modules/core/ui/components/bulk-actions-floating-bar.tsx`
