# Registro de Gaps Tecnicos, Asimetrias de Autorizacion y Contradicciones: Tasks en el Dashboard

**Documento preparatorio de ingenieria y biblioteca editorial**  
**Fecha:** 2026-10-12  
**Superficie:** `dashboard`  
**Ruta auditada:** `/operations/tasks`  
**Revision de codigo fuente (Git HEAD):** `5aaeec98767f13ec9b495eed33486fcdba65ab86`  
**Ubicacion:** `docs/1-product/help-library/dashboard-preparation/tasks/gaps.md`

---

## 1. Resumen Ejecutivo

Durante la auditoria estricta de codigo fuente de la ruta del panel de administracion `/operations/tasks`, sus vistas (`TaskManagerView`, `TaskListView`, `TaskKanbanBoard`, `TaskCalendarView`, `TaskWeeklyPacingMatrix`, `TaskMetricsView`, `TaskCollaboratorsManager`), los modales asociados (`TaskMeetingModal`, `TaskMeetingDetailModal`, `TaskDetailModal`, `TaskSprintModal`, `TaskImportModal`) y las acciones de servidor (`task-actions.ts`, `task-sprint-actions.ts`, `task-import-actions.ts`), se identificaron varias discrepancias relevantes entre las afirmaciones de la documentacion previa, la interfaz grafica (UI) y la autorizacion real del backend.

Este informe documenta con exactitud de linea y simbolo las contradicciones detectadas, el comportamiento observado y su resolucion editorial en la nueva biblioteca.

---

## 2. Matriz de Gaps y Asimetrias Detectadas

| ID | Hallazgo / Funcion | Comportamiento en UI (Dashboard) | Autorizacion en Servidor (Backend) | Severidad | Impacto Editorial |
|---|---|---|---|---|---|
| **GAP-D01** | Eliminacion Masiva vs Clave IAM Inexistente | Barra flotante `BulkActionsFloatingBar` visible en lista; la guia antigua afirmaba que requeria permiso IAM `can_bulk_delete_tasks` | `deleteTasks` en `task-actions.ts` **no valida** `can_bulk_delete_tasks` ni rol IAM; solo comprueba `resolveOrgId`. `can_bulk_delete_tasks` es un flag de base de datos exclusivo del portal. | **Alta (Seguridad y Concepto)** | Se rectifico la guia antigua en `tasks.manage-tasks.md`. En el cuerpo publico se usan requisitos en lenguaje natural. Se separa el flag de colaborador del permiso IAM canonico `operations.tasks.manage`. |
| **GAP-D02** | Autogeneracion de Google Meet (Dashboard vs Portal) | Switch visible en `TaskMeetingModal` y conector `TaskGoogleMeetConnector` con OAuth | `createTask` resuelve `supabase.auth.getUser()`. En el dashboard siempre hay `user.id` valido; en el portal falla silenciosamente si el colaborador es externo (`user_id === null`). | **Media (Operativa)** | Se documento en `tasks.meetings-and-calendar.md` que la generacion automatica utiliza la integracion del usuario de la sesion, y que el ingreso de enlaces manuales es el camino alternativo universal. |
| **GAP-D03** | Desvio Silencioso de 'Completada' por Subtareas Pendientes | Usuario arrastra a columna *Completada* o selecciona *Done* en modal | `updateTaskStatus` intercepta transiciones a `done` si hay subtareas incompletas y clampa el avance a 95% desviando a `in_review`. | **Media (UX)** | Se explica explora y explicitamente en `tasks.task-lifecycle-and-views.md` que para alcanzar 100% todos los entregables del checklist deben estar verificados. |
| **GAP-D04** | Motivo Obligatorio al Bloquear Tarea | Al mover a *Bloqueada*, la UI solicita justificacion | `updateTaskStatus` rechaza o descarta el bloqueo si no se proporciona `blocked_reason`, registrandolo en la bitacora de auditoria. | **Baja (UX)** | Se instruye que bloquear una tarea exige registrar la causa tecnica del impedimento. |
| **GAP-D05** | Kanban Desacoplado de Reuniones | El conmutador de reuniones se deshabilita o cambia a lista si se activa en Kanban | `task-manager-view.tsx#L1209` fuerza `setActiveTab("list")` al activar `includeMeetings`. | **Baja (Diseno)** | Se aclara que el Kanban se reserva a entregables tecnicos y que las reuniones se gestionan en Lista o Calendario. |

