---
schema_version: 1
id: tasks-portal.pm-weekly-pacing
title: Supervisar la matriz de ritmo semanal (Pacing) y exportar reportes
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
  - ritmo semanal
  - pacing
  - matriz semanal
  - exportar pdf
  - avance mensual
  - horas reales
  - semaforo
requirements:
  - Perfil verificado de Project Manager o Líder (`isLeadOrPm: true`)
evidence:
  - path: src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx
    symbol: TaskWeeklyPacingMatrix
    claim: Despliega la matriz de 4 semanas con semáforos de ritmo (on_track, at_risk, delayed, completed) y botón de exportación a PDF.
  - path: src/modules/features/tasks/types.ts
    symbol: getTaskWeeklyPacing
    claim: Calcula el progreso semanal fraccional respetando fechas reales de entrega y compromisos de checklist.
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Supervisar la matriz de ritmo semanal (Pacing) y exportar reportes

## Propósito
Instruir a los directores de proyecto en la utilización de la Matriz de Ritmo Semanal (*Weekly Pacing*), una herramienta analítica que evalúa el progreso de los proyectos semana a semana dentro del mes, detecta desviaciones tempranas de cronograma y genera reportes ejecutivos en formato PDF para clientes o comités de seguimiento.

## Requisitos y perfiles
- **Perfiles aplicables:** Exclusivamente Project Managers, Líderes Técnicos y Directores (`isLeadOrPm: true`).

## Ubicación en pantalla
- **Interruptor de modos PM:** En el conmutador superior central del portal, selecciona la opción **Ritmo Semanal / Pacing**.

## Estructura de la Matriz de Pacing
La matriz descompone el mes operativo en 4 semanas fijas de seguimiento (Semana 1 a Semana 4):
- Cada fila representa un requerimiento o proyecto técnico.
- Cada columna semanal cuenta con un semáforo de salud operativa:
  - **Al día (`on_track`):** Verde. El ritmo de completado de subtareas e imputación de horas coincide con la planificación esperada.
  - **En riesgo (`at_risk`):** Amarillo. El avance es inferior al 70% del tiempo transcurrido de la semana.
  - **Retrasado (`delayed`):** Rojo. La fecha de entrega venció o el requerimiento se encuentra bloqueado sin avance en los últimos días hábiles.
  - **Completado (`completed`):** Azul / Verde oscuro. Entregables finalizados y certificados.
  - **Pendiente (`pending`):** Gris. Semanas futuras aún no iniciadas.

## Procedimiento paso a paso

### 1. Consultar el estado del ritmo operativo
1. Accede al modo **Ritmo Semanal**.
2. Revisa la tabla consolidada de requerimientos.
3. Observa las celdas de las semanas transcurridas para comprobar si los entregables comprometidos fueron efectivamente entregados.
4. Pasa el cursor sobre cualquier celda semanal para desplegar el resumen flotante con el porcentaje exacto y el número de subtareas concluidas.

### 2. Filtrar por proyecto o cliente
- En la cabecera de la matriz, utiliza el selector de proyectos para aislar los entregables de un cliente en particular, facilitando la rendición de cuentas de una cuenta específica.

### 3. Exportar el reporte en PDF
1. En la esquina superior derecha de la matriz, presiona el botón **Exportar Reporte PDF** (icono de descarga o documento).
2. Se abrirá la ventana modal de previsualización `TaskPacingPdfModal`.
3. Selecciona las opciones deseadas (incluir desglose de horas, incluir resumen ejecutivo).
4. Presiona **Descargar PDF**. El navegador generará un documento formal membretado con el logotipo de la empresa, ideal para enviar al cliente o presentar en reuniones de seguimiento mensual.

## Resultado esperado
Un diagnóstico visual anticipado del cumplimiento de metas que evita sorpresas de último momento al cierre del mes y aporta soporte documental profesional para los clientes.

## Errores y límites conocidos
- **Tareas sin fecha límite:** Aquellos requerimientos que no tengan definida una fecha de entrega (`due_date`) no podrán ser ubicados con precisión en la cuadrícula de 4 semanas y aparecerán marcados como sin programación temporal fija.

## Notas de verificación
- Componente de matriz: `src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx`
- Modal de exportación PDF: `src/modules/features/tasks/components/pacing/task-pacing-pdf-modal.tsx`
- Cálculo de algoritmos de ritmo: función `getTaskWeeklyPacing` en `src/modules/features/tasks/types.ts`
