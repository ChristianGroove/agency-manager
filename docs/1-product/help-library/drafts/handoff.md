# Informe de Entrega Editorial: Revisión Incremental Post-Seguridad y Cuota de Tasks (Handoff)

Fecha de entrega: 12 de octubre de 2026.  
Entorno de trabajo: `G:\Pixy\agency-manager\tmp\pet-release` (rama `codex/pixyrobotpet-release`).  
Revisión Git de referencia (HEAD): `4063682d86bc2ad07e4977e54e89fbbddcd6d47b`.  
Base previa del corpus: `docs/1-product/help-library/reviews/tasks-master-release-reviewed-20261012.json` (48 artículos, contrato `hash_encoding: utf8-lf`).  
Revisor editorial: Gemini (revisión editorial incremental contra código fuente; helpers de seguridad, migración SQL y pruebas tácticas autoría de Codex).

---

## 1. Resumen Ejecutivo de la Entrega

En cumplimiento del encargo definido en `docs/3-development/operations/gemini-help-post-security-review-brief.md`:

1. **Auditoría incremental de seguridad (14 artículos afectados por hash):**
   - Se contrastó el diff `cf6ddb1e..HEAD` sobre los archivos `collaborator-portal-actions.ts` y `task-actions.ts`.
   - Se confirmó que la gran mayoría de las funciones invocadas por las guías (`portalUploadTaskAttachment`, `portalAddTaskComment`, `portalCreateTask`, `portalCompleteMeetingSession`, `portalUpdateTaskStatus`, `portalUpdateTaskQuickNote`, `portalToggleChecklist`, `portalUpdateTaskProgress`, `createTask`, `updateTaskStatus`) no sufrieron cambios en su lógica interna; sus afirmaciones continúan plenamente válidas tras la intervención táctica.
   - Se documentaron las 5 acciones de mutación que fueron efectivamente endurecidas (`portalUpdateTaskPriority`, `portalAssignTask`, `portalDeleteTask`, `portalBulkDeleteTasks` y `deleteTasks` en dashboard).
   - Se explicitaron las restricciones de gobernanza: precedencia de roles estructurados (`task_role`), validación de PIN en sesión (`isPortalSessionUnlocked`), pertenencia al mismo tenant para reasignaciones, aislamiento estricto de ámbito para líderes por asignación, límite de 1000 IDs y filtros repetidos en sentencias de escritura.

2. **Corrección de hallazgo de interfaz en `help.chat-and-history.md`:**
   - Se rectificó la ubicación del navegador de preguntas (`HelpTurnNavigator`): se encuentra centrado verticalmente en el **margen derecho** de la ventana del chat (`right-1 top-1/2 -translate-y-1/2`), con la tarjeta flotante de previsualización desplegándose hacia la izquierda (`right-11`), desmintiendo la afirmación errónea de que se ubicaba en el lateral izquierdo.

3. **Documentación de la cuota compartida en PostgreSQL:**
   - Se documentó la nueva cuota centralizada de **10 consultas por minuto por organización** implementada mediante `reserve_dashboard_help_request` (`20261012000005_dashboard_help_quota.sql`) y `dashboard-quota.ts`.
   - Se explicaron sus características: bloqueo a nivel de fila (`FOR UPDATE`), lectura de tiempo posterior al bloqueo, compartición entre todas las pestañas y miembros activos del tenant, aplicación uniforme en legacy, V2 y turnos de cortesía, exención de consultas con errores de formato (<3 o >500 caracteres) o hilos inaccesibles, y mensajes de advertencia correspondientes. Se aclaró que no es un presupuesto de tokens ni un límite diario acumulado.

4. **Actualización de borradores, inventario y banco de evaluación:**
   - Se vincularon las nuevas evidencias de código (`task-mutation-access.ts`, `task-actions.ts`, `dashboard-quota.ts`, `ask-help-assistant.ts`).
   - Se actualizaron las preguntas **Q09** (navegador derecho) y **Q31** (autorización canónica en tenant destinatario y límite de 1000 IDs para borrado en lote) en `questions.json`.
   - Se actualizaron `inventory.json` y `gaps.md` (secciones 8 y 9).

