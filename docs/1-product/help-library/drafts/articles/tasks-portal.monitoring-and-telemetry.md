---
schema_version: 1
id: tasks-portal.monitoring-and-telemetry
title: Consultar telemetría de errores, incidentes y eventos de monitoreo en tareas
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
  - monitoreo
  - telemetria
  - sentry
  - errores
  - incidentes
  - trazas
  - excepciones
  - observabilidad
  - logs
  - monitoring
  - tickets de bug
  - estabilidad
requirements:
  - Capacidad técnica monitoring activa en el perfil del colaborador (por defecto en desarrolladores, QA leads y PMs)
  - Ticket de requerimiento asociado a incidentes de observabilidad o errores técnicos
evidence:
  - path: src/modules/features/tasks/types.ts
    symbol: resolveCollaboratorCapabilities
    claim: Resuelve la capacidad monitoring por defecto para desarrolladores, QA leads y PMs, y evalúa overrides en settings.
  - path: src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx
    symbol: TaskCollaboratorsManager
    claim: Expone el switch y etiqueta de Observabilidad y Logs para habilitar o restringir el acceso a telemetria tecnica.
  - path: src/modules/features/tasks/components/modals/task-detail-modal.tsx
    symbol: TaskDetailModal
    claim: Evalúa la capacidad activa de monitoreo y telemetría para desplegar la sección de diagnóstico de errores en el ticket.
---

# Consultar telemetría de errores, incidentes y eventos de monitoreo en tareas

## Propósito
Guiar a desarrolladores, especialistas de calidad y líderes de proyecto en la consulta de telemetría de errores, eventos de Sentry/APM y trazas de excepción vinculadas a tickets de bugs o incidentes técnicos dentro del portal de tareas.

## Requisitos y perfiles
- **Capacidad mínima requerida:** Capacidad técnica `monitoring`.
- **Perfiles con acceso por defecto:** Desarrolladores (`developer`), Líderes QA (`qa_lead`) y Project Managers (`pm` / `pm_lead`).
- **Perfiles restringidos:** Diseñadores, perfiles comerciales y colaboradores generales no visualizan la información de telemetría para evitar ruido técnico, a menos que cuenten con un ajuste personalizado en su ficha (`staff.settings.capabilities.monitoring: true`).
- **Requisitos por registro:**
  - El ticket debe estar vinculado a un proyecto técnico con trazabilidad de errores activada.
  - El colaborador debe pertenecer al workspace o proyecto del requerimiento para auditar los logs del incidente.

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Pestaña o sección de **Monitoreo & Telemetría** dentro del ticket técnico, identificada con icono de observabilidad (ojo o gráfico de actividad).

## Procedimiento paso a paso

### 1. Localizar los errores asociados a un ticket de bug
1. Abre el modal de detalle del requerimiento clasificado como corrección de error o bug.
2. Si cuentas con la capacidad `monitoring`, haz clic en la pestaña o sección **Monitoreo**.
3. El portal consultará los registros de la plataforma de observabilidad vinculada (como Sentry o servicios APM de la empresa).

### 2. Inspeccionar la información de diagnóstico
En el panel de telemetría podrás revisar:
1. **Mensaje de excepción:** El error exacto arrojado por la aplicación en tiempo de ejecución (por ejemplo: `TypeError: Cannot read properties of undefined`).
2. **Traza de pila (Stacktrace):** Archivos fuente, módulos y líneas de código donde se originó el fallo.
3. **Frecuencia y usuarios afectados:** Conteo de ocurrencias del incidente, última fecha de detección y navegadores o sistemas operativos impactados.
4. **Etiquetas de entorno:** Información sobre si el error se registró en producción, staging o entornos de prueba.

### 3. Utilizar los datos para reproducir y resolver el bug
1. Emplea la traza de error y las variables de contexto capturadas para reproducir el síntoma en tu máquina local.
2. Al publicar un comentario de avance en el hilo de discusión, puedes citar el identificador del evento de Sentry para correlacionar la solución implementada.

## Resultado esperado
Diagnóstico técnico inmediato sin necesidad de abandonar el portal ni solicitar credenciales directas a consolas de infraestructura crítica, reduciendo los tiempos de resolución de incidentes (MTTR).

## Errores y límites conocidos
- **Pestaña no disponible:** Si no observas los datos de observabilidad, verifica que tu usuario cuente con la capacidad `monitoring` activa y que el ticket corresponda a un proyecto con integración de APM.
- **Solo lectura preventiva:** La pestaña de monitoreo y el asistente de ayuda son de estricta consulta de datos; no modifican configuraciones de servidor, no silencian alertas de producción ni ejecutan scripts sobre la infraestructura.

## Notas de verificación
- Lógica de asignación de capacidades: `src/modules/features/tasks/types.ts` (`resolveCollaboratorCapabilities`)
- Control de observabilidad en gestión: `src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx` (`TaskCollaboratorsManager`)
- Modal de detalle: `src/modules/features/tasks/components/modals/task-detail-modal.tsx` (`TaskDetailModal`)
