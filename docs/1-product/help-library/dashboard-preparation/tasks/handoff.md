# Documento de Traspaso Tecnico y Editorial: Modulo de Tareas en el Dashboard

**Entrega para integracion, evaluacion y equipo de arquitectura (Codex)**  
**Fecha:** 2026-10-12  
**Superficie objetivo:** `dashboard`  
**Ruta auditada:** `/operations/tasks`  
**Rama de trabajo:** `pixyrobotpet` en `G:\Pixy\agency-manager\tmp\pet-workspace`  
**Revision base de codigo fuente (Git HEAD):** `5aaeec98767f13ec9b495eed33486fcdba65ab86`  
**Directorio de trabajo exclusivo:** `docs/1-product/help-library/dashboard-preparation/tasks/`  

---

## 1. Alcance y Objetivos Cumplidos

Esta entrega responde puntualmente al encargo editorial para el modulo de Tareas en el dashboard:

1. **Primera Prioridad - Reuniones en el Dashboard:**
   - Se audito e implemento la guia integral [**`tasks.meetings-and-calendar.md`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.meetings-and-calendar.md).
   - Documenta la programacion mediante `TaskMeetingModal`, modalidades (virtual, presencial, hibrida), convocatoria de participantes con el boton rapido *Convocar a todos*, imputacion de horas, recurrencia configurable (dias semanales, intervalos), conector OAuth de Google Meet (`TaskGoogleMeetConnector`), consola interactiva de asistencia (`TaskMeetingConsole` en `TaskMeetingDetailModal`), minutas en comentarios y cierre de sesion con computo de horas en bitacora.
   - Resuelve directamente la consulta real probada por el usuario desde Movilservicios: *«¿Como crear una reunion?»*.

2. **Segunda Prioridad - Navegacion y Alcance de Tareas en el Dashboard:**
   - Se redacto la propuesta de actualizacion de [**`tasks.manage-tasks.md`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.manage-tasks.md), corrigiendo los errores conceptuales de la guia anterior (eliminando la falsa atribucion de la clave IAM `can_bulk_delete_tasks`).
   - Explica la jerarquia completa: Espacios de Trabajo (Workspaces con prefijo alfanumerico `[KEY]`), Proyectos (con codigo de color) y Requerimientos (tickets).
   - Detalla las seis vistas operativas del modulo: Lista, Tablero Kanban, Calendario, Ritmo (Pacing), Metricas y Colaboradores.
   - Resuelve la segunda consulta real del usuario: *«¿Sabes algo del modulo tareas?»*.

3. **Guias Especializadas Complementarias:**
   - [**`tasks.task-lifecycle-and-views.md`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.task-lifecycle-and-views.md): Flujo de estados (Backlog, Todo, In Progress, In Review, Done, Blocked), obligatoriedad de `blockedReason`, dependencias con desbloqueo automatico de sucesoras y tope al 95% por entregables incompletos.
   - [**`tasks.collaborators-and-portals.md`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.collaborators-and-portals.md): Directorio de personal en `organization_staff`, emision y regeneracion de enlaces de portal privado (`/portal/tasks/[token]`), seguridad de PIN de 6 digitos, blanqueo/reseteo y asignacion granular de capacidades tecnicas (`vcs_code`, `design_preview`, `monitoring`).
   - [**`tasks.sprint-planning-and-pacing.md`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.sprint-planning-and-pacing.md): Creacion, activacion y cierre de Sprints con traspaso de tareas pendientes, matriz de ritmo semanal de 4 semanas, exportacion de informes PDF y panel de metricas de velocidad.
   - [**`tasks.import-data.md`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.import-data.md): Carga masiva de requerimientos mediante Pixy Universal Bundle (JSON), tablas CSV y exportaciones de Jira.

4. **Sin Afectacion de Otros Modulos ni Entregas:**
   - El trabajo se realizo exclusivamente dentro de `dashboard-preparation/tasks/`.
   - No se alteraron los borradores del portal en `drafts/articles/tasks-portal.*` ni se modifico codigo fuente, configuraciones, migraciones, base de datos ni `published.json`.

---

## 2. Manifiesto de Entregables Generados

Todos los archivos residen bajo `docs/1-product/help-library/dashboard-preparation/tasks/`:

| Archivo | Descripcion y Contenido |
|---|---|
| `inventory.json` | Inventario de 17 componentes de interfaz (vistas, modales, barras y conmutadores) y 8 Server Actions auditadas con rutas y simbolos exactos. |
| `capability-matrix.json` | Matriz de 7 capacidades funcionales que relaciona permisos IAM canonicos (`operations.tasks.view`, `operations.tasks.manage`), condiciones por registro y diferencias operativas frente al portal. |
| `articles/*.md` | Coleccion de 6 borradores compatibles con `draftSchema` (`surface: dashboard`, `audience: tenant-user`, `verification: source-only`), con lenguaje natural en requisitos y notas de verificacion tecnicas. |
| `questions.json` | Banco de 55 casos de evaluacion estructurados (35 de respuesta directa, 10 de aclaracion y 10 de abstencion) con puntos obligatorios y afirmaciones prohibidas. |
| `publication-proposal.json` | Propuesta parcial de revision con hashes SHA-256 UTF-8 exactos de borradores y archivos de evidencia reales en disco, permisos canonicos y ruta de enlace `/operations/tasks`. |
| `gaps.md` | Analisis tecnico de 5 discrepancias criticas entre UI, backend y documentacion previa (GAP-D01 a GAP-D05). |
| `handoff.md` | Este documento de especificacion y traspaso para Codex y el usuario. |

