# INFORME DE AUDITORIA INTEGRAL: MODULO DE TAREAS Y OPERACIONES

**Repositorio:** `g:/Pixy/agency-manager`  
**Alcance:** Modulo completo `src/modules/features/tasks/` (Server Actions, Vistas de Plataforma, Portal de Colaboradores, Actividades de Reunion, Sprints, Tags, Importador, Pacing y Cron Jobs).  
**Norma de estilo:** Estrictamente CERO EMOJIS en la totalidad del reporte. Idioma espanol.

---

## 1. RESUMEN EJECUTIVO Y EVALUACION CRITICA DEL INFORME PREVIO

Se ha llevado a cabo una contra-auditoria tecnica exhaustiva sobre el codigo fuente del modulo de tareas y los hallazgos presentados en la investigacion previa (`<prior_attempt>`).

### 1.1 Evaluacion Critica de la Investigacion Previa
La investigacion previa identifico correctamente vulnerabilidades y fallencias estructurales importantes (como la desincronizacion C1, IDOR en borrado C2, desproteccion en asistencia de reuniones C3, desbloqueo prematuro C4, mutaciones en GET C5 y fallas de revalidacion A3). Sin embargo, el examen forense del codigo revelo deficiencias metodologicas y alucinaciones en el reporte previo que deben corregirse:

1. **Alucinacion de tablas inexistentes y diagnostico erroneo en A5:**
   El informe previo afirmo textualmente que el importador omite generar tokens porque inserta en una tabla llamada `collaborators` y no en `collaborator_portal_tokens`.
   - *Realidad en el codigo:* No existe la tabla `collaborators` ni la tabla `collaborator_portal_tokens` en todo el repositorio. La tabla real es `organization_staff`, y su columna `access_token` posee un valor por defecto en PostgreSQL (`DEFAULT extensions.uuid_generate_v4()`, migracion `20260409000000_baseline.sql:5726`). Por lo tanto, los colaboradores creados via CSV si reciben su `access_token`. El problema real del importador es la ausencia de rollback transaccional ante fallos en lotes y la omision de `task_role` y membresias de workspace.
2. **Alucinacion de variables de control en M5:**
   El informe previo afirmo que `task-metrics-view.tsx` evalua `if (!useLegacyMetrics)`.
   - *Realidad en el codigo:* La variable `useLegacyMetrics` no existe en el archivo. La bifurcacion real es `if (tasks.length > 0 || collaborators.length > 0)`.
3. **Ruta inexistente en M1:**
   El informe previo cito `src/app/(platform)/operations/tasks/page.tsx`. La ruta real en el arbol de Next.js es `src/app/(dashboard)/operations/tasks/page.tsx`.
4. **Generalizacion imprecisa en A4:**
   El informe previo afirmo que en `portalUpdateTask` un PM puede completar una tarea sin validar bloqueadores pendientes.
   - *Realidad en el codigo:* `portalUpdateTask` si valida bloqueadores predecesores en las lineas 2071-2084 (`if ((updateData.status === "done"...) && effectiveBlockerId)`). Lo que realmente omite de forma total es la validacion de entregables abiertos (`checklist`), ademas de desbloquear prematuramente las tareas dependientes cuando el colaborador transiciona a `in_review`.
5. **Puntos ciegos de alto impacto omitidos por la investigacion previa:**
   La investigacion previa no detecto:
   - Escalacion critica de privilegios en `types.ts:1221-1246` (`isStaffLeadOrPmRole`), que otorga permisos destructivos de Project Manager a cualquier tester, QA o rol con coincidencia parcial de texto.
   - Fuga multitenant e IDOR en Sprints y Tags mediante el parametro desprotegido `providedOrgId` en `task-sprint-actions.ts:41` y `task-tag-actions.ts:39`.
   - Destruccion cruzada de sprints activos entre diferentes workspaces dentro de la misma organizacion en `task-sprint-actions.ts:337-343`.
   - Omision total de `revalidatePath` en todas las 2,670 lineas de `collaborator-portal-actions.ts`.
   - Sobrescritura destructiva de horas reales (`actual_hours`) y descarte silencioso de horas imputadas en `task-portal-detail-modal.tsx:661` y `collaborator-portal-actions.ts:1914`.
   - Proliferacion exponencial de tareas recurrentes por falta de transaccion en el cron `tasks-recurrence/route.ts:133-191`.
   - Bucle N+1 de peticiones HTTP en el cron de snapshots de pacing con filtro a un estado inexistente (`status != 'archived'`).
   - Discrepancia de validacion de entregables entre el tablero Kanban y la vista de lista.
   - Deriva temporal en la Matriz de Pacing por falta de campo relacional `completed_at`.

### 1.2 Resumen Consolidado de Severidad
El inventario auditado asciende a **28 hallazgos** clasificados de la siguiente manera:
- **7 Hallazgos de Severidad Critica (C1 a C7):** Riesgo de fuga multitenant, IDOR, suplantacion de identidad, escalacion de privilegios PM a roles de QA, desincronizacion silenciosa y carreras en RSC.
- **9 Hallazgos de Severidad Alta (A1 a A9):** Corrupcion de logica de negocio, colisiones de tickets, omision de datos en creacion/promocion, destruccion cruzada de sprints entre workspaces, sobrescritura de horas, fallas en cron y omision de revalidaciones.
- **8 Hallazgos de Severidad Media (M1 a M8):** Consultas N+1 en SSR y crons, duplicacion de 4,725 lineas de codigo, parseo de texto por regex, incongruencias de validacion entre vistas y perdida de relaciones en Realtime.
- **4 Hallazgos de Severidad Baja (B1 a B4):** Estado volatil en `localStorage`, sobreescritura de metadatos globales, UUIDs huerfanos en JSONB y filtros sin indexar en cliente.

---

## 2. AUDITORIA DE HALLAZGOS PREVIOS: VERIFICACION Y CORRECCION

