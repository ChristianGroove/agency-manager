---
schema_version: 1
id: tasks.sprint-planning-and-pacing
title: Planificacion de Sprints, ritmo semanal y metricas en Tareas
module: tasks
status: draft
surface: dashboard
audience: tenant-user
source_revision: 5aaeec98767f13ec9b495eed33486fcdba65ab86
verified_on: 2026-10-12
verification: source-only
routes:
  - /operations/tasks
keywords:
  - sprints
  - planificacion
  - ritmo semanal
  - pacing
  - metricas
  - velocidad
  - exportar pdf
  - ciclo agil
  - estimacion de horas
  - horas reales
requirements:
  - Modulo de tareas habilitado en la organizacion
  - Autorizacion para gestionar la planificacion de proyectos y ciclos de trabajo
evidence:
  - path: src/modules/features/tasks/components/modals/task-sprint-modal.tsx
    symbol: TaskSprintModal
    claim: Formulario de creacion, edicion y cierre de ciclos de Sprint con transferencia de tareas pendientes.
  - path: src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx
    symbol: TaskWeeklyPacingMatrix
    claim: Matriz visual de cuatro semanas para monitorear ritmo de avance, horas ejecutadas y exportacion a PDF.
  - path: src/modules/features/tasks/components/metrics/task-metrics-view.tsx
    symbol: TaskMetricsView
    claim: Panel de telemetria operativa con graficos de velocidad de entrega, tasa de cierre y balance de carga.
  - path: src/modules/features/tasks/actions/task-sprint-actions.ts
    symbol: getSprints
    claim: Accion del servidor que consulta los ciclos de trabajo de la organizacion y su estado de vigencia.
---

# Planificacion de Sprints, ritmo semanal y metricas en Tareas

## Proposito
Instruir a los lideres de proyecto, gestores y miembros del equipo en la planificacion de ciclos de trabajo agiles (Sprints), el seguimiento del avance en la matriz de ritmo semanal (Pacing) y la interpretacion de metricas de rendimiento operativo en el modulo de Tareas.

## Requisitos y perfiles
- **Modulo:** Modulo de tareas activo en la empresa.
- **Autorizacion requerida:**
  - *Consultar metricas, sprints y matrices de ritmo:* Autorizacion de lectura en operaciones.
  - *Crear sprints, activar ciclos, cerrarlos o exportar informes:* Autorizacion de gestion operativa de tareas.

## Ubicacion en pantalla
- Para gestionar Sprints: Menu **Nuevo** -> opcion **Nuevo Sprint**, o mediante el selector de Sprint en la barra superior.
- Para consultar el ritmo de entrega: Pestana **Ritmo** (Pacing) en la barra superior de Tareas (`/operations/tasks`).
- Para consultar estadisticas y velocidad: Pestana **Metricas** en la barra superior de Tareas.

## Gestion de ciclos de trabajo (Sprints)

### Crear un nuevo Sprint
1. Haz clic en el boton superior **Nuevo** y selecciona **Nuevo Sprint** (`TaskSprintModal`).
2. Ingresa los datos del ciclo:
   - *Nombre del Sprint:* Por ejemplo, *Sprint 12 - Pasarela de Pagos*.
   - *Meta del Sprint (Goal):* Breve descripcion del objetivo primordial que el equipo debe alcanzar al concluir el periodo.
   - *Fecha de inicio y Fecha de cierre:* Periodo de duracion habitual (generalmente de 1 a 4 semanas).
3. Presiona **Guardar Sprint**. El ciclo se creara inicialmente en estado de planificacion.

### Activar y cerrar un Sprint
- **Iniciar Sprint:** Cuando el equipo este listo para arrancar, se activa el ciclo. El sistema marcara el Sprint como activo para filtrar las tareas del periodo.
- **Completar Sprint:** Al vencer el plazo o culminar las labores:
  1. Abre el menu del Sprint y presiona **Completar Sprint**.
  2. Si existen requerimientos que quedaron incompletos o en revision, el asistente te consultara si deseas transferirlos directamente al proximo Sprint planificado o devolverlos al Backlog general.
  3. El sistema archiva el ciclo completado para alimentar el historico de velocidad.

## Matriz de ritmo semanal (Pacing Matrix)
Al acceder a la pestana **Ritmo**, el modulo despliega una grilla ejecutiva de cuatro semanas:

1. **Estructura temporal:** Organiza las entregas en cuatro columnas de semanas consecutivas para anticipar cuellos de botella y compromisos de entrega.
2. **Cómputo de horas:** Contrasta el presupuesto de horas planificadas frente a las horas efectivas imputadas en cada periodo.
3. **Indicadores de estado:** Codigo de colores para distinguir requerimientos al dia, en riesgo de retraso o completados.
4. **Exportacion a PDF ejecutivo:** La matriz cuenta con el boton **Exportar Informe** que genera un documento PDF formateado para presentar el estado de avance a directores y clientes sin exponer detalles tecnicos internos.

## Panel de telemetria y metricas operativas
Al acceder a la pestana **Metricas**, el panel presenta graficos interactivos con datos consolidados:

1. **Velocidad del equipo:** Historial de puntos o requerimientos completados por ciclo para proyectar la capacidad de entrega futura.
2. **Tasa de finalizacion (Burndown):** Porcentaje de requerimientos cerrados frente al volumen total comprometido en el sprint activo.
3. **Distribucion de carga de trabajo:** Visualizacion de la cantidad de tareas y horas asignadas a cada colaborador, permitiendo balancear el esfuerzo y evitar sobrecargas.
4. **Desviacion de estimaciones:** Comparativa grafica entre el tiempo estimado por la coordinacion y las horas reales registradas por los ejecutores.

## Resultado esperado
Previsibilidad en los plazos de entrega, medicion objetiva del rendimiento del equipo y disponibilidad de informes descargables para la rendicion de cuentas con la direccion y los clientes.

## Limites conocidos
- Solo puede existir un Sprint activo simultaneamente por cada area de trabajo para mantener el foco del equipo.
- La exportacion a PDF de la matriz de ritmo resume la ventana de cuatro semanas en curso.

## Notas de verificacion
- Componente de modal de sprint verificado en src/modules/features/tasks/components/modals/task-sprint-modal.tsx lineas 1-280.
- Matriz de ritmo semanal verificada en src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx lineas 1-240.
- Panel de metricas verificado en src/modules/features/tasks/components/metrics/task-metrics-view.tsx lineas 1-210.
- Accion del servidor getSprints verificada en src/modules/features/tasks/actions/task-sprint-actions.ts lineas 1-70.
