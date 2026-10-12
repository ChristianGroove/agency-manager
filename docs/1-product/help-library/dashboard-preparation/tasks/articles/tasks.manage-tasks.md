---
schema_version: 1
id: tasks.manage-tasks
title: Gestionar proyectos, tableros y requerimientos en el modulo de Tareas
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
  - modulo tareas
  - tareas
  - que es tareas
  - taskflow
  - proyectos
  - espacios de trabajo
  - workspaces
  - tableros
  - requerimientos
  - navegacion
  - vistas
  - operaciones
requirements:
  - Modulo de proyectos y tareas habilitado en la organizacion
  - Permiso para visualizar tableros y proyectos en el area de operaciones
evidence:
  - path: src/app/(dashboard)/operations/tasks/page.tsx
    symbol: TasksPage
    claim: Carga inicial del modulo en el dashboard resolviendo espacios, proyectos, tareas y colaboradores del tenant.
  - path: src/modules/features/tasks/components/task-manager-view.tsx
    symbol: TaskManagerView
    claim: Provee la navegacion central entre las seis vistas operativas y el menu desplegable de creacion de entidades.
  - path: src/modules/core/iam/actions/permissions.ts
    symbol: PERMISSIONS.OPERATIONS.TASKS_VIEW
    claim: Define el permiso canonico para consultar la vista de tareas, tableros Kanban, listas y metricas.
---

# Gestionar proyectos, tableros y requerimientos en el modulo de Tareas

## Proposito
Explicar a los miembros del equipo que es el modulo de Tareas (TaskFlow), cual es su estructura jerarquica y como navegar entre sus vistas operativas para coordinar proyectos, requerimientos tecnicos y actividades del equipo en el panel principal.

## Que es el modulo de Tareas
El modulo de Tareas es el centro de coordinacion operativa de la plataforma. Permite estructurar el trabajo en tres niveles organizativos:

1. **Espacios de Trabajo (Workspaces):** Contenedores superiores que agrupan proyectos afines por departamento o area de negocio, identificados con un prefijo de ticket unico entre corchetes (por ejemplo, [CLI] o [DEV]).
2. **Proyectos:** Unidades especificas de ejecucion dentro de un espacio, asociadas a entregables o clientes, identificadas con un color representativo.
3. **Requerimientos y Tareas:** Fichas de trabajo operativas que representan actividades tecnicas, entregables, bugs o reuniones sincronicas con codigo de seguimiento alfanumerico (como TK-101 o MTG-202).

## Requisitos y perfiles
- **Modulo requerido:** El modulo de tareas debe estar activo en la suscripcion de la empresa.
- **Acceso requerido:**
  - Para consultar requerimientos, tableros y metricas: Se requiere autorizacion de lectura en tareas operativas.
  - Para crear o editar tareas, proyectos y espacios: Se requiere autorizacion de gestion operativa.
- **Diferencia con el portal:** Esta guia describe la interfaz central del panel de administracion. Los colaboradores externos que acceden mediante enlace privado operan en una pantalla adaptada a sus requerimientos asignados.

## Ubicacion en pantalla
- **Menu lateral:** Seccion **Operaciones** -> opcion **Tareas**.
- **Ruta de acceso:** `/operations/tasks`.

## Navegacion y vistas disponibles
La barra superior del modulo permite alternar entre seis modos de visualizacion especializados:

1. **Lista:** Vista en tabla que presenta el listado completo de tareas con columnas de codigo, titulo, proyecto, responsable, prioridad, fecha limite, notas rapidas privadas y casillas de seleccion multiple.
2. **Tablero (Kanban):** Columnas de flujo agil que organizan los requerimientos segun su estado de avance: *Backlog*, *Por hacer*, *En curso*, *En revision (QA)*, *Completada* y *Bloqueada*. Permite mover tarjetas arrastrandolas entre columnas.
3. **Calendario:** Grilla de planificacion mensual y semanal que distribuye las fechas de vencimiento de las tareas y los horarios programados de las reuniones.
4. **Ritmo (Pacing):** Matriz ejecutiva de cuatro semanas que contrasta las horas planificadas frente a las horas ejecutadas y permite exportar un informe de avance en formato descargable.
5. **Metricas:** Panel de telemetria operativa que muestra la salud del ciclo actual, velocidad del equipo, distribucion de carga por colaborador y tasa de tareas finalizadas.
6. **Colaboradores:** Directorio de gestion de personal operativo, generacion de enlaces de portal externo, configuracion de codigos de seguridad PIN y asignacion de herramientas tecnicas.