| Ref | Afirmacion Previa | Evidencia Citada Previa | Lo que Muestra Realmente el Codigo | Veredicto y Correccion |
|---|---|---|---|---|
| **C1** | `updateTaskStatus` degrada a `in_review` (95%) y la UI asume `done`. | `task-actions.ts:1208` y `task-manager-view.tsx:532` | `task-actions.ts:1277` retorna `{ success: true, unblockedTasks }` sin indicar el estado real aplicado. `updateTaskProgress:1318` tambien recorta a 95% sin avisar al cliente. | **Confirmado y Ampliado.** Aplica tanto a cambio de estado como a actualizacion de progreso. |
| **C2** | Fuga multitenant en `deleteWorkspace` y `deleteProject` al omitir `organization_id`. | `task-actions.ts:37, 384, 550` | `deleteWorkspace` y `deleteProject` usan `supabaseAdmin.delete().eq('id', id)` sin validar `organization_id` ni sesion de usuario. Ademas, `updateWorkspace`, `updateProject`, `updateTask`, `createCollaborator` y `updateCollaborator` sufren del mismo IDOR. | **Confirmado y Ampliado.** El fallo compromete la totalidad del CRUD administrativo ejecutado con service role. |
| **C3** | Accion publica de servidor sin autorizacion para asistencia y horas de reuniones. | `task-actions.ts:2365, 2500` | Ambas funciones aceptan `isPmOverride: true` sin comprobar `supabase.auth.getUser()`, sesion o tokens. Ademas, el componente cliente `task-meeting-console.tsx` las invoca directamente desde el portal sin pasar token alguno. | **Confirmado y Ampliado.** La consola de reuniones en el portal tambien consume esta server action desprotegida. |
| **C4** | Desbloqueo prematuro de tareas dependientes al mover a `in_review` via entregables. | `collaborator-portal-actions.ts:1285, 1358` | Linea 1285 fija `updateData.status = 'in_review'`, e inmediatamente la linea 1359 llama a `handlePortalTaskUnblocking(taskId, ...)`. | **Confirmado.** El predecesor queda en revision pero sus sucesoras ya quedan desbloqueadas en `todo` o `in_progress`. |
| **C5** | Mutaciones de BD en funcion GET de lectura `getActiveSprint`. | `task-sprint-actions.ts:199` | Si `end_date < todayStr`, `getActiveSprint` invoca `completeSprint`, la cual inserta un sprint nuevo, actualiza tareas y revalida cache. En peticiones paralelas concurrentes genera duplicacion masiva. | **Confirmado.** Viola el principio de idempotencia en RSC. |
| **A1** | Omision de `sprint_id` y `blocked_reason` en payload de `createTask`. | `task-actions.ts:685-722` | El literal de insercion en `task-actions.ts:687-722` omite ambos campos. Ademas, `promoteSupportTicketToTask:827` le envia `sprint_id`, pero este es descartado silenciosamente. | **Confirmado y Ampliado.** Tambien rompe la asignacion de sprints al promover tickets de soporte. |
| **A2** | `ticket_code` ignora prefijo de workspace en portal y colisiona concurrentemente. | `portal-actions:1530`, `task-actions:652` | Portal hardcodea `SUP` o `TK` sin leer `task_workspaces.key_prefix`. La consulta usa `order('created_at').limit(1)` sin bloqueo pesimista ni indice UNIQUE en PostgreSQL. | **Confirmado.** La BD carece de restriccion UNIQUE sobre `(organization_id, ticket_code)`. |
| **A3** | Rutas inexistentes en `revalidatePath('/operations/tasks/portal')`. | `task-actions.ts:2489, 2598` | Se repite en lineas 2489, 2598 y 2674. En `task-sprint-actions.ts` se revalida `/portal/tasks` omitiendo `/operations/tasks`. | **Confirmado y Ampliado.** Se descubrio ademas que `collaborator-portal-actions.ts` no tiene ninguna llamada a `revalidatePath`. |
| **A4** | Discrepancia de formulas de progreso y validaciones entre portales. | `task-actions:1233`, `portal-actions:1878` | `portalUpdateTask` permite cerrar tareas (`done`) ignorando entregables pendientes del checklist. Sin embargo, si valida dependencias bloqueadoras en L2071-2084. | **Corregido y Precisado.** El reporte previo afirmo que no validaba bloqueadores; el codigo demuestra que si valida bloqueadores pero omite la validacion de entregables abiertos. |
| **A5** | Ausencia de transaccionalidad e inexistencia de tokens al importar colaboradores. | `task-import-actions.ts:154, 365` | **Alucinacion previa:** No existe tabla `collaborators` ni `collaborator_portal_tokens`. La tabla es `organization_staff` y el token se autogenera via default de BD. Sin embargo, es cierto que el proceso carece de rollback transaccional ante fallos en lotes. | **Refutado Parcialmente y Corregido.** Se descarta la inexistencia de tokens; se confirma la falta de rollback y se anade la omision de `task_role` y membresias de workspace. |
| **M1** | Carga inicial SSR descarga 4 veces la tabla de tareas en paralelo. | `page.tsx:25-32` | `page.tsx` llama `getWorkspaces`, `getProjects`, `getTasks` y `getCollaborators`. Cada una descarga la tabla entera para conteos en memoria. | **Confirmado.** Correccion: la ruta del archivo es `src/app/(dashboard)/operations/tasks/page.tsx`, no `(platform)`. |
| **M2** | Escaneo no acotado de comentarios historicos y busqueda por regex. | `portal-actions:495, 733` | Linea 495 descarga todos los comentarios de la organizacion sin paginar ni limitar por fecha. Linea 737 filtra logs con `ilike` y regex textuales sobre comentarios. | **Confirmado.** Genera alto consumo de memoria y computo ineficiente. |
| **M3** | Perdida de relaciones foraneas en Realtime e inserciones asimetricas. | `task-manager-view:150`, `portal:574` | El evento Realtime UPDATE pisa el objeto local manteniendo relaciones viejas (`assigned_staff`). El listener INSERT del portal descarta cualquier tarea regular que no sea soporte. | **Confirmado.** El colaborador no recibe asignaciones ordinarias en vivo. |
| **M4** | Duplicacion masiva de codigo en modales de detalle. | `task-detail-modal`, `task-portal-detail-modal` | Los dos archivos suman 4,725 lineas de codigo con interfaces casi identicas de checklists, entregables, logs y comentarios. | **Confirmado.** Representa una de las mayores cargas de deuda tecnica del modulo. |
| **M5** | Codigo muerto inalcanzable en `task-metrics-view.tsx`. | `task-metrics-view.tsx:55-78` | **Correccion:** No existe la variable `useLegacyMetrics`. La condicion real es `if (tasks.length > 0 || collaborators.length > 0) return <TaskPmOperationsDashboard />`. Las 270 lineas siguientes quedan inalcanzables cuando hay datos. | **Corregido y Precisado.** Se descarta el identificador alucinado y se documenta la condicion real. |
| **B1** | Lectura de hilos de soporte guardada solo en `localStorage`. | `support-thread-read-state.ts:13` | Guarda mapa JSON en `localStorage.getItem('pixy_support_thread_read_...')`. | **Confirmado.** Se pierde entre sesiones y maquinas. |
| **B2** | Sobreescritura ciega de `app_metadata` al gestionar etiquetas. | `task-tag-actions.ts:83, 181` | Reemplaza todo el objeto `app_metadata` de la organizacion para actualizar `task_tags`. | **Confirmado.** Riesgo de colision con otros modulos del sistema. |
| **B3** | Borrado de colaboradores deja UUIDs huerfanos en JSONB. | `task-actions.ts:2130-2180` | Limpia columnas foraneas pero no limpia las referencias en `task_items.checklist` ni en `task_items.meeting_attendees`. | **Confirmado.** Provoca fallos visuales en avatares y nombres. |
| **B4** | Complejidad O(M*N) en calculo de metricas en cliente. | `task-collaborator-ribbon:98` | Itera tareas y subtareas por cada miembro dentro de `useMemo`. | **Confirmado.** Genera lag con volumenes grandes de datos. |

