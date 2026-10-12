---
schema_version: 1
id: tasks-portal.pm-operations-dashboard
title: Monitorear la salud operativa y los sprints desde el Dashboard de PM
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
  - dashboard pm
  - operaciones
  - salud de proyectos
  - carga de trabajo
  - tareas estancadas
  - sprint activo
  - metricas
requirements:
  - Perfil de Project Manager o Líder Técnico (`isLeadOrPm: true`)
evidence:
  - path: src/modules/features/tasks/components/portal/task-pm-operations-dashboard.tsx
    symbol: TaskPmOperationsDashboard
    claim: Presenta analítica ejecutiva de proyectos, gráficas de distribución de carga, detección de cuellos de botella y control de sprints.
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: pmViewMode
    claim: Renderiza el interruptor central exclusivo para PMs permitiendo alternar entre Dashboard, Gestión, Pacing y Soporte.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Monitorear la salud operativa y los sprints desde el Dashboard de PM

## Propósito
Instruir a los Project Managers y Líderes en el uso del panel de control ejecutivo (*Dashboard de Operaciones*), diseñado para brindar visibilidad integral sobre la distribución de la carga de trabajo entre colaboradores, el avance del sprint y la detección temprana de requerimientos estancados.

## Requisitos y perfiles
- **Perfiles aplicables:** Exclusivamente Project Managers, Líderes Técnicos y Directores de Área (`isLeadOrPm: true`).
- **Restricción:** Este panel no se despliega para desarrolladores, diseñadores o especialistas operativos estándar.

## Ubicación en pantalla
- **Interruptor de modos PM:** En la parte superior central del portal, selecciona la opción **Dashboard**.

## Componentes y métricas del Dashboard

### 1. Filtros temporales de rendimiento
- En la esquina superior derecha del dashboard encontrarás los botones de rango temporal:
  - **7D:** Últimos 7 días de actividad.
  - **30D:** Último mes calendario.
  - **90D:** Trimestre operativo.
  - **1Y / ALL:** Histórico consolidado.
- Al alternar el rango, todas las gráficas analíticas recalculan los datos de productividad al instante.

### 2. Tarjetas de métricas principales (KPIs)
- **Total de Requerimientos:** Conteo consolidado de tareas activas y cerradas.
- **Tasa de Cumplimiento:** Porcentaje de entregables completados sobre el total planificado.
- **Horas Presupuestadas vs Ejecutadas:** Comparativa gráfica entre el tiempo estimado oficial y las horas reales imputadas por el equipo.
- **Requerimientos Estancados (*Stalled*):** Identifica de forma proactiva aquellas tareas en progreso que llevan más de 48 o 72 horas hábiles sin ningún registro de avance o comentario.

### 3. Distribución de carga por colaborador (Workload)
- Gráfica de barras horizontales que desglosa:
  - Número de tareas asignadas por miembro del equipo.
  - Horas comprometidas por persona en el sprint actual.
  - Permite detectar sobrecargas operativas antes de que afecten la fecha de entrega y balancear el trabajo reasignando tickets.

### 4. Control del Sprint Activo
- Bloque destacado con el nombre del sprint en curso (por ejemplo: `Sprint 14 - Q4`).
- Muestra los días restantes antes del cierre, la barra de avance ponderada y el botón de acceso al modal de sprint para planificar la siguiente iteración.

### 5. Botón de transición rápida a Gestión
- Si necesitas intervenir operativamente un requerimiento identificado en las gráficas, presiona el botón **Ir a Gestión** para saltar directamente al tablero de tareas con los filtros correspondientes.

## Resultado esperado
Toma de decisiones informada, prevención de cuellos de botella y supervisión en tiempo real del cumplimiento de metas operativas sin necesidad de solicitar informes manuales al equipo.

## Errores y límites conocidos
- **Aislamiento por Workspace:** Si tu usuario no tiene asignado acceso global a todos los workspaces de la empresa, el dashboard mostrará únicamente las métricas de los proyectos y colaboradores pertenecientes a tus workspaces autorizados.

## Notas de verificación
- Componente de dashboard: `src/modules/features/tasks/components/portal/task-pm-operations-dashboard.tsx`
- Detección de tareas estancadas: `src/modules/features/tasks/utils/business-hours-utils.ts`
