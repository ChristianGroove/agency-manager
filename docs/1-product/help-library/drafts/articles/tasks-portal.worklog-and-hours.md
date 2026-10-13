---
schema_version: 1
id: tasks-portal.worklog-and-hours
title: Imputar horas de trabajo y registrar notas de actividad (Worklog)
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
  - horas trabajadas
  - imputar horas
  - worklog
  - registro de tiempo
  - tiempo real
  - tiempo estimado
  - actividad
requirements:
  - Estar asignado a la tarea o subtarea, y que la tarea no se encuentre sellada en estado 'done'
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUpdateTaskStatus
    claim: Incrementa actual_hours, distribuye proporcionalmente hacia la subtarea asignada del colaborador y prohíbe imputar en tareas done si no es PM.
  - path: src/modules/features/tasks/components/shared/task-log-work-modal.tsx
    symbol: TaskLogWorkModal
    claim: Provee la interfaz modal para ingresar horas trabajadas (con soporte decimal) y nota descriptiva de la sesión.
---

# Imputar horas de trabajo y registrar notas de actividad (Worklog)

## Propósito
Instruir a los miembros del equipo sobre cómo reportar el tiempo real dedicado a la ejecución técnica de una tarea o subtarea, manteniendo la trazabilidad del esfuerzo invertido frente a las horas presupuestadas por la gerencia de proyectos.

## Requisitos y perfiles
- **Quiénes pueden registrar tiempo:**
  - El responsable principal de la tarea.
  - Cualquier colaborador que tenga una subtarea asignada dentro del requerimiento.
  - Project Managers y Líderes Técnicos.
- **Condición excluyente:** La tarea debe encontrarse activa (*Por hacer*, *En progreso*, *En revisión* o *Bloqueada*). No se permite imputar tiempo en tareas finalizadas sin autorización de un PM.

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Botón **Registrar Tiempo / Imputar Horas** (icono de cronómetro o reloj) ubicado en la barra lateral derecha, junto a los contadores de horas.
- **En la barra rápida:** Al cambiar el estado de la tarea hacia *En progreso* o *En revisión*, el sistema ofrece la opción de registrar horas de forma complementaria.

## Procedimiento paso a paso

### 1. Abrir la ventana de registro de tiempo
1. Abre el modal de detalle de la tarea en la que estuviste trabajando.
2. En la sección de métricas horarias, haz clic en el botón **Registrar Horas** (o presiona el icono de reloj).
3. Se desplegará la ventana modal `TaskLogWorkModal`.

### 2. Ingresar las horas y la descripción
1. **Horas a imputar:** Ingresa el número de horas trabajadas. El campo admite valores decimales para representar fracciones de tiempo (por ejemplo, `1.5` para una hora y media, o `0.25` para 15 minutos).
2. **Nota de actividad (Opcional pero recomendada):** Redacta un breve resumen de lo que realizaste durante ese lapso (por ejemplo: `Implementación de endpoints de autenticación y pruebas unitarias`).
3. Haz clic en **Guardar Horas**.

### 3. Distribución automática hacia tus subtareas
- Si tienes una o más subtareas asignadas a tu nombre en esa tarea:
  - El sistema imputará automáticamente las horas registradas a tu primera subtarea pendiente.
  - Esto actualiza tanto el contador general de la tarea (`actual_hours`) como el contador individual de tu subtarea, permitiendo medir la productividad específica de cada componente.

### 4. Trazabilidad en la discusión
- Tras guardar, el sistema generará automáticamente una nota de auditoría en el feed de comentarios del ticket con el formato:  
  `⏱️ Registro de trabajo: +1.5h (Total: 4.5h) — "Implementación de endpoints..."`
- Esta nota queda firmada con tu nombre y fecha para conocimiento de los supervisores y clientes.

## Resultado esperado
Actualización inmediata de las horas reales ejecutadas, ajuste de los indicadores de esfuerzo del sprint y visibilidad del costo operativo del proyecto.

## Errores y límites conocidos
- **Error "No se pueden imputar horas en requerimientos finalizados":** Ocurre si intentas registrar tiempo en una tarea que ya está marcada como *Completada* (`done`). Solo un Project Manager puede reabrir el ticket si se requiere asentar un ajuste de horas posterior al cierre.
- **Formato numérico:** El valor debe ser mayor a 0 y no puede contener signos negativos ni caracteres alfanuméricos.

## Notas de verificación
- Lógica de servidor: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (función `portalUpdateTaskStatus`)
- Interfaz gráfica: `src/modules/features/tasks/components/shared/task-log-work-modal.tsx`
- Tira compacta de tiempo: `src/modules/features/tasks/components/detail/task-time-compact-strip.tsx`