---

## 3. REPORTE INTEGRAL CONSOLIDADO DE HALLAZGOS POR SEVERIDAD

### SEVERIDAD CRITICA

#### C1. Desincronizacion Silenciosa UI/Backend al Completar o Avanzar Tareas con Subtareas Pendientes
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:1208-1211`, `task-actions.ts:1318-1320` y `src/modules/features/tasks/components/task-manager-view.tsx:532-575`.
- **Causa Raiz:**
  En `updateTaskStatus`, si la tarea solicitada a `done` tiene items pendientes en el checklist, el servidor degrada unilateralmente:
  ```typescript
  if (effectiveStatus === "done" && hasUnfinishedDeliverables) {
    effectiveStatus = "in_review";
    effectiveProgress = 95;
  }
  // ... actualiza la base de datos
  return { success: true, unblockedTasks };
  ```
  La server action no retorna `effectiveStatus` ni el registro actualizado. De forma analoga, en `updateTaskProgress`, si se envia progreso `100` con entregables incompletos, la linea 1318 lo recorta a `95` y omite cambiar el estado a `done`, retornando simplemente `{ success: true }`.
  En el frontend, `task-manager-view.tsx` aplica una mutacion optimista asumiendo ciegamente que la tarea paso a `done` (100%):
  ```typescript
  setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus, progress_percentage: newStatus === "done" ? 100 : t.progress_percentage } : t));
  toast.success("Tarea movida a: Completado");
  ```
- **Impacto:**
  El operador observa visualmente la tarjeta completada al 100%. Al recargar la pagina o dispararse una revalidacion via Realtime, la tarea retrocede subitamente a "En Revision / QA" (95%), generando desconfianza en el sistema, perdida de trazabilidad y reportes continuos de falsos errores de persistencia.
- **Solucion Tecnica:**
  1. Modificar el contrato de retorno de `updateTaskStatus` y `updateTaskProgress` para devolver:
     ```typescript
     return {
       success: true,
       task: normalizeTask(updatedTask),
       effectiveStatus,
       effectiveProgress,
       downgraded: effectiveStatus !== status || effectiveProgress !== progress,
       reason: hasUnfinishedDeliverables ? "La tarea tiene entregables pendientes en el checklist" : undefined,
       unblockedTasks
     };
     ```
  2. En `task-manager-view.tsx`, actualizar el estado local con `res.task` y presentar una notificacion explicativa: `"Tarea movida a Revision (95%) debido a entregables pendientes"`.

---

#### C2. Fuga Multitenant e IDOR en Operaciones Destructivas y Administrativas
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:37-43`, `task-actions.ts:384-398`, `task-actions.ts:550-565`, `task-actions.ts:350-379`, `task-actions.ts:522-545`, `task-actions.ts:1940-2002`, `task-actions.ts:2007-2058`.
- **Causa Raiz:**
  1. La funcion auxiliar `resolveOrgId` confia ciegamente en `providedOrgId` enviado desde el cliente sin comprobar membresia del usuario autenticado.
  2. En `deleteWorkspace`, `deleteProject`, `updateWorkspace` y `updateProject`, se utiliza `supabaseAdmin` para mutar o eliminar registros filtrando unicamente por la clave primaria `id`.
  3. En `createCollaborator` y `updateCollaborator`, cualquier llamador puede inyectar un `orgId` arbitrario y otorgar permisos de Project Manager (`canBulkDeleteTasks: true`, `taskRole: 'pm'`) saltandose las politicas RLS de Supabase.
- **Impacto:**
  Vulnerabilidad IDOR (Insecure Direct Object Reference) de maxima gravedad. Cualquier usuario o cliente malicioso puede enviar llamadas RPC a las Server Actions con identificadores UUID pertenecientes a organizaciones de terceros, logrando la modificacion o eliminacion fisica permanente de espacios de trabajo, proyectos, colaboradores y tareas ajenas.
- **Solucion Tecnica:**
  1. En `resolveOrgId`, forzar siempre la obtencion del usuario autenticado mediante `supabase.auth.getUser()`, consultar sus membresias validas en `organization_members` y verificar que su rol sea `owner` o `admin` en la organizacion destino.
  2. En todas las operaciones destructivas y de actualizacion de `task-actions.ts`, agregar obligatoriamente la clausula `.eq("organization_id", verifiedOrgId)`.

---