---

## 3. Analisis Quirurgico Detallado por Gap

### GAP-D01: Inexistencia de `can_bulk_delete_tasks` como Clave IAM y Asimetria Dashboard vs Portal
- **Archivos y lineas de evidencia:**
  - Guia historica: `docs/1-product/help-library/drafts/articles/tasks.manage-tasks.md#L46` (*"Eliminación masiva en lote: Permiso can_bulk_delete_tasks"*).
  - Permisos IAM canonicos: `src/modules/core/iam/actions/permissions.ts#L39-L40` (`operations.tasks.view`, `operations.tasks.manage`).
  - Accion backend dashboard: `src/modules/features/tasks/actions/task-actions.ts#L1960-L2015` (`deleteTasks`).
  - Accion backend portal: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L2852-L2882` (`portalBulkDeleteTasks`).
- **Analisis de codigo:**
  ```typescript
  // task-actions.ts (Dashboard) - L1960-L1970
  export async function deleteTasks(taskIds: string[], orgId?: string) {
    if (!taskIds || taskIds.length === 0) return { success: true, count: 0 };
    const activeOrgId = await resolveOrgId(orgId);
    // ... Procede a eliminar directamente en task_items sin comprobar rol ni flag ...
  }
  ```
  En contraste, en el portal:
  ```typescript
  // collaborator-portal-actions.ts (Portal) - L2873-L2881
  const isLead = isStaffLeadOrPmRole(staff.role, (staff as any).task_role);
  const hasPermission = staff.can_bulk_delete_tasks !== null ? Boolean(staff.can_bulk_delete_tasks) : isLead;
  if (!hasPermission) return { success: false, error: "No tienes permiso para eliminar tareas en masa" };
  ```
- **Problema:** La guia antigua del dashboard atribuia la eliminacion masiva a una supuesta clave IAM denominada `can_bulk_delete_tasks`. Dicha clave no existe en el catalogo de permisos IAM del sistema (`PERMISSIONS.OPERATIONS`). En base de datos, `can_bulk_delete_tasks` es una columna booleana en la tabla `organization_staff`, concebida para gobernar a colaboradores en el portal externo, pero inerte en las acciones del panel de administracion. Ademas, la Server Action `deleteTasks` en el backend no valida si el usuario del dashboard tiene el permiso `operations.tasks.manage`.
- **Decision editorial:**
  1. En la propuesta de actualizacion de `tasks.manage-tasks.md`, se elimino por completo la mencion a `can_bulk_delete_tasks`.
  2. En el cuerpo publico se adopto lenguaje natural: *"si cuentas con autorizacion para eliminar tareas en grupo en la vista de lista"*.
  3. En la matriz de capacidades se registro la discrepancia para que el equipo de arquitectura (Codex) anada la guarda de rol en `deleteTasks`.

---

### GAP-D02: Dependencia de Supabase Auth para Google Meet (Dashboard vs Portal)
- **Archivos y lineas de evidencia:**
  - Accion backend: `src/modules/features/tasks/actions/task-actions.ts#L802-L845`.
  - Integracion: `src/modules/features/integrations/google/google-calendar-service.ts#L50-L110`.
- **Analisis de codigo:**
  ```typescript
  // task-actions.ts (L802-L804)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // invoca createGoogleCalendarMeetingEvent con userId: user.id
  }
  ```
