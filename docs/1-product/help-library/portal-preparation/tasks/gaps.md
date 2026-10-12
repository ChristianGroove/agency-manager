# Registro de Gaps Técnicos, Asimetrías de Autorización y Contradicciones UI / Backend

**Documento preparatorio de ingeniería y biblioteca editorial**  
**Fecha:** 2026-10-12  
**Superficie:** `portal.tasks`  
**Revisión de código fuente (Git HEAD):** `5aaeec98767f13ec9b495eed33486fcdba65ab86`  
**Ubicación:** `docs/1-product/help-library/portal-preparation/tasks/gaps.md`

---

## 1. Resumen Ejecutivo

Durante la auditoría estricta de código fuente de la ruta `/portal/tasks/[token]`, sus componentes React, el modal de detalle y las acciones de servidor (`collaborator-portal-actions.ts` y `portal-security-actions.ts`), se identificaron múltiples discrepancias entre lo que la interfaz gráfica (UI) expone u oculta y lo que el backend realmente autoriza o restringe.

Bajo la regla de oro del encargo editorial:
> *"Un control oculto no demuestra que una acción backend esté protegida: verificar y registrar ambas cosas. No arreglar código para acomodar una guía."*

Este informe documenta con exactitud de línea y símbolo las contradicciones detectadas, el comportamiento observado, el impacto en la biblioteca de ayuda para colaboradores y las recomendaciones técnicas para el equipo de desarrollo de backend (Codex) e integración.

---

## 2. Matriz de Gaps y Asimetrías Detectadas

| ID | Hallazgo / Función | Comportamiento en UI (Cliente) | Autorización en Servidor (Backend) | Severidad | Impacto Editorial |
|---|---|---|---|---|---|
| **GAP-01** | Cambio de Prioridad de Tarea | Oculto / Deshabilitado para no-PMs en `TaskPortalDetailModal` | **Sin restricción de rol**. `portalUpdateTaskPriority` solo valida token y tenant | **Media (Seguridad)** | Documentar que solo el PM define prioridades. Prohibir sugerir que el colaborador puede cambiarla por URL o API. |
| **GAP-02** | Reasignación de Responsable | Controles ocultos en ribbon y modal para no-PMs | **Sin restricción de rol**. `portalAssignTask` solo valida token y tenant | **Media (Seguridad)** | Tratar la asignación como potestad exclusiva de PMs/Líderes. |
| **GAP-03** | Asimetría de Eliminación (Lote vs Unitaria) | Botón de eliminar en lote visible si `can_bulk_delete_tasks: true`; botón unitario en modal oculto para no-PMs | `portalBulkDeleteTasks` respeta `can_bulk_delete_tasks`, pero `portalDeleteTask` exige estrictamente `isLeadOrPm` | **Baja (Inconsistencia UX)** | Explicar que la eliminación unitaria en modal está reservada a líderes, mientras que el borrado en lote depende del permiso granular. |
| **GAP-04** | Vista Compacta Retirada | `showCompact={false}` en `ViewToggle`. Inaccesible visualmente | Código JSX residual e inerte (~120 líneas en `task-collaborator-portal.tsx`) | **Baja (Deuda Técnica)** | Omitir completamente la vista compacta en guías y clasificarla como `retired` en el inventario. |
| **GAP-05** | Autogeneración de Google Meet | Switch visible en creación de reunión | Falla silenciosa si el colaborador en `organization_staff` tiene `user_id === null` | **Media (Operativa)** | Instruir al colaborador que agregue el enlace manual si la autogeneración reporta error. |
| **GAP-06** | Gobernanza Forzada en Creación | Campos de horas estimadas y fecha límite visibles en UI compartida | Forzado en backend: `status='backlog'`, `estimated_hours=0`, `due_date=null` para no-PMs | **Baja (Expectativa UX)** | Guías separadas (`create-task-collaborator` vs `create-task-pm`) explicitando que las horas y fechas requieren aprobación de PM. |
| **GAP-07** | Desvío Silencioso de 'done' con Subtareas Incompletas | El usuario selecciona estado "Completada" (`done`) | Backend intercepta y desvía forzosamente a `status='in_review'` con progreso al 95% | **Media (Confusión UX)** | Explicar explícitamente en guías que cualquier subtarea pendiente impedirá sellar la tarea en `done`. |
| **GAP-08** | Ciclo de Vida de Tokens y Expiración | El colaborador percibe una sesión permanente mientras tenga el enlace | No existe expiración por TTL temporal en `organization_staff.access_token` (solo revocación manual o `is_active=false`) | **Informativa (Arquitectura)** | Aclarar que el enlace es privado y permanente hasta que el administrador lo revoque o desactive la cuenta. |