#### C3. Server Actions Publicas sin Autenticacion para Asistencia a Reuniones y Credito de Horas
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:2365-2495`, `task-actions.ts:2500-2560`, `src/modules/features/tasks/components/meetings/task-meeting-console.tsx:146-151`.
- **Causa Raiz:**
  `registerMeetingAttendance` y `updateMeetingAttendeeStatus` son funciones exportadas de servidor con directiva `'use server'` que aceptan `isPmOverride: boolean` y `staffId: string`.
  - No invocan `supabase.auth.getUser()`.
  - No verifican tokens del portal de colaboradores.
  - No comprueban la legitimidad del llamador cuando se pasa `isPmOverride: true`.
  - Calculan y actualizan directamente la columna `actual_hours` e insertan notas de auditoria con `supabaseAdmin`.
  - Ademas, la consola de reuniones del portal (`task-meeting-console.tsx`) invoca directamente estas acciones administrativas sin autenticar.
- **Impacto:**
  Suplantacion de asistencia y fraude de horas facturables. Cualquier usuario o script externo puede emitir solicitudes directas a Next.js marcando como presentes o ausentes a participantes de cualquier organizacion, adulterando el historial de asistencia e inflando las horas acreditadas a colaboradores sin intervencion ni autorizacion del gestor del proyecto.
- **Solucion Tecnica:**
  1. Si la peticion proviene de la plataforma interna, validar sesion activa y verificar que el usuario tenga rol de PM/Admin para usar `isPmOverride`.
  2. Si la peticion proviene del portal de colaboradores, exigir un `token` de acceso obligatorio, verificar en `organization_staff` que el token sea valido y contrastar que `staff.id === staffId`.
  3. Rechazar estrictamente cualquier llamada con `isPmOverride: true` que provenga del portal de colaboradores a menos que el rol del staff sea formalmente un Project Manager verificado en base de datos.

---

#### C4. Desbloqueo Prematuro de Tareas Sucesoras al Enviar a Revision de QA
- **Archivos:** `src/modules/features/tasks/actions/collaborator-portal-actions.ts:1283-1288`, `collaborator-portal-actions.ts:1358-1360`, `collaborator-portal-actions.ts:50-99`.
- **Causa Raiz:**
  En `portalToggleChecklistItem`, cuando un colaborador marca todos los entregables de su checklist:
  ```typescript
  if (progress === 100 && task.status !== "done") {
    updateData.status = "in_review";
  }
  // ... persiste la actualizacion y luego ejecuta:
  if (progress === 100 && task.status !== "done") {
    await handlePortalTaskUnblocking(taskId, task.ticket_code, task.title);
  }
  ```
  `handlePortalTaskUnblocking` busca todas las tareas que tienen `blocked_by_task_id = taskId` y, si estan bloqueadas, las transiciona inmediatamente a `todo` o `in_progress`, registrando en la auditoria: `"Desbloqueo: El ticket predecesor #TK-XX fue completado. Tarea lista para avanzar"`.
- **Impacto:**
  Violacion del ciclo de calidad y gobierno operativo. El predecesor no esta completado, sino en revision (`in_review`). Si el equipo de QA o el PM rechaza los entregables y devuelve la tarea a `in_progress`, las tareas dependientes ya han sido desbloqueadas y notificadas a otros desarrolladores, induciendo a que trabajen sobre una base inestable.
- **Solucion Tecnica:**
  Eliminar la invocacion a `handlePortalTaskUnblocking` dentro de `portalToggleChecklistItem`. El desbloqueo de tareas sucesoras debe ejecutarse de forma estricta y exclusiva cuando el estado final de la tarea transiciona efectivamente a `done`.

---

#### C5. Mutaciones de Base de Datos y Condiciones de Carrera en Consultas de Lectura GET (RSC)
- **Archivos:** `src/modules/features/tasks/actions/task-sprint-actions.ts:199-215`, `task-sprint-actions.ts:435-455`.
- **Causa Raiz:**
  `getActiveSprint` es una funcion de consulta invocada recurrentemente durante el renderizado de Server Components. Si el sprint activo tiene habilitado `auto_rollover` y su `end_date` ha expirado, invoca a `completeSprint`, la cual realiza mutaciones en cascada: marca el sprint como `completed`, inserta un nuevo sprint, reasigna tareas y llama a `revalidatePath`.
- **Impacto:**
  1. Si multiples usuarios abren la aplicacion simultaneamente al expirar un sprint, se disparan multiples ejecuciones concurrentes de `completeSprint`, generando la creacion de sprints duplicados y corrupcion en la reasignacion de tareas.
  2. Quebranta el principio de determinismo e idempotencia de Next.js, causando fallos en streaming y ciclos infinitos de renderizado.
- **Solucion Tecnica:**
  1. Convertir `getActiveSprint` en una funcion pura de solo lectura que devuelva el sprint actual acompanado de un flag `{ ...sprint, isOverdue: true }`.
  2. Trasladar la finalizacion y rollover automatico de ciclos a un Cron Job programado (`/api/cron/tasks-sprint-rollover`) o exigir la finalizacion formal mediante un clic explicito del PM.

---

#### C6. Escalacion Masiva de Privilegios por Substring en `isStaffLeadOrPmRole`
- **Archivos:** `src/modules/features/tasks/types.ts:1221-1246`, `src/modules/features/tasks/actions/collaborator-portal-actions.ts:2389, 2572`, `src/modules/features/tasks/actions/task-sprint-actions.ts:29`, `src/modules/features/tasks/actions/task-tag-actions.ts:28`.
- **Causa Raiz:**
  La funcion utilitaria `isStaffLeadOrPmRole` implementa una validacion basada en busqueda de subcadenas sobre la columna de texto libre `role`:
  ```typescript
  export function isStaffLeadOrPmRole(role?: string | null): boolean {
    if (!role) return false;
    const r = role.toLowerCase();
    return (
      r.includes("pm") ||
      r.includes("lead") ||
      // ...
      r.includes("qa") ||
      r.includes("tester") ||
      r.includes("calidad") ||
      r.includes("revisor") ||
      r.includes("pruebas") ||
      r.includes("owner") ||
      r.includes("admin")
    );
  }
  ```
  Esta funcion equipara roles de tester o revisor con facultades de PM y Lead. Ademas, `r.includes("pm")` arroja falsos positivos para cualquier palabra que contenga esas dos letras (por ejemplo, "equipment" o "shipment").
- **Impacto:**
  Cualquier colaborador con cargo de tester o QA ("QA Tester", "Revisor de Pruebas") adquiere facultades totales de Project Manager en el portal: eliminar tareas individual o masivamente, crear/completar/eliminar sprints y gestionar etiquetas corporativas.
- **Solucion Tecnica:**
  Reemplazar la busqueda de subcadenas por la evaluacion del campo tipado estructurado `task_role` de `organization_staff`, separando tajantemente los roles operativos de QA de los roles de gestion PM/Admin.

---

#### C7. Fuga Multitenant e IDOR en Sprints y Tags mediante Parametro Manipulable `providedOrgId`
- **Archivos:** `src/modules/features/tasks/actions/task-sprint-actions.ts:41-55`, `src/modules/features/tasks/actions/task-tag-actions.ts:39-54`.
- **Causa Raiz:**
  En `resolveOrgAndAuthority` de ambos archivos, si el cliente suministra `providedOrgId`, la funcion no valida sesion de usuario, no comprueba si el usuario pertenece al tenant y asume `canManageSprints: true` / `canManageCatalog: true` incondicionalmente.
- **Impacto:**
  Un atacante sin autenticacion puede invocar `deleteSprint`, `createSprint`, `completeSprint`, `createTenantTaskTag` o `deleteTenantTaskTag` pasando el UUID de cualquier organizacion ajena, alterando o destruyendo los sprints y etiquetas de otros clientes.
- **Solucion Tecnica:**
  Eliminar la aceptacion ciega de `providedOrgId`. Obtener siempre el contexto mediante `getCurrentOrganizationId()` o verificar obligatoriamente la membresia del usuario con `supabase.auth.getUser()` contra la tabla `organization_members` con rol administrativo verificado.

---

### SEVERIDAD ALTA

#### A1. Omision Silenciosa de `sprint_id` y `blocked_reason` en la Creacion y Promocion de Tareas
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:687-722`, `task-actions.ts:818-836`, `src/modules/features/tasks/components/modals/task-form-modal.tsx:406`.
- **Causa Raiz:**
  El objeto de insercion en `createTask` lista explicitamente las columnas a persistir en `task_items`, pero omite `sprint_id` y `blocked_reason`. Cuando un usuario crea una tarea asignada a un sprint o bloqueada, o cuando un gestor promueve un ticket de soporte a sprint via `promoteSupportTicketToTask(params)` (linea 827), dichos campos se descartan silenciosamente antes del `insert`.
