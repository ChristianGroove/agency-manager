# Documento de Traspaso Técnico y Editorial: Biblioteca del Portal Tasks

**Entrega preparatoria para integración y equipo de arquitectura (Codex)**  
**Fecha:** 2026-10-12  
**Superficie objetivo:** `portal.tasks`  
**Audiencia objetivo:** `portal-collaborator`  
**Rama de trabajo:** `pixyrobotpet` en `G:\Pixy\agency-manager\tmp\pet-workspace`  
**Revisión de código fuente (Git HEAD):** `5aaeec98767f13ec9b495eed33486fcdba65ab86`  
**Directorio de trabajo exclusivo:** `docs/1-product/help-library/portal-preparation/tasks/`  

---

## 1. Naturaleza y Propósito de la Entrega

Este documento formaliza el cierre y traspaso de la biblioteca de ayuda editorial y la matriz funcional de capacidades para el portal de colaboradores de Tasks (`/portal/tasks/[token]`).

### Declaraciones de Cumplimiento de Restricciones
- **No modificación de código:** No se alteró ninguna línea de código funcional en `src/` ni en configuraciones de la aplicación.
- **No alteración de Git:** No se ejecutaron commits, stages ni pushes en el repositorio.
- **Aislamiento editorial:** No se ejecutó `npm run help:publish` ni se intentaron forzar las guías a través del publicador vigente del dashboard (`docs/1-product/help-library/drafts/`), ya que el pipeline actual solo admite la superficie `dashboard` y la audiencia `tenant-user`. Toda la documentación se redactó de forma aislada en el directorio preparatorio para que Codex defina el contrato de esquema V2.
- **Sin certificación ficticia:** La validación realizada es estrictamente estática de código fuente (`verification: source-only`). No se certifica navegación en navegador ni comportamiento dinámico del modelo de IA con una comprobación estática de archivos.

---

## 2. Manifiesto de Entregables Generados

La biblioteca preparatoria en `docs/1-product/help-library/portal-preparation/tasks/` consta de 6 componentes estructurales:

| Archivo / Carpeta | Tipo | Contenido y Alcance |
|---|---|---|
| `inventory.json` | JSON Schema | Catálogo exhaustivo de **13 vistas y modales** (incluyendo vistas operativas, modales de detalle, notas rápidas, tableros Kanban, calendarios y la vista compacta retirada) y **18 Server Actions** con sus rutas, símbolos y pruebas manuales pendientes. |
| `capability-matrix.json` | JSON Schema | Matriz funcional que define la taxonomía de **4 perfiles** (`pm_lead`, `qa_specialist`, `standard_collaborator`, `parallel_support`), **4 capacidades técnicas** (`vcs_code`, `design_preview`, `monitoring`, `finance_costs`) y **15 capacidades operativas**, detallando cómo se decide la visibilidad en UI vs la autorización real en backend con referencias `archivo#lineas`. |
| `articles/*.md` | Markdown + YAML | Colección de **18 artículos de ayuda** orientados a tareas homogéneas con metadatos preparatorios (`surface: portal.tasks`, `audience: portal-collaborator`, `status: draft`, `source_revision: 5aaeec98...`, fecha `2026-10-12`), pasos reales, requisitos, ubicación, resultados, límites y evidencias por afirmación. |
| `questions.json` | JSON Schema | Batería de **70 casos de evaluación** exhaustivos para la IA del portal: **47 casos de respuesta (`answer`)**, **12 casos de aclaración (`clarify`)** y **11 casos de abstención (`abstain`)**. Incluye consultas con contexto de vista, perfiles, seguimiento, desvíos hacia módulos ajenos (CRM, facturación, nómina, Cartera, superadmin), puntos obligatorios y afirmaciones prohibidas. |
| `gaps.md` | Markdown | Informe técnico exhaustivo que documenta **8 contradicciones críticas** entre los controles visibles de la UI y la autorización real del servidor en `collaborator-portal-actions.ts`, con análisis de código y recomendaciones de mitigación. |
| `handoff.md` | Markdown | Este documento de traspaso y especificación de pruebas para Codex y el usuario. |

---

## 3. Catálogo de Artículos Elaborados (18 Guías)

Todos los artículos se encuentran ubicados en `docs/1-product/help-library/portal-preparation/tasks/articles/`:

1. `tasks-portal.access-and-pin.md`: Acceso mediante enlace privado y configuración de protección con código PIN de 6 dígitos.
2. `tasks-portal.view-modes-and-filters.md`: Navegación entre vistas (Lista, Cuadrícula, Kanban, Calendario), filtros de búsqueda y workspaces.
3. `tasks-portal.task-progress-and-slider.md`: Uso del control deslizante de porcentaje de avance (0% a 100%), auditoría de progresos y topes por subtareas.
4. `tasks-portal.task-lifecycle-and-status.md`: Flujo de estados técnicos (Backlog, Por hacer, En progreso, En revisión, Bloqueada, Completada) y sellado terminal.
5. `tasks-portal.subtasks-checklist.md`: Gestión de lista de chequeo de entregables, avance proporcional y reglas de asignación propia.
6. `tasks-portal.comments-and-mentions.md`: Comunicación en la bitácora de la tarea, menciones inteligentes `@nombre` y trazabilidad.
7. `tasks-portal.attachments-and-files.md`: Subida, previsualización y eliminación de archivos y documentación adjunta.
8. `tasks-portal.worklog-and-hours.md`: Registro de tiempo invertido (horas ejecutadas), imputación a subtareas y gobernanza de horas.
9. `tasks-portal.quick-notes.md`: Bloc personal de notas rápidas adhesivas privadas por colaborador.
10. `tasks-portal.create-task-collaborator.md`: Registro de nuevos requerimientos por colaboradores operativos bajo gobernanza de Backlog.
11. `tasks-portal.create-task-pm.md`: Creación avanzada de tareas, asignación directa de plazos contractuales, horas y QA por Project Managers.
12. `tasks-portal.meetings-and-meet.md`: Programación de actividades sincrónicas, generación automática de enlaces Google Meet y registro de minutas.
13. `tasks-portal.qa-review-flow.md`: Protocolo de aseguramiento de calidad, auditoría de criterios de aceptación, aprobación y reapertura con bugs.
14. `tasks-portal.pm-operations-dashboard.md`: Panel de telemetría operativa para PMs: métricas de salud, sprints y distribución de carga.
15. `tasks-portal.pm-weekly-pacing.md`: Matriz de ritmo semanal de 4 semanas, estados de cumplimiento y exportación a PDF ejecutivo.
16. `tasks-portal.parallel-support-portal.md`: Operación del portal de soporte paralelo, emisión de tickets SUP y triaje con desarrollo.
17. `tasks-portal.bulk-actions.md`: Selección múltiple de requerimientos, cambio masivo de estados y eliminación en lote protegida.
18. `tasks-portal.technical-capabilities.md`: Capacidades técnicas condicionales: inspección de ramas Git (VCS), prototipos Figma y costos financieros.

---

## 4. Fuentes de Código Auditadas

La elaboración de los entregables se basó en el análisis estricto de las siguientes fuentes en la revisión `5aaeec98767f13ec9b495eed33486fcdba65ab86`:

| Archivo de Código Fuente | Símbolos / Funciones Clave Verificadas |
|---|---|
| `src/app/(public)/portal/tasks/[token]/page.tsx` | `TaskCollaboratorPortalPage`, resolución inicial de token y montaje de componentes de seguridad. |
| `src/modules/features/tasks/actions/collaborator-portal-actions.ts` | `getCollaboratorPortalData`, `portalUpdateTaskStatus`, `portalUpdateTaskProgress`, `portalToggleChecklist`, `portalAddTaskComment`, `portalUploadTaskAttachment`, `portalCreateTask`, `portalUpdateTaskQuickNote`, `portalBulkDeleteTasks`, `portalDeleteTask`, `portalUpdateTaskPriority`, `portalAssignTask`, `portalCompleteMeetingSession`, `portalSaveTaskWeeklySnapshot`. |
| `src/modules/features/portal-security/actions/portal-security-actions.ts` | `verifyPortalPinAction`, `setupPortalPinAction`, `removePortalPinAction`, `lockPortalSessionAction`. |
| `src/modules/features/portal-security/components/portal-lockscreen.tsx` | `PortalLockscreen`, teclado numérico, gestión de PIN de 6 dígitos y opción "Recordar en este dispositivo". |
| `src/modules/features/portal-security/utils/session-cookie.ts` | `verifyPortalSessionToken`, `buildPortalSessionToken`, `isPortalSessionUnlocked`, firma con HMAC SHA-256. |
| `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx` | `TaskCollaboratorPortal`, ribbon de filtros, alternador `ViewToggle`, barras de búsqueda, renderizadores de vistas. |
| `src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx` | `TaskPortalDetailModal`, pestañas de gestión, sliders, checklist, panel de comentarios y chips de estado. |
| `src/modules/features/tasks/components/portal/task-pm-operations-dashboard.tsx` | `TaskPmOperationsDashboard`, métricas Recharts, distribución de carga y salud de sprint. |
| `src/modules/features/tasks/components/portal/task-parallel-support-portal.tsx` | `TaskParallelSupportPortal`, vista operativa dedicada a tickets de soporte. |
| `src/modules/features/tasks/components/portal/task-support-channel-view.tsx` | `TaskSupportChannelView`, triaje y supervisión de incidencias para líderes técnicos. |
| `src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx` | `TaskWeeklyPacingMatrix`, cuadrícula de 4 semanas de entregables y botón de exportación PDF. |
| `src/modules/features/tasks/components/calendar/task-calendar-view.tsx` | `TaskCalendarView`, grilla mensual y semanal de eventos y plazos de entrega. |
| `src/modules/features/tasks/types.ts` | Definiciones de tipos `TaskItem`, `TaskStatus`, `TaskPriority`, `TaskChecklistItem`, `TaskCollaboratorPortalData`, `CollaboratorCapabilities`. |
| `src/modules/features/tasks/types/vcs.ts` | `generateGitBranchName`, `TaskVcsContainer`. |
| `src/modules/features/tasks/utils/task-comment-utils.ts` | `renderFormattedComment`, `parseProgressAudit`, renderizado de menciones y auditorías. |
| `src/modules/features/integrations/google/google-calendar-service.ts` | `createGoogleCalendarMeetingEvent`, `deleteGoogleCalendarMeetingEvent`. |

---

## 5. Matriz de Cobertura por Variante y Perfil

| Perfil / Variante | Vistas Disponibles | Acciones Permitidas | Artículos de Cobertura |
|---|---|---|---|
| **Colaborador Estándar** (`developer`, `designer`, `specialist`) | Portal Operativo, Detalle de Tarea, Kanban, Lista, Cards, Calendario, Bloc de Notas Rápidas. | Actualizar progreso, marcar subtareas propias, comentar, adjuntar archivos, crear tareas (forzadas a Backlog, 0h y sin plazo), bloquear pantalla con PIN. | `access-and-pin`, `view-modes-and-filters`, `task-progress-and-slider`, `task-lifecycle-and-status`, `subtasks-checklist`, `comments-and-mentions`, `attachments-and-files`, `worklog-and-hours`, `quick-notes`, `create-task-collaborator`, `meetings-and-meet`, `technical-capabilities`. |
| **Project Manager / Líder** (`pm_lead`) | Todo lo anterior más: Dashboard PM, Matriz de Pacing Semanal, Canal de Supervisión de Soporte, Modales de Sprint y Creación Avanzada. | Reasignación de responsables, fijación de prioridades, definición de horas contractuales y plazos límite, aprobación desde Backlog, reapertura de tareas selladas, eliminación individual y en lote. | Todo lo del colaborador más: `create-task-pm`, `pm-operations-dashboard`, `pm-weekly-pacing`, `bulk-actions`. |
| **Especialista QA** (`qa_specialist`) | Portal Operativo con filtros de tareas en estado `in_review`. | Aprobación de requerimientos a `done` tras verificación de criterios de aceptación; rechazo a `in_progress` con documentación obligatoria de fallos en comentarios. | Todo lo del colaborador más: `qa-review-flow`. |
| **Colaborador de Soporte** (`parallel_support`) | Portal dedicado de Soporte Paralelo (`portalMode === 'support'`). | Emisión de tickets de soporte con prefijo automático `SUP`, consulta de menciones y seguimiento de resolución técnica por desarrollo. | `parallel-support-portal`, `access-and-pin`, `comments-and-mentions`, `attachments-and-files`, `quick-notes`. |

---

## 6. Comprobaciones Reales Ejecutadas

Durante la preparación de esta entrega se ejecutaron las siguientes validaciones automatizadas y comprobaciones estáticas de consistencia:

1. **Validación de Archivos y Metadatos de Artículos:**
   - Se verificaron los 18 archivos en `articles/*.md`.
   - El 100% de los archivos contiene el campo `id:` coincidente con el nombre base del archivo (`tasks-portal.<tema>`).
   - Todos cuentan con los campos `surface: portal.tasks`, `audience: portal-collaborator`, `status: draft`, `verification: source-only` y `source_revision: 5aaeec98767f13ec9b495eed33486fcdba65ab86`.
2. **Consistencia de Referencias Cruzadas (`questions.json` -> `articles`):**
   - Se validaron las 70 preguntas frente a la lista de artículos generados.
   - No existe ninguna referencia rota (`missingGuides.Count === 0`).
3. **Distribución Exacta de Casos de Prueba en `questions.json`:**
   - Casos clasificados como respuesta directa (`answer`): **47**
   - Casos clasificados como solicitud de aclaración (`clarify`): **12**
   - Casos clasificados como abstención fuera de alcance (`abstain`): **11**
   - **Total de casos:** **70** (Conteo exacto verificado programáticamente).
4. **Verificación de Ausencia de Modificaciones en Código:**
   - Se comprobó mediante inspección del árbol de trabajo que ningún archivo en `src/`, `package.json`, configuraciones o base de datos fue alterado.

---

## 7. Pruebas Manuales Pendientes Recomendadas para Codex y el Usuario

Dado que esta entrega es editorial y estática, las siguientes pruebas funcionales en entorno activo deben ser realizadas por el equipo técnico y el usuario:

1. **Prueba de Seguridad de PIN y Cookie HttpOnly:**
   - Acceder a `/portal/tasks/[token]` de un colaborador con PIN activo.
   - Verificar que `PortalLockscreen` bloquea completamente la carga de proyectos y tareas hasta ingresar los 6 dígitos correctos.
   - Marcar la opción "Recordar en este dispositivo" y verificar que la cookie `pixy_portal_session` persiste y evita solicitar el PIN en recargas posteriores.
2. **Prueba de Aislamiento de Workspaces:**
   - Probar con un colaborador que tenga `has_global_workspace_access: false` y verificar que solo aparezcan en el filtro los proyectos asociados a sus workspaces autorizados.
3. **Prueba del Límite de Subtareas en Avance:**
   - En una tarea con 3 subtareas (1 pendiente), intentar deslizar el slider al 100% o cambiar el estado a "Completada".
   - Comprobar que el backend clampa el progreso al 95% y mantiene el estado en `in_review`.
4. **Prueba de Bloqueo de Tareas Selladas:**
   - Con un usuario colaborador estándar, intentar añadir horas o desmarcar una subtarea en una tarea con estado `done`.
   - Confirmar que la interfaz mantiene los campos deshabilitados y que el backend rechaza la acción con error de requerimiento sellado.
5. **Prueba de Autogeneración de Google Meet:**
   - Crear una reunión con modalidad virtual y switch de Meet activado desde un usuario sin `user_id` de Supabase Auth.
   - Verificar si la acción arroja un mensaje de error legible invitando a agregar el enlace manualmente.
6. **Prueba de Portal de Soporte Paralelo:**
   - Iniciar sesión con un colaborador cuyo `task_role` sea `support`.
   - Verificar que carga `TaskParallelSupportPortal` y que los tickets emitidos se marcan con `origin_type: 'support'` y código `SUP-###`.
7. **Prueba de Permiso de Eliminación en Masa:**
   - Verificar que un usuario con `can_bulk_delete_tasks: true` pero sin rol de PM puede marcar varias tareas y eliminarlas desde la barra inferior de acciones masivas.

---

## 8. Próximos Pasos para Integración (Codex)

1. **Definición de Esquema V2 en el Publicador:**
   - Actualizar el validador `help:validate` y `help:publish` para que soporte de manera nativa la superficie `portal.tasks` y la audiencia `portal-collaborator`.
2. **Subsanación de Gaps de Seguridad (Backend):**
   - Incluir la verificación `isStaffLeadOrPmRole` en `portalUpdateTaskPriority` y `portalAssignTask` para evitar manipulaciones directas mediante peticiones POST forjadas.
3. **Montaje del Asistente Virtual en el Portal:**
   - Integrar el widget del bot de ayuda en `TaskCollaboratorPortalPage`, consumiendo exclusivamente el corpus de guías filtrado para la superficie `portal.tasks` y validado contra `capability-matrix.json`.