5. **Generación del manifiesto completo `drafts/publication-review.json`:**
   - 48 artículos con contrato `"hash_encoding": "utf8-lf"`.
   - Hashes SHA-256 de todos los borradores calculados con normalización CRLF -> LF.
   - Hashes SHA-256 de todas las evidencias de código fuente actualizados conforme al HEAD vigente.
   - Filtros de visibilidad, permisos IAM, perfiles del portal (`portal_profiles`), capacidades (`required_portal_capabilities`) y rutas de enlace preservados con exactitud.

6. **Validación estructural exitosa:**
   - `npm run help:validate` ejecutado con resultado exitoso: 65 preguntas válidas, 48 artículos conformes.

---

## 2. Detalle de Artículos y Cambios Aplicados

### 2.1. Guías con Evidencia Modificada por el Diff (14 Artículos)

| ID del Artículo | Evidencia Afectada | Estado de Funciones y Afirmaciones |
|---|---|---|
| `tasks-portal.attachments-and-files` | `collaborator-portal-actions.ts` | `portalUploadTaskAttachment` sin cambios en código. Procedimiento de subida y almacenamiento seguro plenamente válido. |
| `tasks-portal.bulk-actions` | `collaborator-portal-actions.ts` | `portalBulkDeleteTasks` modificado. Se documentó: validación de token/PIN, `can_bulk_delete_tasks: false` deniega prioritariamente, `true` autoriza lote pero no concede borrado unitario ni reasignación, aislamiento de ámbito para líderes por asignación, límite de 1000 IDs, batches de 100 y no-atomicidad distribuida con Google Calendar. Evidencia añadida: `task-mutation-access.ts` (`requirePortalTaskMutation`). |
| `tasks-portal.comments-and-mentions` | `collaborator-portal-actions.ts` | `portalAddTaskComment` sin cambios en código. Parsing de menciones `@nombre` y auditoría de autoría plenamente válidos. |
| `tasks-portal.create-task-collaborator` | `collaborator-portal-actions.ts` | `portalCreateTask` sin cambios en código. Política de Backlog, horas en 0 y asignación propia plenamente válidas. |
| `tasks-portal.create-task-pm` | `collaborator-portal-actions.ts` | `portalCreateTask` sin cambios en código. Creación avanzada de dos columnas para PMs plenamente válida. |
| `tasks-portal.meetings-and-meet` | `collaborator-portal-actions.ts` | `portalCompleteMeetingSession` sin cambios. Se aclaró que la cancelación en Google Calendar al borrar una reunión es secuencial y no forma una transacción distribuida 2PC con la base de datos. |
| `tasks-portal.qa-review-flow` | `collaborator-portal-actions.ts` | `portalUpdateTaskStatus` sin cambios en transiciones QA. Flujo de certificación y reporte de bugs plenamente válidos. |
| `tasks-portal.quick-notes` | `collaborator-portal-actions.ts` | `portalUpdateTaskQuickNote` sin cambios en código. Aislamiento por `staff.id` (Zero-Leak) plenamente válido. |
| `tasks-portal.subtasks-checklist` | `collaborator-portal-actions.ts` | `portalToggleChecklist` sin cambios en código. Protección de completado por asignado y transición al 100% plenamente válidas. |
| `tasks-portal.task-lifecycle-and-status` | `collaborator-portal-actions.ts` | `portalUpdateTaskStatus` sin cambios en transiciones estándar. Se documentó que mutaciones de prioridad (`portalUpdateTaskPriority`), asignación (`portalAssignTask`) y borrado (`portalDeleteTask`) exigen token, PIN, tenant activo y roles estructurados en `task-mutation-access.ts`. Evidencia añadida: `requirePortalTaskMutation`. |
| `tasks-portal.task-progress-and-slider` | `collaborator-portal-actions.ts` | `portalUpdateTaskProgress` sin cambios en código. Regla del 95% ante subtareas pendientes plenamente válida. |
| `tasks-portal.worklog-and-hours` | `collaborator-portal-actions.ts` | `portalUpdateTaskStatus` sin cambios en imputación de horas. Prohibición de registro en tareas `done` plenamente válida. |
| `tasks.meetings-and-calendar` | `task-actions.ts` | `createTask` sin cambios en código. Programación de actividades sincrónicas con prefijo MTG plenamente válida. |
| `tasks.task-lifecycle-and-views` | `task-actions.ts` | `updateTaskStatus` sin cambios en código. Flujo Kanban, listas y desbloqueo automático de dependencias plenamente válidos. |