- **Impacto:**
  La tarea se guarda con `sprint_id = null` y `blocked_reason = null`. La tarea no aparece en el sprint seleccionado y queda varada en el backlog sin reporte de error.
- **Solucion Tecnica:**
  Agregar en el objeto `.insert({...})` de `createTask`:
  ```typescript
  sprint_id: data.sprint_id || null,
  blocked_reason: data.status === "blocked" ? (data.blocked_reason || null) : null,
  ```

---

#### A2. Riesgo de Colision y Perdida de Prefijo en Generacion no Atomica de `ticket_code`
- **Archivos:** `src/modules/features/tasks/actions/collaborator-portal-actions.ts:1530-1547`, `src/modules/features/tasks/actions/task-actions.ts:652-683`, `src/app/api/cron/tasks-recurrence/route.ts:75-90`.
- **Causa Raiz:**
  1. En el portal de colaboradores, `portalCreateTask` hardcodea el prefijo (`SUP` o `TK`) ignorando `task_workspaces.key_prefix`.
  2. En los tres archivos, el correlativo numerico se calcula consultando el ultimo registro con `order("created_at", { ascending: false }).limit(1)` sin bloqueo pesimista ni transaccional.
  3. En PostgreSQL no existe un constraint UNIQUE sobre `(organization_id, ticket_code)`.
- **Impacto:**
  Dos creaciones simultaneas concurrentes obtienen el mismo correlativo y se insertan dos tareas con el mismo `ticket_code`, rompiendo la unicidad de las referencias en enlaces y comentarios.
- **Solucion Tecnica:**
  1. Usar el `key_prefix` del workspace en el portal.
  2. Crear una secuencia o funcion RPC atomica PostgreSQL (`generate_next_ticket_code(org_id, prefix)`).
  3. Aplicar una migracion con restriccion de unicidad:
     ```sql
     CREATE UNIQUE INDEX idx_task_items_org_ticket_code ON public.task_items(organization_id, ticket_code);
     ```

---

#### A3. Revalidaciones Fantasma y Desincronizacion de Cache entre Plataforma y Portales
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:2489, 2598, 2674`, `src/modules/features/tasks/actions/task-sprint-actions.ts:86, 305, 354, 504, 568, 610, 649`.
- **Causa Raiz:**
  En `task-actions.ts`, las acciones de reuniones revalidan `/operations/tasks/portal`, ruta que no existe en el sistema de archivos (la ruta real es `/portal/tasks/[token]`).
  En `task-sprint-actions.ts`, todas las acciones ejecutan `safeRevalidatePath("/portal/tasks")`, pero omiten revalidar `/operations/tasks`.
- **Impacto:**
  Next.js consume recursos invalidando paths inexistentes mientras que la vista principal de administracion permanece desactualizada, requiriendo recargas forzadas de pagina para visualizar cambios de estado de sprints.
- **Solucion Tecnica:**
  Definir un modulo de constantes de revalidacion y revalidar sistematicamente `/operations/tasks` en todas las acciones de sprints y reuniones.

---

#### A4. Discrepancia en Reglas de Maquina de Estados y Progreso entre Plataforma y Portal
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:1208-1241`, `src/modules/features/tasks/actions/collaborator-portal-actions.ts:1908-1913, 1951-1962`.
- **Causa Raiz:**
  En la plataforma (`task-actions.ts`), si una tarea tiene entregables pendientes en el checklist y se solicita pasar a `done`, se bloquea o se transiciona a `in_review` (95%). En el portal (`collaborator-portal-actions.ts:1908-1913`), si se envia `status: 'done'`, se aplica ciegamente sin revisar entregables abiertos.
- **Impacto:**
  Reglas de negocio asimetricas. Una tarea bloqueada en plataforma por entregables pendientes puede cerrarse inmediatamente desde el portal de colaboradores al 100%, evadiendo los controles de calidad del proyecto.
- **Solucion Tecnica:**
  Unificar la logica en una funcion pura compartida `resolveTaskStatusAndProgress` utilizada por ambas acciones.

---

#### A5. Ausencia de Atomicidad y Rollback Transaccional en el Motor de Importacion Masiva
- **Archivos:** `src/modules/features/tasks/actions/task-import-actions.ts:154-230, 365-470`.
- **Causa Raiz:**
  El importador ejecuta la creacion de entidades de forma secuencial y desarticulada: primero colaboradores en `organization_staff`, luego workspaces, proyectos, sprints y finalmente lotes de tareas. Ademas, omite asignar el campo `task_role` y las membresias en `task_workspace_members` para el staff nuevo.
- **Impacto:**
  Si un lote de 50 tareas falla por un error de formato o timeout de conexion, no existe rollback. Quedan workspaces, proyectos y staff a medio crear ensuciando la base de datos del cliente.
- **Solucion Tecnica:**
  Envolver la importacion masiva en una transaccion PostgreSQL mediante una funcion RPC (`import_task_bundle_atomic`) que ejecute `ROLLBACK` en caso de error, y poblar adecuadamente `task_role` y `task_workspace_members`.

---

#### A6. Destruccion Cruzada de Sprints Activos Inter-Workspace en `startSprint`
- **Archivos:** `src/modules/features/tasks/actions/task-sprint-actions.ts:337-343`.
- **Causa Raiz:**
  Al iniciar un sprint en estado de planificacion, la consulta ejecuta `update({ status: 'completed' }).eq('organization_id', auth.organizationId).eq('status', 'active')` sin filtrar por `workspace_id`.
- **Impacto:**
  En agencias con multiples departamentos o workspaces independientes, cuando un equipo inicia su Sprint, la server action finaliza automaticamente el sprint activo de los demas workspaces, dejando sus tareas activas atrapadas en un sprint completado sin efectuar rollover ni devolucion al backlog.
- **Solucion Tecnica:**
  Restringir la finalizacion automatica unicamente a los sprints del mismo espacio:
  ```typescript
  .eq("organization_id", auth.organizationId)
  .eq("workspace_id", sprintToStart.workspace_id)
  .eq("status", "active")
  ```

---