- **Problema:** En el portal de tareas, los colaboradores externos acceden mediante un token de personal (`organization_staff`) sin contar necesariamente con una cuenta en `auth.users` de Supabase (`staff.user_id === null`), lo que genera fallos silenciosos al intentar autogenerar enlaces de Google Meet. Sin embargo, en el dashboard, todos los usuarios estan autenticados mediante una sesion institucional con UUID en `auth.users`, por lo que la conexion con Google Calendar opera de forma consistente siempre que la empresa o el usuario hayan vinculado su cuenta de Google.
- **Decision editorial:** Se creo la guia de primera prioridad `tasks.meetings-and-calendar.md`, explicando con total claridad el funcionamiento del conector de Google Meet, la alternativa del enlace manual para Zoom o Teams, y las diferencias operativas respecto al portal de colaboradores.

---

### GAP-D03: Desvio Silencioso de 'Completada' por Subtareas Incompletas
- **Archivos y lineas de evidencia:**
  - Backend: `src/modules/features/tasks/actions/task-actions.ts#L1250-L1260` (`updateTaskStatus`).
  - Frontend: `src/modules/features/tasks/components/kanban/task-kanban-board.tsx#L90-L115`.
- **Analisis de codigo:**
  ```typescript
  if (status === "done") {
    if (hasUnfinishedDeliverables) {
      updateData.status = "in_review";
      updateData.progress_percentage = 95;
    } else {
      updateData.progress_percentage = 100;
    }
  }
  ```
- **Problema:** Al arrastrar una tarjeta a la columna *Completada* en el tablero Kanban, si la tarea contiene subtareas sin marcar, el backend no arroja un error explicito en la UI, sino que silenciosamente la reubica en la columna *En revision* con progreso al 95%. Esto provoca desconcierto en usuarios que interpretan que la tarjeta "rebota" por un error tecnico.
- **Decision editorial:** Se detallo esta regla de negocio en `tasks.task-lifecycle-and-views.md` y `tasks.manage-tasks.md`, aclarando que el sistema exige verificar todos los entregables antes de permitir el sellado al 100%.

---

### GAP-D04: Kanban Desacoplado de Reuniones por Diseno
- **Archivos y lineas de evidencia:**
  - Componente: `src/modules/features/tasks/components/task-manager-view.tsx#L1209-L1212`.
  - Componente: `src/modules/features/tasks/components/shared/task-meeting-view-toggle.tsx`.
- **Analisis de codigo:**
  ```typescript
  onToggle={() => {
    const nextVal = !includeMeetings;
    setIncludeMeetings(nextVal);
    if (nextVal && activeTab === "kanban") {
      setActiveTab("list");
    }
  }}
  ```
- **Observacion:** Si un usuario esta en la vista de Tablero Kanban y presiona el alternador para visualizar reuniones, la interfaz conmuta automaticamente a la vista de Lista (`setActiveTab("list")`), ya que el tablero Kanban excluye deliberadamente las actividades de tipo `meeting`.
- **Decision editorial:** Se documenta en `tasks.manage-tasks.md` y `tasks.meetings-and-calendar.md` que las reuniones se consultan y operan en la vista de Lista o en el Calendario mensual/semanal.

---

## 4. Conclusiones y Recomendaciones Tecnicas

1. **Blindaje de `deleteTasks`:** Anadir en `task-actions.ts` la validacion de permisos de gestion en servidor para que usuarios sin autorizacion no puedan ejecutar peticiones POST directas de eliminacion masiva.
2. **Claridad Conceptual:** La nueva biblioteca en `docs/1-product/help-library/dashboard-preparation/tasks/` refleja fielmente las 6 vistas y los flujos verificados del dashboard, corrigiendo los errores conceptuales de la guia anterior.
3. **No regresion:** No se modifico ningun archivo de codigo en `src/`, garantizando estabilidad total para la integracion de Codex.
