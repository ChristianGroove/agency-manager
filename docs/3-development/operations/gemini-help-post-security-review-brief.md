# Encargo incremental: biblioteca después de cuota y guards de Tasks

Trabaja exclusivamente en `G:\Pixy\agency-manager\tmp\pet-release`, rama `codex/pixyrobotpet-release`. No usar `pixyrobotpet` ni la rama de Cartera para esta entrega. La base revisada del corpus es `docs/1-product/help-library/reviews/tasks-master-release-reviewed-20261012.json`: 48 artículos, contrato `hash_encoding: utf8-lf`. Conserva ambos ámbitos, IDs, filtros, autoría y snapshots históricos.

## Trabajo de Gemini

Contrasta los cambios de seguridad de esta intervención con las guías afectadas. No repitas la auditoría de todo el proyecto: usa `git diff cf6ddb1e --` para los archivos indicados y lee las funciones afectadas y sus nuevos helpers. Si la intervención ya está committeada, comparar `cf6ddb1e..HEAD`; no borrar cambios concurrentes.

1. Revisar los 14 artículos cuya evidencia cambió de hash:
   - Portal: `attachments-and-files`, `bulk-actions`, `comments-and-mentions`, `create-task-collaborator`, `create-task-pm`, `meetings-and-meet`, `qa-review-flow`, `quick-notes`, `subtasks-checklist`, `task-lifecycle-and-status`, `task-progress-and-slider`, `worklog-and-hours` (prefijo `tasks-portal.`).
   - Dashboard: `tasks.meetings-and-calendar`, `tasks.task-lifecycle-and-views`.
   No asumir que cambiaron todas sus funciones: gran parte del archivo común permanece intacta. Registrar cuáles afirmaciones siguen válidas tras comparar el diff; no refrescar hashes sin verificar.
2. Revisar también `tasks.manage-tasks`, `help.chat-and-history` y los requisitos de perfiles/registro de gestión del portal para documentar los nuevos controles. Vincular evidencia de los helpers/SQL cuando una afirmación dependa de ellos, no únicamente el wrapper.
3. Corregir el hallazgo visible en `help.chat-and-history`: el navegador de preguntas está a la derecha, centrado, no en el lateral izquierdo. Contrastar condiciones vigentes de V2/legacy, conversación casual y persistencia, sin atribuir navegación manual.
4. Actualizar borradores, preguntas, matriz/gaps/handoff necesarios y preparar `drafts/publication-review.json` COMPLETO. Usar SHA-256 UTF-8 sustituyendo solo CRLF por LF; declarar `hash_encoding: utf8-lf`. Preservar los otros artículos y permisos, no flexibilizar filtros para hacer pasar consultas.

## Cambios concretos que debes verificar

- `src/modules/features/caa/actions/ask-help-assistant.ts` y `library/dashboard-quota.ts`: RPC de cuota compartida antes de persistir preguntas o llamar al modelo; 10 consultas/minuto por organización, también en legacy y cortesía. Rechaza cuota agotada, acceso denegado o fallo de comprobación. Validación/hilo inválido no consume cuota.
- `supabase/migrations/20261012000005_dashboard_help_quota.sql`: contador PostgreSQL, bloqueo de fila y tiempo leído después del bloqueo; RPC solo `authenticated`, sin lectura/escritura directa del contador; acceso por usuario/tenant y tenant activo. No es presupuesto monetario ni máximo diario.
- `src/modules/features/tasks/services/task-mutation-access.ts`: IAM de borrado dashboard resuelto en el tenant destinatario, membresía activa y rol perteneciente a ese tenant, con semántica owner/wildcard del sistema y super admin. Portal: token activo, PIN si configurado, tenant activo y módulo Tasks habilitado; perfiles estructurados tienen precedencia. Liderazgo por asignación solo gestiona tareas de su proyecto/espacio, incluyendo espacio heredado del proyecto.
- `task-actions.ts#deleteTasks`: exige autorización de gestión antes de cancelaciones/borrados; IDs válidos, únicos, máximo 1000.
- `collaborator-portal-actions.ts`: prioridad, reasignación, borrado unitario y borrado masivo usan el helper. El responsable de una reasignación debe estar activo en el mismo tenant. Filtros de ámbito se repiten en escrituras; mezcla de tareas accesibles/inaccesibles se rechaza antes de borrar. No certificar atomicidad global de llamadas separadas ni de Google Calendar.
- Borrado masivo: autorización explícita true permite lote; false lo deniega incluso a PM; null usa liderazgo. El permiso de lote por sí solo no concede reasignación ni borrado unitario. Límite de 1000 IDs únicos/selección validada, con consultas/borrado por lotes de 100.
- `services/portal-role-context.ts`: respeta `task_role` al inferir perfil; no confundir perfil del bot/UI con autorización de cada mutación.

Solo se endurecieron esas cinco acciones de mutación: NO afirmar que todas las acciones de Tasks/portal ya validan PIN, módulos, permisos o ámbito. Otros gaps permanecen pendientes de intervenciones separadas.

## Límites y entrega

No cambiar código runtime, migraciones, archivos de entorno, `.next`, dependencias, Git history ni configuración. No publicar el corpus, no hacer commits/push/deploy ni escribir en bases. No leer secretos, tokens, PIN reales ni datos de clientes. Usuario hace navegador; tus verificaciones son `source-only`.

La autoría editorial previa es de Gemini; los helpers y pruebas tácticas son de Codex. Registrar tu revisión incremental con los hashes actuales, sin atribuirte navegación o las pruebas ejecutadas por otro agente. Entrega un handoff breve con guías modificadas, fuentes verificadas, cambios de filtros propuestos y pendientes; Codex integrará y comprobará el pipeline, regresiones y build.