---

## 3. Resultados de la Evaluacion Fuera de Linea

Se ejecuto la simulacion del motor lexico oficial (`retrieval.ts`) utilizando el perfil de acceso del dashboard:

| Metrica | Valor Obtenido | Estado |
|---|---|---|
| **Total de Preguntas Evaluadas** | 55 | 100% cubierto |
| **Casos de Respuesta (`answer`)** | 35 | 35 evaluados |
| **Aciertos de Recuperacion (`retrieval_hits`)** | **35** | **100% de aciertos** |
| **Fallos de Recuperacion (`retrieval_misses`)** | **0** | **0 fallos** |
| **Casos de Aclaracion (`clarify`)** | 10 | Preservados como categoria independiente |
| **Casos de Abstencion (`abstain`)** | 10 | Preservados como categoria independiente |

### Comprobacion de las preguntas reales del usuario
1. *«¿Como crear una reunion?»* (`q.dashboard.tasks.001`) -> Recupera [**`tasks.meetings-and-calendar`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.meetings-and-calendar.md) como primer resultado relevante.
2. *«¿Sabes algo del modulo tareas?»* (`q.dashboard.tasks.002`) -> Recupera [**`tasks.manage-tasks`**](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/dashboard-preparation/tasks/articles/tasks.manage-tasks.md) como primer resultado relevante.

---

## 4. Validacion Tecnica y Cumplimiento de Contratos

- **`draftSchema`:** Los 6 articulos cumplen las restricciones de tamano, ausencia de etiquetas YAML prohibidas (`&`, `*`, `!`), ausencia de HTML, enlaces y formato de rutas.
- **Evidencias estaticas:** El 100% de los simbolos declarados (`TasksPage`, `TaskManagerView`, `TaskMeetingModal`, `TaskMeetingDetailModal`, `TaskMeetingConsole`, `TaskGoogleMeetConnector`, `createTask`, `TaskKanbanBoard`, `TaskListView`, `TaskDetailModal`, `updateTaskStatus`, `TaskCollaboratorsManager`, `setupPortalPinAction`, `resolveCollaboratorCapabilities`, `TaskSprintModal`, `TaskWeeklyPacingMatrix`, `TaskMetricsView`, `getSprints`, `TaskImportModal`, `executeUniversalImport`) fueron verificados literalmente en sus respectivos archivos fuente.
- **`reviewSchema`:** La propuesta en `publication-proposal.json` cumple la estructura estricta del contrato de revision de Zod, sin incluir filtros indebidos de portal (`portal_profiles`, `required_portal_capabilities`) que romperian la validacion en la superficie `dashboard`.

---

## 5. Instrucciones de Integracion para Codex

1. **Fusion de Snapshot:**
   - Codex debe tomar el snapshot global mas reciente (`docs/1-product/help-library/reviews/tasks-portal-reviewed-final-20261012.json`).
   - Sustituir la entrada existente de `tasks.manage-tasks` por la nueva revision declarada en `publication-proposal.json`.
   - Incorporar las 5 nuevas entradas (`tasks.meetings-and-calendar`, `tasks.task-lifecycle-and-views`, `tasks.collaborators-and-portals`, `tasks.sprint-planning-and-pacing`, `tasks.import-data`).
   - Mover o sincronizar los 6 archivos Markdown hacia `docs/1-product/help-library/drafts/articles/`.
2. **Publicacion y Build:**
   - Ejecutar la publicacion formal del snapshot combinado:
     ```bash
     npm run help:publish -- docs/1-product/help-library/reviews/<nuevo-snapshot-global>.json
     ```
   - Compilar el proyecto para que `published.json` sea importado en el build de Next.js:
     ```bash
     npm run check:build
     ```

---

## 6. Pruebas Manuales Recomendadas para el Usuario en el Navegador

Una vez compilado el piloto en `http://127.0.0.1:3005`:

1. **Pregunta de creacion de reunion:** Abrir el chat del robot Pixy en el dashboard y escribir: *«¿Como crear una reunion?»*. Verificar que responde con el procedimiento guiado de `TaskMeetingModal`, mencionando Google Meet y convocatoria de participantes.
2. **Pregunta de alcance del modulo:** Escribir en el chat: *«¿Sabes algo del modulo tareas?»*. Verificar que explica con precision que es TaskFlow, los Espacios de Trabajo, Proyectos y las seis vistas del panel.
3. **Flujo de creacion de reunion en UI:** Ir a `/operations/tasks`, presionar `Nuevo` -> `Nueva Reunion / Actividad`, seleccionar un proyecto, verificar la conexion de Google Meet y programar la sesion.
4. **Consola de asistencia:** Abrir la reunion creada y comprobar el boton de acceso a la videollamada y los controles de asistencia.
5. **Eliminacion en lote:** Ir a la pestana Lista, marcar casillas y comprobar que la barra flotante de eliminacion masiva responde adecuadamente.