### 2.2. Guías del Dashboard y Ayuda Central con Controles Nuevos

| ID del Artículo | Archivo Modificado | Controles Documentados y Evidencias Añadidas |
|---|---|---|
| `help.chat-and-history` | [`help.chat-and-history.md`](articles/help.chat-and-history.md) | **1. Corrección UI:** Navegador de preguntas (`HelpTurnNavigator`) centrado en el margen derecho, con previsualización flotante hacia la izquierda.<br>**2. Cuota Compartida:** 10 req/min por organización en PostgreSQL (`reserve_dashboard_help_request`), bloqueo `FOR UPDATE`, compartida entre sesiones/pestañas, aplicable a V2, legacy y cortesía.<br>**3. Fallo seguro:** Consultas con hilos inaccesibles o <3 o >500 caracteres no consumen cuota; errores de persistencia no guardan mensajes rotos.<br>**4. Evidencias:** `dashboard-quota.ts` (`reserveDashboardHelpQuota`) y `ask-help-assistant.ts` (`askAndPersistHelp`). |
| `tasks.manage-tasks` | [`tasks.manage-tasks.md`](articles/tasks.manage-tasks.md) | **1. Borrado en grupo:** Acción `deleteTasks` requiere autorización canónica de gestión en el tenant destino (`operations.tasks.manage`, `owner` o superadmin). Prohibición de préstamo entre organizaciones y rechazo de membresías bloqueadas.<br>**2. Validación de lote:** Deduplica entre 1 y 1000 IDs de tareas, procesando en bloques de 100.<br>**3. Evidencias:** `task-mutation-access.ts` (`requireDashboardTaskManagement`) y `task-actions.ts` (`deleteTasks`). |
| `tasks-portal.access-and-pin` | [`tasks-portal.access-and-pin.md`](articles/tasks-portal.access-and-pin.md) | **Verificación de PIN en mutaciones:** Se documentó que el PIN se comprueba en el servidor (`isPortalSessionUnlocked`) antes de autorizar mutaciones de tareas (prioridad, reasignación, borrado unitario y masivo). Evidencia añadida: `task-mutation-access.ts` (`requirePortalTaskMutation`). |

---

## 3. Actualizaciones en Banco de Preguntas e Inventario

### 3.1. `questions.json`
- **Revisión de referencia:** Actualizada a `4063682d86bc2ad07e4977e54e89fbbddcd6d47b`.
- **Q09 (`¿Cómo puedo saltar rápidamente a una pregunta específica que hice antes en el mismo chat?`):**
  - Se actualizaron los puntos esperados indicando el uso de los marcadores en el margen derecho (`HelpTurnNavigator`) y la previsualización desplegada hacia la izquierda.
  - Se agregó la cláusula restrictiva obligatoria: *«No afirmar que los marcadores se ubican en el lateral izquierdo del chat»*.
- **Q31 (`¿Cómo elimino varias tareas al mismo tiempo en la lista?`):**
  - Se especificó el rango válido de selección (entre 1 y 1000 identificadores únicos).
  - Se puntualizó la exigencia de autorización canónica en el tenant destinatario (`operations.tasks.manage`, `owner` o superadmin) y la prohibición de prestar permisos entre diferentes organizaciones activas.

