---
schema_version: 1
id: tasks-portal.create-task-collaborator
title: Proponer nuevos requerimientos como colaborador operativo (Política de Backlog)
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
  - proponer tarea
  - nuevo requerimiento
  - crear tarea colaborador
  - backlog
  - politica de backlog
  - alcance
requirements:
  - Acceso activo al portal operativo de tareas
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalCreateTask
    claim: Aplica gobernanza de colaborador estándar forzando status a backlog, horas estimadas a 0, fecha límite a null y limitando asignaciones a sí mismo.
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: TaskCollaboratorPortal
    claim: Provee el botón '+ Requerimiento' en la barra de herramientas para desplegar el modal de creación simplificado.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Proponer nuevos requerimientos como colaborador operativo (Política de Backlog)

## Propósito
Guiar a los colaboradores operativos (Desarrolladores, Diseñadores, Especialistas) sobre cómo registrar nuevas iniciativas, mejoras técnicas o descubrimientos surgidos durante el trabajo, comprendiendo la Política de Gobernanza de Backlog que evita alteraciones no planificadas en los compromisos del sprint actual.

## Requisitos y perfiles
- **Perfiles aplicables:** Colaboradores estándar sin atribuciones de liderazgo o Project Management.
- **Principio de gobernanza:** Todo requerimiento creado por un colaborador operativo nace como una propuesta en el banco de ideas (**Backlog**), esperando la evaluación del Project Manager antes de poder ejecutarse formalmente.

## Ubicación en pantalla
- **Barra de herramientas superior:** Botón **+ Requerimiento** (icono de suma) situado a la izquierda de la barra de búsqueda y filtros.

## Procedimiento paso a paso

### 1. Abrir el formulario de propuesta
1. En la parte superior de tu portal, presiona el botón **+ Requerimiento**.
2. Se desplegará la ventana modal de creación de tareas.

### 2. Diligenciar la información técnica
1. **Proyecto / Workspace:** Selecciona el proyecto al que corresponde la iniciativa.
2. **Título del requerimiento:** Escribe un resumen claro y conciso del entregable propuesto (por ejemplo, `Optimizar consultas de base de datos en reporte de ventas`).
3. **Descripción:** Detalla el contexto técnico, los antecedentes, la justificación de por qué es necesario este cambio y la solución sugerida.
4. **Prioridad sugerida:** Selecciona el nivel de urgencia estimado (*Baja*, *Media*, *Alta* o *Urgente*).
5. **Subtareas sugeridas:** Puedes desglosar los pasos preliminares que consideres oportunos. *Nota:* Solo podrás asignártelas a ti mismo o dejarlas sin asignar.

### 3. Guardar y enviar la propuesta
1. Haz clic en **Crear Requerimiento**.
2. El sistema generará el código identificador único (por ejemplo, `#TK-215`) y guardará el ticket en la plataforma.

## Reglas automáticas aplicadas por el servidor (Política de Backlog)
Para proteger el presupuesto y el alcance comprometido con los clientes, el servidor aplica de forma invisible las siguientes salvaguardas:
1. **Estado forzado a Backlog:** La tarea se registrará obligatoriamente en estado `backlog`. No aparecerá en las columnas de ejecución inmediata hasta que el Project Manager la apruebe.
2. **Horas estimadas en 0:** Las horas presupuestadas oficiales quedan fijadas en `0 h`. Solo el Project Manager puede autorizar horas contractuales o asignarlas al sprint.
3. **Sin fecha límite contractual:** La fecha de entrega (`due_date`) se guarda como vacía (`null`) para evitar generar alertas falsas de vencimiento antes de que el requerimiento sea programado.
4. **Sin imposición a terceros:** No puedes asignar la tarea ni sus subtareas a otros compañeros de equipo; queda asignada a ti o sin asignar.
5. **Sin asignación de QA:** El revisor de calidad no se asigna en esta fase.

## Resultado esperado
Canalización ordenada de la innovación y propuestas técnicas del equipo sin desviar la atención ni los recursos del sprint activo.

## Errores y límites conocidos
- **No puedo iniciar la tarea de inmediato:** Si intentas mover la tarea recién creada a *En progreso* o ajustar su barra de avance, el portal indicará que el requerimiento debe ser evaluado y aprobado por el Project Manager antes de iniciar su desarrollo.

## Notas de verificación
- Lógica de gobernanza: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (líneas 1602–1633 de `portalCreateTask`)
- Modal de creación: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx`
