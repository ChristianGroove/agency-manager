---
schema_version: 1
id: tasks.task-lifecycle-and-views
title: Ciclo de vida, estados y gestion de tareas en Kanban y Lista
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
  - ciclo de vida
  - estados de tareas
  - kanban
  - vista de lista
  - backlog
  - por hacer
  - en progreso
  - en revision
  - qa
  - bloqueada
  - dependencias
  - depende
  - desbloqueo
  - desbloquee
  - subtareas
  - checklist
requirements:
  - Modulo de tareas habilitado en la organizacion
  - Autorizacion para consultar o gestionar requerimientos en el area de operaciones
evidence:
  - path: src/modules/features/tasks/components/kanban/task-kanban-board.tsx
    symbol: TaskKanbanBoard
    claim: Renderiza las columnas del flujo de trabajo y administra las transiciones de estado mediante arrastrar y soltar.
  - path: src/modules/features/tasks/components/list/task-list-view.tsx
    symbol: TaskListView
    claim: Presenta la tabla de requerimientos con controles de seleccion, notas rapidas y reordenamiento.
  - path: src/modules/features/tasks/components/modals/task-detail-modal.tsx
    symbol: TaskDetailModal
    claim: Despliega la ficha completa de la tarea permitiendo editar estados, prioridades, subtareas y dependencias.
  - path: src/modules/features/tasks/actions/task-actions.ts
    symbol: updateTaskStatus
    claim: Valida transiciones, exige motivo de bloqueo y ejecuta el desbloqueo automatico de tareas sucesoras al completar.
---

# Ciclo de vida, estados y gestion de tareas en Kanban y Lista

## Proposito
Detallar el flujo de trabajo de los requerimientos tecnicos en el panel de Tareas, las reglas de transicion entre estados, el tratamiento de bloqueos y dependencias entre tickets, y el uso efectivo de las vistas de Tablero Kanban y Lista.

## Requisitos y perfiles
- **Modulo:** Modulo de tareas activo en la empresa.
- **Autorizacion requerida:**
  - *Consultar el estado y avance de las tareas:* Autorizacion de lectura en operaciones.
  - *Mover tarjetas, cambiar estados, editar dependencias o crear tareas:* Autorizacion de gestion operativa de tareas.

## Ubicacion en pantalla
- En el panel de Tareas (`/operations/tasks`), selecciona la pestana **Tablero** (Kanban) o **Lista** en la barra superior.

## Estados del ciclo de vida operativo
Cada tarea transita por seis estados definidos segun su madurez operativa:

1. **Backlog (Reserva):** Ideas, solicitudes en evaluacion o requerimientos pendientes de priorizacion que aun no han entrado a la planificacion activa del ciclo.
2. **Por hacer (Todo):** Tareas priorizadas listas para ser tomadas por el responsable asignado.
3. **En curso (In Progress):** Trabajo tecnico o de diseno en ejecucion activa.
4. **En revision (In Review / QA):** Entregables concluidos por el ejecutor que se encuentran bajo auditoria de calidad, revision de codigo o validacion funcional por el analista de QA o el lider tecnico.
5. **Completada (Done):** Requerimiento finalizado y certificado al 100%.
6. **Bloqueada (Blocked):** Trabajo detenido por impedimentos tecnicos, falta de insumos de terceros o espera de aprobacion externa.

## Reglas de transicion y dependencias
- **Motivo de bloqueo obligatorio:** Al mover una tarea al estado *Bloqueada*, el sistema solicita registrar de forma obligatoria la razon del impedimento (por ejemplo, *Falta credencial de API del cliente*). Esta justificacion queda registrada de inmediato en la bitacora de auditoria.
- **Dependencias entre tickets:**
  - En la ficha de detalle de una tarea es posible definir una **Tarea Predecesora** mediante el campo *Bloqueada por*.
  - Mientras la tarea predecesora no se encuentre completada, la tarea sucesora reflejara la advertencia de dependencia.
  - Cuando la tarea predecesora se marca como *Completada*, el motor del sistema ejecuta un proceso de desbloqueo automatico: actualiza el estado de las tareas sucesoras, publica una nota automatica en sus comentarios y menciona al responsable asignado para avisarle que ya puede iniciar su labor.
- **Topes por subtareas incompletas:** Si una tarea principal contiene una lista de chequeo (entregables) con elementos pendientes, el sistema no permite sellarla directamente al 100%; la desvia a *En revision* con un 95% de avance para garantizar que ningun entregable quede desatendido.

## Modos de gestion: Tablero Kanban frente a Lista

### Uso del Tablero Kanban
- **Flujo visual:** Cada estado ocupa una columna vertical. Permite arrastrar una tarjeta desde su posicion actual y soltarla en la columna de destino.
- **Informacion en tarjeta:** Muestra el codigo de ticket, proyecto con distintivo de color, prioridad, colaborador asignado, progreso porcentual, conteo de subtareas y fecha de vencimiento con alerta de proximidad.
- **Agrupacion agil:** El tablero se enfoca exclusivamente en el flujo de entregables y oculta las reuniones programadas para mantener la claridad del backlog tecnico.

### Uso de la Vista de Lista
- **Estructura tabular:** Ideal para revisiones masivas y planificacion detallada. Cada fila expone todos los metadatos del ticket, ordenables por fecha, responsable o proyecto.
- **Notas rapidas privadas:** Cada fila cuenta con un icono de nota personal adhesiva donde el usuario puede registrar apuntes confidenciales que solo el puede ver.
- **Seleccion multiple:** Permite marcar casillas de verificacion para ejecutar acciones en lote mediante la barra flotante inferior.

## Procedimiento para actualizar una tarea
1. Haz clic sobre la tarjeta o fila de la tarea para abrir la ventana de detalle (`TaskDetailModal`).
2. Modifica los campos requeridos:
   - *Estado:* Selector desplegable para avanzar o retroceder el ciclo.
   - *Prioridad:* Baja, Media, Alta o Urgente.
   - *Subtareas:* Marca las casillas completadas o presiona *Anadir subtarea* para desglosar el requerimiento.
   - *Responsable y QA:* Reasigna al ejecutor directo o al analista de revision.
   - *Horas trabajadas:* Registra el tiempo invertido en la bitacora de horas.
3. Presiona guardar o cierra la ventana; los cambios se sincronizan en tiempo real con todos los miembros del equipo mediante la conexion de eventos de la plataforma.

## Resultado esperado
Flujo de trabajo predecible y transparente, visibilidad inmediata de cuellos de botella en la columna de bloqueo y coordinacion automatizada de entregas dependientes sin necesidad de supervision manual constante.

## Limites conocidos
- Mover una tarea a estado Bloqueada exige ingresar texto explicativo; no es posible bloquear sin registrar el motivo.
- Si dos miembros del equipo mueven la misma tarjeta simultaneamente, el canal de sincronizacion en tiempo real actualiza la posicion prevaleciendo la confirmacion del servidor.

## Notas de verificacion
- Componente de tablero verificado en src/modules/features/tasks/components/kanban/task-kanban-board.tsx lineas 1-180.
- Componente de lista verificado en src/modules/features/tasks/components/list/task-list-view.tsx lineas 1-220.
- Modal de detalle verificado en src/modules/features/tasks/components/modals/task-detail-modal.tsx lineas 1-320.
- Accion del servidor updateTaskStatus verificada en src/modules/features/tasks/actions/task-actions.ts lineas 170-255 y 1050-1200, validando el registro obligatorio de blockedReason y el desbloqueo automatico de dependencias mediante logTaskAuditComment.