## Filtros de alcance y busqueda
- **Selector de Espacios y Proyectos:** Menu desplegable ubicado en la barra superior que permite filtrar simultaneamente todo el modulo por un espacio completo o por un proyecto individual. Cuenta con un icono de lapiz para editar las propiedades del elemento seleccionado.
- **Barra de busqueda:** Permite localizar requerimientos en tiempo real ingresando palabras clave del titulo, nombre del colaborador asignado o el codigo exacto del ticket (por ejemplo, TK-45).
- **Selector de estados:** Filtros rapidos para aislar requerimientos en Backlog, tareas activas (con desglose por estado) o tareas completadas.
- **Conmutador de reuniones:** Boton interactivo para alternar entre la visualizacion de requerimientos de trabajo y las sesiones sincronicas de reunion.

## Menu de creacion central (+ Nuevo)
El boton principal desplegable **Nuevo** ofrece acceso directo a la creacion de todos los elementos del modulo:
- **Nueva Tarea:** Abre el formulario de requerimientos tecnicos para asignar plazos, estimacion de horas y lista de verificacion.
- **Nueva Reunion / Actividad:** Abre el asistente de sesiones sincronicas con control de asistencia, enlace de videollamada y calculo automatico de tiempos.
- **Nuevo Sprint:** Abre el configurador de ciclos de trabajo agiles con fechas de inicio, cierre y metas.
- **Nuevo Proyecto:** Permite registrar un contenedor operativo con nombre, codigo de color y vinculacion a un espacio de trabajo.
- **Nuevo Espacio:** Permite crear una nueva division organizativa con clave de prefijo para numeracion de tickets.
- **Importar Datos / Tareas:** Asistente de carga masiva para incorporar requerimientos desde archivos estructurados en formato JSON, tablas CSV o exportaciones de Jira.

## Acciones en grupo en la vista de lista
1. Accede a la pestana **Lista**.
2. Marca las casillas de seleccion de los requerimientos que deseas procesar.
3. En la barra flotante inferior podras revisar el conteo de elementos seleccionados o ejecutar la eliminacion permanente en grupo si cuentas con autorizacion de gestion en la organizacion.

## Resultado esperado
Comprension global de la organizacion del trabajo, capacidad de localizar cualquier entregable mediante filtros cruzados y seleccion del modo de visualizacion optimo para cada fase del proyecto.

## Limites conocidos
- El tablero Kanban oculta las reuniones programadas para centrarse en el flujo de entregables tecnicos; para visualizar reuniones se debe utilizar la vista de lista o el calendario.
- La eliminacion en lote desde la barra flotante borra las tareas seleccionadas de manera definitiva sin enviarlas a una papelera temporal.

## Notas de verificacion
- Verificado contra TasksPage en src/app/(dashboard)/operations/tasks/page.tsx lineas 19-58.
- Componente principal verificado en src/modules/features/tasks/components/task-manager-view.tsx lineas 313-400 y 970-1340.
- Auditoria de permisos: La vista requiere el permiso canonico operations.tasks.view; las acciones de mutacion requieren operations.tasks.manage.
- Rectificacion editorial: La guia antigua afirmaba que la eliminacion masiva dependia de un permiso IAM canónico denominado can_bulk_delete_tasks. El codigo real demuestra que can_bulk_delete_tasks es una columna en organization_staff exclusiva del portal de colaboradores; en el dashboard la eliminacion en lote se canaliza mediante la accion deleteTasks condicionada a la pertenencia de la organizacion y autorizacion de gestion.