---

## 3. Análisis Quirúrgico Detallado por Gap

### GAP-01: Asimetría de Autorización en Modificación de Prioridad
- **Archivos y líneas de evidencia:**
  - UI: `src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx#L890-L920` (selector de prioridad condicionado a `isLeadOrPm`).
  - Backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L933-L960` (`portalUpdateTaskPriority`).
- **Análisis de código:**
  ```typescript
  // collaborator-portal-actions.ts (L939-L955)
  const { data: staff } = await supabaseAdmin
    .from("organization_staff")
    .select("id, organization_id")
    .eq("access_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) throw new Error("Acceso no autorizado");

  const { error } = await supabaseAdmin
    .from("task_items")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("organization_id", staff.organization_id);
  ```
- **Problema:** No se invoca `isStaffLeadOrPmRole(staff.role, staff.task_role)`. Cualquier colaborador activo con un token válido puede enviar una petición de red POST a la Server Action y alterar la prioridad de cualquier tarea de su organización a `urgent` o `low`.
- **Decisión editorial:** Las guías para usuarios (`tasks-portal.view-modes-and-filters.md`, `tasks-portal.task-lifecycle-and-status.md`) documentan estrictamente la regla de negocio visible: *la prioridad es establecida y modificada por el PM*. Se prohíbe documentar mecanismos de manipulación directa.
- **Acción recomendada para backend (Codex):** Añadir `const isLeadOrPm = isStaffLeadOrPmRole(staff.role, staff.task_role); if (!isLeadOrPm) throw new Error("Solo PMs...");`.

---

### GAP-02: Asimetría de Autorización en Reasignación de Responsable
- **Archivos y líneas de evidencia:**
  - UI: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx#L3200-L3250` y `task-portal-detail-modal.tsx#L850-L885`.
  - Backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L965-L990` (`portalAssignTask`).
- **Análisis de código:**
  ```typescript
  // collaborator-portal-actions.ts (L971-L985)
  const { data: staff } = await supabaseAdmin
    .from("organization_staff")
    .select("id, organization_id")
    .eq("access_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) throw new Error("Acceso no autorizado");

  const { error } = await supabaseAdmin
    .from("task_items")
    .update({ assigned_staff_id: assignedStaffId, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("organization_id", staff.organization_id);
  ```
- **Problema:** Nuevamente falta la guarda de rol `isStaffLeadOrPmRole`. En la interfaz, el desplegable de responsables solo se renderiza para líderes. Sin embargo, a nivel de Server Action, cualquier colaborador con token activo puede reasignar requerimientos a cualquier miembro del equipo.
- **Decisión editorial:** La biblioteca instruye que la asignación es una función de coordinación y balanceo de carga propia del Project Manager.
- **Acción recomendada para backend (Codex):** Requerir `isLeadOrPm` en `portalAssignTask`.

---

### GAP-03: Asimetría de Permisos de Eliminación (Lote vs Unitaria)
- **Archivos y líneas de evidencia:**
  - Eliminación unitaria: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L2640-L2659` (`portalDeleteTask`).
  - Eliminación en lote: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L2852-L2882` (`portalBulkDeleteTasks`).
- **Análisis comparativo de código:**
  ```typescript
  // portalDeleteTask (Unitaria) - L2654-L2658
  const isLeadOrPm = isStaffLeadOrPmRole(staff.role, (staff as any).task_role);
  if (!isLeadOrPm) {
    throw new Error("Solo los líderes o Project Managers tienen permiso para eliminar tareas.");
  }

  // portalBulkDeleteTasks (Lote) - L2873-L2881
  const isLead = isStaffLeadOrPmRole(staff.role, (staff as any).task_role);
  const hasPermission =
    staff.can_bulk_delete_tasks !== null && staff.can_bulk_delete_tasks !== undefined
      ? Boolean(staff.can_bulk_delete_tasks)
      : isLead;

  if (!hasPermission) {
    return { success: false, error: "No tienes permiso para eliminar tareas en masa" };
  }
  ```
- **Problema:** Existe una incoherencia de diseño de permisos: si a un colaborador de confianza que no es PM se le activa la casilla de base de datos `can_bulk_delete_tasks: true`, este usuario puede marcar 1 tarea en la tabla y eliminarla mediante la barra flotante de acciones masivas. No obstante, si hace clic sobre esa misma tarea para abrir su modal de detalle, el botón "Eliminar Tarea" no aparecerá en la UI, y si la acción unitaria fuera llamada, el backend arrojaría un error porque `portalDeleteTask` ignora el flag `can_bulk_delete_tasks`.
- **Decisión editorial:** El artículo `tasks-portal.bulk-actions.md` clarifica que el borrado masivo requiere autorización expresa (`can_bulk_delete_tasks` o rol PM), mientras que la gestión dentro del modal está concebida para roles directivos.
- **Acción recomendada para backend (Codex):** Homogeneizar la verificación de permisos permitiendo que `portalDeleteTask` también valide `Boolean(staff.can_bulk_delete_tasks) || isLeadOrPm`.

---

### GAP-04: Vista Compacta Retirada en UI pero Presente en JSX
- **Archivos y líneas de evidencia:**
  - Barra de alternancia: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx#L3556-L3571`.
  - Ramas de renderizado inerte: `task-collaborator-portal.tsx#L4200-L4250` y `#L4785-L4870`.
- **Análisis de código:**
  ```tsx
  {/* View Mode Toggle: Grid, List, Kanban (Compacta eliminada) - al extremo derecho */}
  <ViewToggle
    view={viewMode === "compact" ? "list" : viewMode}
    onViewChange={(newMode) => {
      if (newMode === "kanban") {
        setIncludeMeetings(false)
      }
      setViewMode(newMode)
    }}
    showCompact={false}
    showKanban={true}
    showCalendar={true}
  />
  ```
- **Problema:** La vista compacta fue desestimada del diseño visual (`showCompact={false}`), forzando a que cualquier estado residual se mapee a `list`. Sin embargo, el componente principal conserva bloques completos de JSX para representar tarjetas compactas que nunca se van a ejecutar en producción.
- **Decisión editorial:** En `inventory.json` se registró `view.portal.compact` con estado `retired`. Los artículos de ayuda (`tasks-portal.view-modes-and-filters.md`) documentan exclusivamente las 4 vistas accesibles: Lista, Cuadrícula (Cards), Tablero Kanban y Calendario.
- **Acción recomendada para frontend (Codex):** Purgar el código muerto de la vista compacta en `task-collaborator-portal.tsx` para reducir el peso del bundle y facilitar el mantenimiento.

---

### GAP-05: Dependencia de Supabase Auth para Google Meet en Portal Anónimo
- **Archivos y líneas de evidencia:**
  - UI de Creación: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx#L3490-L3520`.
  - Acción backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L1646-L1695`.
- **Análisis de código:**
  ```typescript
  const meetResult = await createGoogleCalendarMeetingEvent({
    title: taskData.title,
    description: taskData.description,
    startAt: taskData.meetingStartAt,
    durationMinutes: taskData.meetingDurationMinutes,
    attendeeEmails,
    userId: staff.user_id, // <-- Puede ser null en colaboradores de portal
    staffId: staff.id,
    orgId: staff.organization_id,
    // ...
  });
  ```
- **Problema:** En el modelo de colaboradores del portal Tasks, muchos miembros son invitados de agencias, clientes externos o freelancers registrados en `organization_staff` mediante correo y token, sin una cuenta creada en el pool de `auth.users` de Supabase (`staff.user_id === null`). Si la integración con Google Calendar de la empresa está configurada por usuario o falla al no recibir un UUID de auth, `createGoogleCalendarMeetingEvent` arroja error. La tarea se crea satisfactoriamente, pero sin el enlace de Meet (`finalMeetingUrl = null`).
- **Decisión editorial:** La guía `tasks-portal.meetings-and-meet.md` advierte que si la empresa no tiene la integración de Google Meet conectada o autorizada, el colaborador debe pegar el enlace de Meet, Zoom o Teams directamente en el campo de URL.

---

### GAP-06: Gobernanza de Backlog Forzada en Creación de Tareas
- **Archivos y líneas de evidencia:**
  - Backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L1602-L1625`.
- **Análisis de código:**
  ```typescript
  // Standard Collaborator Governance:
  // 1. Forced into "backlog" (no uncontrolled scope creep in active sprints).
  // 2. Estimated hours forced to 0 (only PM can authorize contract hours).
  // 3. Due date left null (only PM can set contractual deadlines).
  // 4. Assigned staff defaults to creator or unassigned.
  // 5. QA staff defaults to unassigned.
  const finalStatus: TaskStatus = isLeadOrPm ? (taskData.status || "todo") : "backlog";
  const finalEstimatedHours = isLeadOrPm
    ? (taskData.type === "meeting" ? Number(taskData.meetingDurationMinutes || 30) / 60 : Number(taskData.estimatedHours || 0))
    : 0;
  const finalDueDate = isLeadOrPm
    ? (taskData.type === "meeting" && taskData.meetingStartAt ? taskData.meetingStartAt.split("T")[0] : (taskData.dueDate || null))
    : null;
  ```
- **Problema:** Si un colaborador estándar llena los campos de horas estimadas o fecha límite en un formulario compartido, sus valores son ignorados y sobreescritos por `0` y `null`. Igualmente, su requerimiento quedará en `backlog` en lugar de `todo`.
- **Decisión editorial:** Se crearon dos artículos bien diferenciados:
  1. `tasks-portal.create-task-collaborator.md`: Explica con total transparencia que los tickets creados entran a Backlog para evaluación del PM, y que las horas/fechas son asignadas durante la planeación del sprint.
  2. `tasks-portal.create-task-pm.md`: Explica las facultades plenas del Project Manager para fijar plazos contractuales, asignar analistas QA y estimar horas presupuestadas.

---

### GAP-07: Sobreescritura Silenciosa de Estado 'done' por Subtareas Pendientes
- **Archivos y líneas de evidencia:**
  - Backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L1250-L1256`.
- **Análisis de código:**
  ```typescript
  if (status === "done") {
    if (hasUnfinishedDeliverables) {
      updateData.status = "in_review";
      updateData.progress_percentage = 95;
    } else {
      updateData.progress_percentage = 100;
    }
  } else if (status === "in_review") {
    updateData.progress_percentage = Math.max(90, updateData.progress_percentage || 90);
  }
  ```
- **Problema:** Cuando un desarrollador o colaborador intenta mover una tarea a "Finalizada", si olvidó marcar alguna casilla de la lista de chequeo, el sistema no devuelve un error de validación explícito (como "Debes completar todas las subtareas"), sino que silenciosamente la cambia a `in_review` con progreso `95%`. En la UI, el usuario ve que la tarjeta "no se queda en Finalizada" y regresa a "En revisión", lo que puede parecer un bug de la plataforma.
- **Decisión editorial:** El artículo `tasks-portal.subtasks-checklist.md` y `tasks-portal.task-lifecycle-and-status.md` explican claramente esta regla de protección: *Para sellar una tarea como completada (100%), todos los entregables de la lista de chequeo deben estar verificados. De lo contrario, el sistema la mantendrá en revisión al 95%*.

---

### GAP-08: Aislamiento de Notas Rápidas y Sanitización de Payloads
- **Archivos y líneas de evidencia:**
  - Serialización: `src/modules/features/tasks/actions/collaborator-portal-actions.ts#L593-L596`.
  - Mutación: `collaborator-portal-actions.ts#L3048-L3075` (`portalUpdateTaskQuickNote`).
- **Análisis de código:**
  ```typescript
  // L593-L596
  const notesDict = (t.quick_notes && typeof t.quick_notes === "object") ? t.quick_notes : {};
  t.quick_note = notesDict[staff.id] || null;
  delete (t as any).quick_notes;
  ```
- **Observación técnica:** La implementación en backend es segura y ejemplar: la columna `task_items.quick_notes` guarda un JSON estructurado `{ [staffId]: { content, updated_at } }`. Al despachar las tareas al portal, el servidor extrae únicamente la nota correspondiente al `staff.id` de la sesión y destruye la propiedad global `quick_notes` antes de enviar el JSON al navegador.
- **Coherencia:** Es un punto fuerte que no representa brecha de seguridad. La biblioteca de ayuda confirma en `tasks-portal.quick-notes.md` que las notas rápidas son 100% privadas y no pueden ser leídas por otros compañeros ni por el Project Manager.

---

## 4. Conclusiones y Guía para Integración

1. **Blindaje de Server Actions:** El equipo de desarrollo backend debe priorizar la incorporación de la guarda `isLeadOrPm` en `portalUpdateTaskPriority` y `portalAssignTask` para evitar que peticiones forjadas desde clientes HTTP modifiquen asignaciones y prioridades.
2. **Claridad Editorial:** Las 18 guías generadas en `docs/1-product/help-library/portal-preparation/tasks/articles/` se alinean a la experiencia visual y a las reglas de negocio verificadas, previniendo falsas expectativas operativas.
3. **No regresión:** No se modificó ningún archivo de código fuente del repositorio, respetando de forma estricta las instrucciones del encargo editorial.