#### A7. Omision Total de `revalidatePath` en Todo el Portal de Colaboradores
- **Archivos:** `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (2,670 lineas).
- **Causa Raiz:**
  En las 2,670 lineas de `collaborator-portal-actions.ts` no existe ni una sola invocacion a `revalidatePath`.
- **Impacto:**
  Cuando un colaborador o un Project Manager interactua desde el portal completando tareas, marcando entregables, eliminando tickets o agregando comentarios, la plataforma administrativa (`/operations/tasks`) continua entregando HTML estatico en cache desactualizado.
- **Solucion Tecnica:**
  Agregar llamadas a `revalidatePath("/operations/tasks")` en `portalUpdateTask`, `portalCompleteDeliverable`, `portalToggleChecklistItem`, `portalCreateTask`, `portalDeleteTask`, `portalBulkDeleteTasks` y `portalCompleteMeetingSession`.

---

#### A8. Sobrescritura Destructiva de Horas Reales y Descarte Silencioso de Horas Imputadas en Portal
- **Archivos:** `src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx:660-673`, `src/modules/features/tasks/actions/collaborator-portal-actions.ts:1914-1916, 2130-2138`.
- **Causa Raiz:**
  1. En `task-portal-detail-modal.tsx`, el cliente calcula el total sumando su estado local y envia `actualHours: totalActualHours`. Si otro miembro registro horas concurrentemente, su aporte queda pisado y destruido.
  2. En `portalUpdateTask`, si el cliente envia `{ loggedHours: 2, note: "avance" }` sin adjuntar `actualHours`, el servidor registra el comentario de auditoria pero no incrementa `actual_hours` en `task_items`.
- **Impacto:**
  Perdida irreversible de horas de trabajo registradas y distorsion grave en la rentabilidad y calculo de costos de proyectos.
- **Solucion Tecnica:**
  Manejar la imputacion de horas de forma delta incremental en el servidor leyendo el valor actual de la base de datos y sumando `loggedHours`.

---

#### A9. Multiplicacion Exponencial de Tareas Recurrentes por Falta de Transaccion en Cron
- **Archivos:** `src/app/api/cron/tasks-recurrence/route.ts:133-191`.
- **Causa Raiz:**
  El cron inserta primero la nueva instancia de la tarea con `is_recurring: true` (linea 133), y lineas mas abajo ejecuta el update para marcar la anterior con `is_recurring: false` (linea 187).
- **Impacto:**
  Si la conexion falla o Vercel corta la ejecucion por timeout entre ambas operaciones, la nueva tarea queda creada y la vieja sigue figurando como recurrente vencida. En la proxima ejecucion del cron, ambas tareas son procesadas, creando 2 tareas mas, y luego 4, generando una explosion exponencial de duplicados.
- **Solucion Tecnica:**
  Actualizar primero la tarea previa marcando un flag o actualizando `next_recurrence_at` de forma atomica antes de insertar la nueva instancia, o envolver la operacion en una funcion transaccional de PostgreSQL.

---

### SEVERIDAD MEDIA

#### M1. Multi-Query N+1 Redundante con Descarga Masiva de Tareas en Carga SSR
- **Archivos:** `src/app/(dashboard)/operations/tasks/page.tsx:25-32`, `src/modules/features/tasks/actions/task-actions.ts:262, 432, 579, 1756`.
- **Causa Raiz:**
  `page.tsx` invoca en paralelo `getWorkspaces`, `getProjects`, `getTasks` y `getCollaborators`. Cada una de las primeras tres funciones descarga de manera redundante la tabla completa `task_items` para efectuar agrupaciones y conteos en memoria dentro del proceso Node.js.
- **Impacto:**
  Sobrecarga innecesaria de red y memoria. En organizaciones con miles de tareas, el servidor transfiere cuatro veces la tabla completa en cada peticion SSR.
- **Solucion Tecnica:**
  Reemplazar los escaneos completos en memoria por agregaciones directas en SQL (`count(*)`, `GROUP BY workspace_id`, `GROUP BY project_id`).

---

#### M2. Escaneo no Acotado de Comentarios Historicos y Auditoria por Regex en Portal
- **Archivos:** `src/modules/features/tasks/actions/collaborator-portal-actions.ts:495-515, 733-762`.
- **Causa Raiz:**
  Para calcular la cantidad de comentarios no leidos, el portal descarga todos los comentarios historicos de la organizacion sin paginacion ni filtro de fecha. Asimismo, para generar logs de auditoria se buscan cadenas con `ilike` y expresiones regulares en Javascript sobre el texto de los comentarios.
- **Impacto:**
  Degradacion constante del tiempo de respuesta del portal conforme el historial de discusion crece.
- **Solucion Tecnica:**
  Crear una vista indexada o tabla relacional `task_audit_logs` con columnas estructuradas para el tipo de evento.

---

#### M3. Perdida de Relaciones Foraneas en Realtime y Descarte Asimetrico en INSERT
- **Archivos:** `src/modules/features/tasks/components/task-manager-view.tsx:150-166`, `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx:574-590, 634-650`.
- **Causa Raiz:**
  1. Al recibir un evento UPDATE, el payload contiene unicamente campos planos de `task_items`. La logica de merge local conserva intactos los objetos anteriores (`assigned_staff: t.assigned_staff`), manteniendo avatares y nombres obsoletos si la tarea cambio de responsable.
  2. En el portal, el listener de INSERT solo procesa tareas cuyo `origin_type === "support"`. Si se le asigna una tarea ordinaria nueva al colaborador, este no la recibe hasta recargar la pagina.
- **Impacto:**
  Desactualizacion visual en tiempo real y perdida de reactividad en el portal para tareas regulares.
- **Solucion Tecnica:**
  1. Si `assigned_staff_id` cambia en un UPDATE, rehidratar la relacion buscando en el catalogo de colaboradores ya cargado en memoria.
  2. Permitir que el listener INSERT del portal incorpore tareas ordinarias asignadas al colaborador actual.

---

#### M4. Duplicacion Masiva de Codigo en Modales de Detalle (4,725 Lineas Duplicadas)
- **Archivos:** `src/modules/features/tasks/components/modals/task-detail-modal.tsx` (2,013 lineas) y `src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx` (2,712 lineas).
- **Causa Raiz:**
  Ambos modales implementan de manera separada casi la misma interfaz y logica de gestion de subtareas, entregables, notas, imputaciones de tiempo, subida de archivos y comentarios.
- **Impacto:**
  Deuda tecnica critica. Cualquier correccion o ajuste de interfaz debe duplicarse manualmente en dos archivos gigantescos, propiciando divergencias funcionales.
- **Solucion Tecnica:**
  Extraer la logica en componentes modulares compartidos: `<TaskChecklistEditor />`, `<TaskTimeTracker />`, `<TaskDiscussionFeed />` y `<TaskDeliverablesTable />`.

---

#### M5. Bloque Muerto Inalcanzable de 270 Lineas en `task-metrics-view.tsx`
- **Archivos:** `src/modules/features/tasks/components/metrics/task-metrics-view.tsx:55-78, 80-357`.
- **Causa Raiz:**
  La linea 55 ejecuta:
  ```typescript
  if (tasks.length > 0 || collaborators.length > 0) {
    return <TaskPmOperationsDashboard ... />;
  }
  ```
  Las lineas 80 a 357 corresponden a una interfaz legacy de tarjetas y graficos que solo se alcanzaria si `tasks` y `collaborators` estuvieran vacios pero el objeto `metrics` tuviera datos, situacion logicamente imposible.
- **Impacto:**
  270 lineas de codigo muerto que inflan el tamano del bundle del cliente y confunden el mantenimiento.
- **Solucion Tecnica:**
  Eliminar el bloque legacy y unificar la vista de metricas exclusivamente en `TaskPmOperationsDashboard`.

---

#### M6. Bucle N+1 de Peticiones HTTP en Cron de Pacing Snapshots con Filtro Inexistente
- **Archivos:** `src/app/api/cron/tasks-pacing-snapshot/route.ts:48-105`.
- **Causa Raiz:**
  1. El cron consulta `task_items` con `.neq("status", "archived")`. El estado `archived` no existe en la restriccion CHECK de PostgreSQL (`task_items_status_check`).
  2. Ejecuta un bucle `for (const task of tasks)` disparando una peticion HTTP `UPDATE` individual por cada tarea de la base de datos sin paginacion ni procesamiento por lotes.
- **Impacto:**
  Con cientos o miles de tareas, la ejecucion excede los limites de tiempo de ejecucion de Vercel/Node.js, fallando a mitad del proceso.
- **Solucion Tecnica:**
  Implementar la actualizacion de snapshots mediante una sola consulta SQL agrupada o procesar en lotes de 100 con `upsert`.

---

#### M7. Discrepancia de Validacion de Entregables entre Tablero Kanban y Vista Lista
- **Archivos:** `src/modules/features/tasks/components/kanban/task-kanban-board.tsx:503-508`, `src/modules/features/tasks/components/list/task-list-view.tsx:315-330`.
- **Causa Raiz:**
  En el tablero Kanban, al arrastrar una tarjeta a "Completado", el evento valida estrictamente si hay entregables pendientes y bloquea el movimiento con un toast de advertencia. En la vista de lista, el dropdown Select permite seleccionar "Completado" sin validar el checklist, disparando el downgrade silencioso del servidor.
- **Impacto:**
  Experiencia de usuario inconsistente dentro de la misma plataforma administrativa.
- **Solucion Tecnica:**
  Aplicar la misma comprobacion de entregables incompletos en el callback `onValueChange` del Select en `task-list-view.tsx`.

---

#### M8. Deriva Temporal en Matriz de Pacing Mensual por Falta de Campo `completed_at`
- **Archivos:** `src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx:185-191`.
- **Causa Raiz:**
  La matriz mensual filtra tareas terminadas evaluando `new Date(task.updated_at || task.created_at)`. Dado que `task_items` carece de una columna `completed_at`, cualquier edicion menor a una tarea completada hace meses renueva su `updated_at`, haciendo que reaparezca indebidamente en el mes en curso.
- **Impacto:**
  Reportes de pacing historicos adulterados y metricas de rendimiento mensual distorsionadas.
- **Solucion Tecnica:**
  Crear una migracion para anadir la columna `completed_at TIMESTAMPTZ` a `task_items` y poblarla unicamente al transicionar a `done`.

---

### SEVERIDAD BAJA

#### B1. Persistencia Volatil de Lectura de Hilos en `localStorage`
- **Archivos:** `src/modules/features/tasks/utils/support-thread-read-state.ts:13-44`.
- **Causa Raiz:**
  Los contadores de mensajes no leidos se almacenan en el `localStorage` del navegador cliente.
- **Impacto:**
  Al cambiar de navegador, dispositivo o borrar datos de navegacion, todos los tickets de soporte vuelven a marcarse como no leidos.
- **Solucion Tecnica:**
  Persistir el puntero `last_read_at` en una tabla relacional indexada `task_support_reads(staff_id, task_id, last_read_at)`.

---

#### B2. Sobrescritura Concurrente de `app_metadata` al Gestionar Etiquetas
- **Archivos:** `src/modules/features/tasks/actions/task-tag-actions.ts:83-91, 181-189`.
- **Causa Raiz:**
  Las etiquetas se guardan dentro del campo JSONB `app_metadata` de la organizacion. Al modificarlas, se sobreescribe la columna entera.
- **Impacto:**
  Si otra operacion actualiza simultaneamente otra propiedad en `app_metadata`, una de las dos escrituras se pierde.
- **Solucion Tecnica:**
  Migrar las etiquetas a una tabla relacional dedicada `task_tags(id, organization_id, name, label, color, is_favorite)`.

---

#### B3. UUIDs Huerfanos en JSONB de Checklists y Asistencias al Eliminar Colaboradores
- **Archivos:** `src/modules/features/tasks/actions/task-actions.ts:2130-2180`.
- **Causa Raiz:**
  `deleteCollaborator` desvincula claves foraneas relacionales (`assigned_staff_id`, `qa_staff_id`), pero no limpia los arreglos JSONB de subtareas (`checklist`) ni de reuniones (`meeting_attendees`).
- **Impacto:**
  La UI intenta renderizar avatares o nombres de colaboradores borrados, provocando valores nulos o texto en blanco.
- **Solucion Tecnica:**
  Ejecutar una rutina de saneamiento sobre las columnas JSONB al borrar un colaborador para establecer dichos identificadores en `null`.

---

#### B4. Calculo O(M*N) sin Memoizacion Granular en Ribbon y Dashboard de Colaboradores
- **Archivos:** `src/modules/features/tasks/components/portal/task-collaborator-ribbon.tsx:98-130`, `src/modules/features/tasks/components/portal/task-pm-operations-dashboard.tsx:550-598`.
- **Causa Raiz:**
  Dentro de `useMemo`, se itera sobre todos los colaboradores y por cada uno se filtran todas las tareas y subtareas sin una tabla hash intermedia.
- **Impacto:**
  Micro-bloqueos en el hilo principal de React en clientes con gran cantidad de tareas y miembros.
- **Solucion Tecnica:**
  Indexar las tareas en un mapa unidimensional `Map<string, TaskItem[]>` previo a la iteracion de colaboradores.

---

## 4. MATRIZ CONSOLIDADA DE PRIORIZACION TECNICA (28 HALLAZGOS)

| ID | Severidad | Modulo / Archivo Principal | Descripcion Sintetica | Riesgo Operativo |
|---|---|---|---|---|
| **C1** | Critica | `task-actions.ts` / `task-manager-view.tsx` | Desincronizacion de `done` a `in_review` (95%) | Estado falso y confusion de usuarios |
| **C2** | Critica | `task-actions.ts` (`deleteWorkspace`, `deleteProject`, etc.) | IDOR y eliminacion sin filtro `organization_id` | Fuga y destruccion de datos multitenant |
| **C3** | Critica | `task-actions.ts` (`registerMeetingAttendance`) | Server action publica sin autorizacion de horas | Fraude e inyeccion de horas facturadas |
| **C4** | Critica | `collaborator-portal-actions.ts` | Desbloqueo prematuro de tareas dependientes | Trabajo sucesor iniciado antes de QA |
| **C5** | Critica | `task-sprint-actions.ts` (`getActiveSprint`) | Mutacion de sprints en consulta de lectura GET | Carrera concurrente y duplicacion |
| **C6** | Critica | `types.ts` (`isStaffLeadOrPmRole`) | Escalacion de privilegios PM a roles de QA | Testers con permiso de borrar tareas y sprints |
| **C7** | Critica | `task-sprint-actions.ts` / `task-tag-actions.ts` | Confianza ciega en `providedOrgId` | IDOR multitenant en sprints y tags |
| **A1** | Alta | `task-actions.ts` (`createTask`) | Omision de `sprint_id` y `blocked_reason` | Tareas y tickets promovidos pierden sprint |
| **A2** | Alta | `collaborator-portal-actions.ts` | Prefijo ignorado y generacion concurrente de ticket | Colision de correlativos duplicados |
| **A3** | Alta | `task-actions.ts` / `task-sprint-actions.ts` | Rutas fantasma y falta de revalidacion | Cache desactualizada en panel de operaciones |
| **A4** | Alta | `task-actions.ts` vs `collaborator-portal-actions.ts` | Reglas de progreso dispares entre portales | Salto de validaciones desde el portal |
| **A5** | Alta | `task-import-actions.ts` | Importador masivo sin rollback atomico | Corrupcion parcial en importaciones CSV/Jira |
| **A6** | Alta | `task-sprint-actions.ts` (`startSprint`) | Cierre indiscriminado de sprints en toda la org | Sprints activos de otros workspaces cerrados |
| **A7** | Alta | `collaborator-portal-actions.ts` | Ausencia total de `revalidatePath` en portal | Plataforma desincronizada de actividad portal |
| **A8** | Alta | `task-portal-detail-modal.tsx` / `portal-actions.ts` | Sobrescritura destructiva de horas reales | Perdida de registros de horas concurrentes |
| **A9** | Alta | `tasks-recurrence/route.ts` | Desorden transaccional en cron recurrente | Multiplicacion exponencial de tareas |
| **M1** | Media | `src/app/(dashboard)/operations/tasks/page.tsx` | 4 queries paralelas a toda la tabla en SSR | Latencia elevada y sobrecarga de red |
| **M2** | Media | `collaborator-portal-actions.ts` | Escaneo completo de comentarios y regex | Consumo excesivo de memoria del servidor |
| **M3** | Media | `task-manager-view.tsx` / Realtime | Perdida de relaciones foraneas en UPDATE | Avatares y asignados viejos en pantalla |
| **M4** | Media | `task-detail-modal.tsx` / `task-portal-detail-modal.tsx` | 4,725 lineas duplicadas entre modales | Severa deuda tecnica y divergencia |
| **M5** | Media | `task-metrics-view.tsx` | 270 lineas de renderizado inalcanzables | Codigo muerto inflando el bundle JS |
| **M6** | Media | `tasks-pacing-snapshot/route.ts` | Bucle N+1 de HTTP updates y status invalido | Timeouts en snapshots cron de fin de semana |
| **M7** | Media | `task-list-view.tsx` vs `task-kanban-board.tsx` | Validacion asimetrica de checklist en listas | Saltarse entregables segun la vista usada |
| **M8** | Media | `task-weekly-pacing-matrix.tsx` | Filtrado de tareas terminadas por `updated_at` | Tareas historicas reaparecen en mes activo |
| **B1** | Baja | `support-thread-read-state.ts` | Estado de lectura alojado en `localStorage` | Perdida de lectura al cambiar de equipo |
| **B2** | Baja | `task-tag-actions.ts` | Sobrescritura de `app_metadata` al mutar tags | Colisiones con otros modulos del sistema |
| **B3** | Baja | `task-actions.ts` (`deleteCollaborator`) | UUIDs borrados persisten dentro de JSONB | Avatares en blanco en subtareas historicas |
| **B4** | Baja | `task-collaborator-ribbon.tsx` | Iteraciones O(M*N) sin mapa hash en cliente | Degradacion de FPS con equipos grandes |

---

## 5. PREGUNTAS RESTANTES Y BRECHAS

1. **Unificacion del Modelo de Permisos y Roles de Colaboradores:**
   La base de datos cuenta con la columna estructurada `task_role` (`'pm' | 'qa_lead' | 'developer' | 'designer' | ...`) y con la columna libre de texto `role` en `organization_staff`. Se requiere que la direccion tecnica confirme si se deprecara de forma definitiva el parseo heuristico de texto en favor exclusivo del enum tipado `task_role`.
2. **Definicion de Transaccionalidad Nativa para Numeracion de Tickets:**
   Dada la ausencia de un constraint UNIQUE en PostgreSQL sobre `(organization_id, ticket_code)`, se debe definir si se implementara una secuencia nativa por workspace o si se creara una tabla de secuencias atomicas bloqueada con `SELECT ... FOR UPDATE` para evitar cualquier riesgo de colision en creaciones masivas o concurrentes.
3. **Persistencia Relacional de Sprints y Tags:**
   Las etiquetas de tareas se almacenan actualmente en la columna JSONB `app_metadata` de la organizacion, con riesgo de sobreescritura. Se recomienda evaluar la implementacion de una migracion que cree la tabla relacional `task_tags`.
4. **Fase Inmediata Recomendada para el Equipo de Desarrollo:**
   - **Sprint 1 (Seguridad y Multi-tenancy):** Corregir de inmediato C2, C7 (aislamiento estricto con `organization_id`), C3 (autenticacion en asistencia de reuniones) y C6 (restringir `isStaffLeadOrPmRole` para eliminar la escalacion de privilegios a testers).
   - **Sprint 2 (Consistencia de Datos y Operatividad):** Subsanar C1 (retorno de estado real al cliente), C4 (mover desbloqueo a QA formal), A1 (incorporar `sprint_id` y `blocked_reason` a `createTask`), A6 (restringir `startSprint` al workspace correspondiente) y A8 (imputacion incremental de horas en portal).
   - **Sprint 3 (Arquitectura y Rendimiento):** Eliminar mutaciones en `getActiveSprint` (C5), corregir las revalidaciones (A3 y A7), corregir los crons (A9 y M6) y optimizar la carga SSR consolidando consultas (M1).
