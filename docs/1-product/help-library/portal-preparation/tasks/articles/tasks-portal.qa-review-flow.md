---
schema_version: 1
id: tasks-portal.qa-review-flow
title: Ejecutar pruebas y certificar requerimientos en el flujo de QA
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
  - qa
  - calidad
  - tester
  - en revision
  - certificar tarea
  - rechazar tarea
  - reporte de bug
requirements:
  - Perfil de especialista QA, revisor asignado o Líder de Proyecto
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUpdateTaskStatus
    claim: Permite a los revisores de QA mover tareas entre in_review, done e in_progress con reporte de novedades.
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: isQa
    claim: Resuelve permisos especiales para testers otorgándoles visibilidad de tareas en revisión de todo el equipo.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Ejecutar pruebas y certificar requerimientos en el flujo de QA

## Propósito
Instruir a los especialistas de aseguramiento de la calidad (QA), testers y revisores técnicos sobre cómo auditar requerimientos que han finalizado su etapa de desarrollo, registrar hallazgos de prueba y autorizar el paso a producción o devolver el ticket para corrección.

## Requisitos y perfiles
- **Perfiles aplicables:** Testers, Analistas de Calidad, QA Leads y Project Managers (`isQa: true` o `isLeadOrPm: true`).
- **Visibilidad especial:** Los usuarios con perfil QA tienen acceso a la lista completa de tareas del equipo (`allTeamTasks`) dentro de sus workspaces autorizados, facilitando la supervisión de entregables pendientes de certificación.

## Ubicación en pantalla
- **Pestaña rápida:** Pestaña superior **En Revisión** en el panel de gestión.
- **En tablero Kanban:** Columna central **En revisión** (`in_review`).
- **Modal de Detalle:** Insignia de revisor QA asignado (`qa_staff_id`) en la cabecera del requerimiento.

## Procedimiento paso a paso

### 1. Identificar requerimientos listos para prueba
1. En tu portal, haz clic en la pestaña **En Revisión** o revisa la columna correspondiente en el tablero Kanban.
2. Abre la tarea que deseas auditar.
3. Revisa la descripción técnica, los archivos adjuntos y los enlaces a prototipos o entornos de prueba (staging).
4. Verifica que todas las subtareas de desarrollo hayan sido concluidas por los desarrolladores responsables.

### 2. Certificar y aprobar la tarea (Paso a Completada)
1. Tras ejecutar tu plan de pruebas y verificar que el requerimiento cumple todos los criterios de aceptación:
2. Abre el selector de estado en la cabecera del modal y selecciona **Completada (`done`)**.
3. El sistema:
   - Fijará el avance al **100%**.
   - Sellará el requerimiento de forma definitiva.
   - Desbloqueará automáticamente cualquier tarea sucesora dependiente.
   - Notificará al desarrollador y al Project Manager que el entregable ha sido formalmente certificado.

### 3. Rechazar la tarea y reportar hallazgos (Devolución a En Progreso)
1. Si durante las pruebas identificas errores, discrepancias de diseño o fallos de lógica:
2. En la sección de **Discusión / Comentarios**, redacta detalladamente el reporte del hallazgo:
   - Pasos para reproducir el problema.
   - Comportamiento esperado vs comportamiento obtenido.
   - Adjunta capturas de pantalla o logs si aplica.
3. Menciona directamente al desarrollador responsable (por ejemplo: `@Juan detecté este error en el formulario`).
4. Cambia el estado de la tarea de *En revisión* a **En progreso (`in_progress`)**.
5. Opcionalmente, ajusta el control de avance hacia abajo (por ejemplo, del 90% al 70%) para alertar al Project Manager de que el requerimiento requerirá tiempo adicional de resolución.

## Resultado esperado
Un filtro de calidad riguroso y transparente que garantiza que ningún entregable llegue a manos del cliente o a producción sin validación previa documentada.

## Errores y límites conocidos
- **No se puede aprobar si hay subtareas sin marcar:** Si intentas seleccionar *Completada* pero el checklist aún tiene un ítem pendiente, el portal impedirá el cierre y mantendrá la tarea en *En revisión* al 95%.

## Notas de verificación
- Lógica de permisos QA: líneas 467–473 de `collaborator-portal-actions.ts`
- Carga de tareas de equipo: línea 932 de `collaborator-portal-actions.ts` (`allTeamTasks: isLeadOrPm || isQa ? allTasks : undefined`)