### 3.2. `inventory.json`
- **Revisión de referencia:** Actualizada a `4063682d86bc2ad07e4977e54e89fbbddcd6d47b`.
- **Módulo `help-history`:** Se agregó `src/modules/features/caa/library/dashboard-quota.ts` a `evidence_paths`.
- **Módulo `tasks`:** Se agregó `src/modules/features/tasks/services/task-mutation-access.ts` a `evidence_paths` y se actualizaron los gaps del módulo.

### 3.3. `gaps.md`
- Se actualizaron los metadatos de cabecera a la rama `codex/pixyrobotpet-release` y revisión `4063682d86bc2ad07e4977e54e89fbbddcd6d47b`.
- **Sección 8 (Nueva):** Documentación técnica de la cuota compartida en PostgreSQL (`help_dashboard_tenant_limits`, `reserve_dashboard_help_request`, bloqueo `FOR UPDATE`, ventana móvil de 1 minuto, exenciones de consultas inválidas).
- **Sección 9 (Nueva):** Documentación técnica de los guards de mutación en Tasks (`task-mutation-access.ts`), detallando las 5 acciones endurecidas, el alcance acotado de líderes asignados, la precedencia de `can_bulk_delete_tasks: false`, la repetición de filtros en sentencias de escritura, los gaps que permanecen abiertos en las demás acciones del módulo y la no-atomicidad distribuida con Google Calendar.

---

## 4. Manifiesto de Publicación (`publication-review.json`)

Se generó de forma íntegra `docs/1-product/help-library/drafts/publication-review.json` bajo las siguientes especificaciones:
- **`schema_version`:** `1`.
- **`hash_encoding`:** `"utf8-lf"`.
- **Total de artículos:** `48` (26 de Dashboard + 22 de Portal Tasks).
- **Hashes de borradores (`draft_sha256`):** Calculados con SHA-256 sobre el contenido en UTF-8 LF (`reviewText(..., 'utf8-lf')`).
- **Hashes de evidencias (`evidence_sha256`):** 100% sincronizados con los archivos reales del checkout actual bajo normalización LF.
- **Filtros y metadatos:** Preservados sin modificaciones respecto al baseline auditado:
  - Artículos de dashboard conservan `required_modules`, `required_permissions`, `verticals` y `link_route`.
  - Artículos de portal conservan `portal_profiles`, `required_portal_capabilities`, `required_modules: ["module_tasks"]`, `required_permissions: []` y `link_route: null`.
- **Validación con schema:** Se verificó exitosamente con `reviewSchema.parse()` y se simuló el proceso completo de mapeo a corpus contra `draftSchema` y `corpusSchema`, confirmando coincidencia exacta de los 48 artículos y todas sus evidencias.

---

## 5. Validación y Próximos Pasos

### 5.1. Ejecución de Validaciones
```bash
node node_modules/tsx/dist/cli.mjs scripts/help-library.mjs validate
```
**Resultado:**
- Preguntas con referencias válidas: **65**.
- Artículos estructuralmente válidos: **48**.
- Código de salida: **0**.

### 5.2. Deslinde de Responsabilidad y Límites Respetados
- Todo el trabajo se mantuvo estrictamente en `docs/1-product/help-library/drafts/`.
- No se modificaron archivos en `src/`, migraciones en `supabase/`, configuraciones de entorno, dependencias en `package.json` ni commits en Git.
- No se ejecutó `help:publish` en runtime ni se alteró el artefacto compilado `published.json`.
- No se realizó navegación automatizada en navegadores ni llamadas directas con costos de modelo.

### 5.3. Handoff a Codex
La biblioteca de ayuda queda actualizada y verificada para que Codex proceda con:
1. La integración de los borradores y manifiesto de revisión.
2. La ejecución de la suite completa de pruebas unitarias y de integración.
3. La evaluación semántica del banco de preguntas y la compilación/publicación oficial del corpus (`npm run help:publish`).
