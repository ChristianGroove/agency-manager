---
schema_version: 1
id: tasks-portal.create-task-collaborator
title: Proponer nuevos requerimientos como colaborador operativo (Política de Backlog)
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
  - proponer tarea
  - nuevo requerimiento
  - crear tarea colaborador
  - backlog
  - politica de backlog
  - alcance
  - cambiar nombre
  - cambiar
  - nombre
  - renombrar
  - titulo
  - desarrollador
  - asignado
  - editar tarea
requirements:
  - Acceso activo al portal operativo de tareas en un workspace autorizado
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalCreateTask
    claim: Aplica gobernanza de colaborador estándar forzando status a backlog, horas estimadas a 0, fecha límite a null y limitando asignaciones a sí mismo.
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: TaskCollaboratorPortal
    claim: Provee el botón '+ Requerimiento' en la barra de herramientas para desplegar el modal de creación simplificado.
---

# Proponer nuevos requerimientos como colaborador operativo (Política de Backlog)

## Propósito
Guiar a los colaboradores operativos (Desarrolladores, Diseñadores, Especialistas) sobre cómo proponer nuevas iniciativas técnicas dentro de su workspace autorizado, comprendiendo las restricciones de edición sobre el nombre del ticket y la Política de Gobernanza de Backlog que previene desvíos en el alcance contratado.

## Requisitos y perfiles
Los perfiles del bot no autorizan mutaciones sobre el producto. La plataforma aplica las siguientes condiciones por registro:
- **Pertenencia al Workspace:** El colaborador solo puede proponer requerimientos en los proyectos y workspaces a los que pertenece formalmente.
- **Perfiles aplicables:** Desarrolladores, Diseñadores y Especialistas sin atribuciones de liderazgo técnico ni Project Management.
- **Principio de gobernanza:** Todo requerimiento creado por un colaborador operativo nace como propuesta en el banco de ideas (**Backlog**), requiriendo evaluación y aprobación del Project Manager antes de incorporarse a un sprint.

## Ubicación en pantalla
- **Barra de herramientas superior:** Botón **+ Requerimiento** (icono de suma) situado a la izquierda de la barra de búsqueda y filtros en el portal de tareas.

## Procedimiento paso a paso

### 1. Abrir el formulario de propuesta
1. En la parte superior de tu portal, presiona el botón **+ Requerimiento**.
2. Se desplegará la ventana modal de creación simplificada de tareas.

### 2. Diligenciar la información técnica
1. **Proyecto / Workspace:** Selecciona el proyecto al que corresponde la iniciativa.
2. **Título o nombre del requerimiento:** Escribe un resumen claro y conciso del entregable propuesto (por ejemplo, `Optimizar consultas de base de datos en reporte de ventas`).
3. **Descripción:** Detalla el contexto técnico, los antecedentes, la justificación de por qué es necesario este cambio y la solución sugerida.
4. **Prioridad sugerida:** Selecciona el nivel de urgencia estimado (*Baja*, *Media*, *Alta* o *Urgente*).
5. **Subtareas preliminares:** Puedes desglosar los pasos preliminares. *Nota:* Por seguridad, solo podrás asignártelas a ti mismo o dejarlas sin asignar.

### 3. Guardar y enviar la propuesta
1. Haz clic en **Crear Requerimiento**.
2. El sistema generará el código identificador único (por ejemplo, `#TK-215`) y guardará el ticket en el Backlog de la organización.

## ¿Puedo cambiar el nombre de una tarea si soy el desarrollador asignado?
Si eres el desarrollador o colaborador asignado a una tarea ya existente y necesitas ajustar su título o nombre:
- **El nombre y alcance son administrados por el PM:** Por directriz de gobernanza del producto, el título formal del ticket (`name`) y su alcance contractual son fijados por el Project Manager. Cualquier colaborador no puede cambiar el título y cliente del proyecto a su antojo desde el portal.
- **Alcance de edición del colaborador asignado:** El desarrollador asignado puede editar la descripción técnica, agregar o completar subtareas, adjuntar archivos y registrar comentarios.
- **Procedimiento para renombrar el ticket:** El título de una tarea sí se puede corregir, pero se debe coordinar con el líder de proyecto o publicar una nota en el hilo de discusión solicitando el renombramiento para que el PM actualice el ticket formalmente.

## Reglas automáticas aplicadas por el servidor (Política de Backlog)
Para proteger el presupuesto y el alcance comprometido con los clientes, el servidor aplica de forma invisible las siguientes salvaguardas:
1. **Estado forzado a Backlog:** La tarea se registrará obligatoriamente en estado `backlog`. No aparecerá en las columnas de ejecución inmediata hasta que el Project Manager la apruebe.
2. **Horas estimadas en 0:** Las horas presupuestadas oficiales quedan fijadas en `0 h`. Solo el Project Manager puede autorizar horas contractuales o asignarlas al sprint.
3. **Sin fecha límite contractual:** La fecha de entrega (`due_date`) se guarda como vacía (`null`) para evitar generar alertas falsas de vencimiento antes de que el requerimiento sea programado.
4. **Sin imposición a terceros:** No puedes asignar la tarea ni sus subtareas a otros compañeros de equipo; queda asignada a ti o sin asignar.
5. **Sin asignación de QA:** El revisor de calidad no se asigna en esta fase preliminar.

## Resultado esperado
Canalización ordenada de la innovación y propuestas técnicas del equipo sin desviar la atención ni los recursos del sprint activo.

## Errores y límites conocidos
- **No puedo iniciar la tarea de inmediato:** Si intentas mover la tarea recién creada a *En progreso* o ajustar su barra de avance, el portal indicará que el requerimiento debe ser evaluado y aprobado por el Project Manager antes de iniciar su desarrollo.

## Notas de verificación
- Lógica de gobernanza: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (líneas 1602–1633 de `portalCreateTask`)
- Modal de creación: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx`
