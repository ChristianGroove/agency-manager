---
schema_version: 1
id: tasks-portal.finance-and-costs
title: Consultar costos financieros, tarifas horarias y rentabilidad de tareas
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
  - costos
  - costo
  - costado
  - tarifas
  - tarifa horaria
  - finanzas
  - presupuesto
  - horas trabajadas
  - horas
  - trabajadas
  - rentabilidad
  - tarea
  - finance_costs
requirements:
  - Capacidad técnica finance_costs activa en el perfil del colaborador (por defecto exclusiva de Project Managers / líderes)
  - Registro de horas imputadas en el requerimiento
evidence:
  - path: src/modules/features/tasks/types.ts
    symbol: resolveCollaboratorCapabilities
    claim: Resuelve la capacidad finance_costs por defecto exclusivamente para el rol pm, manteniéndola en false para desarrolladores, diseñadores y QA.
  - path: src/modules/features/tasks/components/modals/task-detail-modal.tsx
    symbol: TaskDetailModal
    claim: Condiciona la visibilidad de métricas financieras de costo y presupuesto a que la capacidad finance_costs esté activa.
  - path: src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx
    symbol: TaskCollaboratorsManager
    claim: Permite a los administradores auditar y ajustar la tarifa horaria y visibilidad financiera por colaborador.
---

# Consultar costos financieros, tarifas horarias y rentabilidad de tareas

## Propósito
Explicar a los Project Managers y líderes autorizados cómo auditar el costo financiero real acumulado en cada tarea según las horas imputadas por el equipo, contrastar el gasto contra el presupuesto contratado y evaluar la rentabilidad del proyecto dentro del portal.

## Requisitos y perfiles
- **Capacidad mínima requerida:** Capacidad técnica `finance_costs`.
- **Perfil con acceso por defecto:** Project Managers (`pm` / `pm_lead`).
- **Restricción estricta de confidencialidad:** Desarrolladores (`developer`), Diseñadores (`designer`), Especialistas (`specialist`) y Revisores de Calidad (`qa_lead` / `qa_specialist`) tienen esta capacidad desactivada por defecto (`finance_costs: false`). Las tarifas individuales y costos acumulados son información confidencial de la empresa y no se exponen al personal operativo ni a clientes finales.
- **Requisitos por registro:**
  - El usuario debe tener rol de liderazgo o supervisión en el workspace y proyecto del ticket.
  - La tarea debe contener horas registradas en su bitácora de trabajo (`worklogs`) para calcular el costo monetario real.

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Pestaña o bloque de **Costos y Presupuesto** (`finance_costs`), visible en la barra de pestañas secundarias o resumen financiero del ticket únicamente para perfiles autorizados.

## Procedimiento paso a paso

### 1. Acceder al análisis financiero del requerimiento
1. Abre el modal de detalle de la tarea como Project Manager o usuario con capacidad `finance_costs`.
2. Dirígete a la sección o pestaña **Costos y Presupuesto**.
3. El sistema consolida automáticamente los registros de horas imputados por cada colaborador que haya trabajado en el ticket.

### 2. Consultar el desglose de costo y tarifa horaria
En el panel financiero podrás verificar:
1. **Costo real acumulado:** Sumatoria resultante de multiplicar las horas registradas por cada colaborador por su tarifa horaria individual confidencial (`hourly_rate` definida en `organization_staff`).
2. **Presupuesto vs. Real:** Comparativa gráfica y numérica entre las horas presupuestadas originalmente para la tarea y el costo real devengado hasta la fecha.
3. **Desglose por miembro del equipo:** Lista de colaboradores que han imputado tiempo, horas dedicadas y subtotal financiero generado por cada uno.

### 3. Evaluar la rentabilidad y desvíos
1. Si el costo acumulado supera el presupuesto estimado del requerimiento, el indicador mostrará una alerta de sobrecosto en color ámbar o rojo.
2. Esta información permite al Project Manager renegociar alcances con el cliente o ajustar la asignación de recursos antes de que se afecte el margen del proyecto.

## Resultado esperado
Control gerencial preciso y en tiempo real sobre la rentabilidad de los entregables técnicos, preservando la total confidencialidad de las tarifas salariales frente al equipo de desarrollo y terceros.

## Errores y límites conocidos
- **No puedo ver los costos de la tarea siendo desarrollador:**
  *Causa comprobada:* Por política de gobernanza y privacidad de Pixy, los desarrolladores y colaboradores operativos solo pueden consultar las horas invertidas, nunca el valor económico ni las tarifas horarias de sus compañeros.
- **Los costos no generan cargos bancarios:** La métrica de costos es un cálculo analítico interno de gestión operativa; no debita fondos de cuentas bancarias ni emite facturas automáticamente.

## Notas de verificación
- Resolución de capacidad confidencial: `src/modules/features/tasks/types.ts` (`resolveCollaboratorCapabilities`)
- Control de visualización en modal: `src/modules/features/tasks/components/modals/task-detail-modal.tsx` (`TaskDetailModal`)
- Configuración de tarifas: `src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx` (`TaskCollaboratorsManager`)
