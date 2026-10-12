---
schema_version: 1
id: tasks-portal.task-progress-and-slider
title: Actualizar el progreso porcentual y registrar avances en el portal
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
  - progreso
  - slider
  - porcentaje de avance
  - subtareas
  - auditoria
  - regresion
requirements:
  - Ser el responsable directo de la tarea o tener rol de Líder / Project Manager
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUpdateTaskProgress
    claim: Actualiza el progreso de 0 a 100%, valida que solo el responsable o PM edite el avance general y aplica clamp al 95% si hay subtareas pendientes.
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: PortalTaskSliderProps
    claim: Renderiza la barra de control deslizable con indicador de porcentaje y notas de auditoría de regresión.
---

# Actualizar el progreso porcentual y registrar avances en el portal

## Propósito
Instruir al colaborador sobre cómo reportar el avance cuantitativo de sus requerimientos técnicos mediante el control deslizante de porcentaje (0% a 100%), comprendiendo las reglas automáticas de gobernanza que protegen la exactitud del progreso del proyecto.

## Requisitos y perfiles
- **Quién puede mover el avance general:**
  - El colaborador asignado directamente como responsable principal de la tarea (`assigned_staff_id`).
  - Un Líder Técnico o Project Manager de la organización (`isLeadOrPm`).
- **Restricción:** Colaboradores secundarios o asignados únicamente a subtareas específicas no pueden mover el control de avance global de la tarea padre.

## Ubicación en pantalla
- **En vista de Cuadrícula (Tarjetas):** Barra de progreso interactiva situada en el cuerpo inferior de cada tarjeta de tarea.
- **En vista de Lista:** Columna de progreso con porcentaje interactivo.
- **En el Modal de Detalle:** Control deslizable amplio ubicado en la barra lateral derecha de la tarea.

## Procedimiento paso a paso

### 1. Desplazar el control de avance
1. Ubica la tarea que estás ejecutando en el portal.
2. Haz clic y arrastra el círculo del control deslizante hacia la derecha para incrementar el porcentaje, o hacia la izquierda si necesitas corregir una estimación previa.
3. Al soltar el control, el sistema guardará el nuevo valor en la base de datos de forma automática.

### 2. Gobernanza de subtareas pendientes (Regla del 95%)
- Si tu tarea tiene una lista de entregables o subtareas (`checklist`) y al menos una de ellas no ha sido completada:
  - Puedes avanzar libremente hasta el **95%**.
  - Si intentas arrastrar el medidor al **100%**, el sistema ajustará automáticamente el avance al **95%** y mantendrá la tarea en curso.
  - *Motivo:* No es posible declarar un requerimiento al 100% de cumplimiento si aún existen entregables parciales sin marcar.

### 3. Registro de auditoría automática
- Cada vez que el progreso cambia sustancialmente:
  - El sistema publica una nota interna en la discusión del ticket (por ejemplo: `📈 Avance de tarea actualizado del 40% al 80%`).
  - Si el avance sufre una disminución (por ejemplo, al detectar un retrabajo o bloqueo), se registra una alerta visual de regresión (`📉`) visible para el Project Manager.

## Resultado esperado
Reflejo fidedigno del porcentaje de cumplimiento en los tableros del equipo y cálculo preciso de la velocidad del sprint en tiempo real.

## Errores y límites conocidos
- **Control deshabilitado (bloqueado):**
  - Si la tarea está en estado **Completada (`done`)**, el control de avance queda sellado y bloqueado para colaboradores estándar. Solo un Project Manager tiene facultad para reabrirla o alterar su porcentaje.
  - Si la tarea está en el **Backlog**, el control no permitirá avances hasta que el Project Manager priorice y apruebe el inicio formal del ticket.
- **Error "Solo el responsable directo...":** Aparece si intentas arrastrar el medidor de una tarea en la que solo participas como observador o en la que tienes una subtarea asignada, pero cuyo responsable principal es otro compañero.

## Notas de verificación
- Lógica de backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalUpdateTaskProgress`)
- Interfaz gráfica: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx`
