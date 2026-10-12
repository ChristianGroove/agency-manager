# Encargo editorial: Tasks en el dashboard

Fecha: 2026-10-12. Trabaja en `G:/Pixy/agency-manager/tmp/pet-workspace`, rama `pixyrobotpet`. Lee primero `pixy-help-maintenance.md` y el contrato de biblioteca en `src/modules/features/caa/library/schema.ts`.

## Problema y prioridades

La ayuda del dashboard solo tiene `tasks.manage-tasks`, una guía general. Las 18 guías `tasks-portal.*` pertenecen exclusivamente al portal y no acreditan UI/permisos del dashboard. El usuario probó desde Movilservicios: «¿Cómo crear una reunión?» y «¿Sabes algo del módulo tareas?». El motor legacy llegó a expresar incertidumbre sobre la existencia del módulo. La activación V2 local se corrige por separado; faltan guías detalladas del dashboard.

Primera prioridad: verificar y redactar cómo **crear y gestionar una reunión desde Tasks en el dashboard**, sus controles/requisitos, participantes, vinculación, recurrencia y Meet únicamente donde estén implementados. Registrar diferencias respecto al portal. Segunda prioridad: navegación y alcance actual del módulo, para explicar claramente qué es Tasks y qué funciones tiene para el perfil autorizado.

## Alcance y límites del trabajo

Revisa código y documentación en lectura; escribe exclusivamente en `docs/1-product/help-library/dashboard-preparation/tasks/`, sin modificar la entrega del portal que pueda estar en curso. No cambies runtime, UI, contratos, migraciones, configuración, secretos, base, Git, corpus compilado ni snapshots históricos. No uses navegador ni servicios externos. No copies guías del portal cambiando solo la superficie.

Puntos de entrada conocidos (verificar antes de atribuir capacidades):

- `src/app/(dashboard)/operations/tasks/page.tsx` y `src/modules/features/tasks/components/task-manager-view.tsx`.
- Componentes `meetings/`, `modals/`, `collaborators/`, `pacing/`, `metrics/`, `detail/`, `kanban/`, `list/` y `calendar/` del módulo Tasks.
- Acciones `task-actions.ts`, `task-sprint-actions.ts`, `task-import-actions.ts`, `task-vcs-actions.ts` y helpers invocados por cada procedimiento.
- `src/modules/core/iam/actions/permissions.ts`, `module-config.ts` y `capabilities-registry.ts`, más guards reales de las acciones.

Audita las funciones expuestas: workspaces/proyectos, tareas/estados/subtareas/dependencias, reuniones, responsables/colaboradores/gestión de sus portales/PIN, sprint/planeación, tiempo/costos/métricas, comentarios/adjuntos, importación y capacidades técnicas. No garantices esta lista por su presencia en archivos: identifica visibilidad, ejecución, permisos y estado real. Divide guías cuando cambien requisitos. La ruta base es `/operations/tasks`, superficie `dashboard`; no uses `portal_profiles` ni `required_portal_capabilities` en guías del dashboard.

No equipares `can_bulk_delete_tasks` del colaborador con una clave IAM canónica. Verifica quién puede borrar masivamente desde dashboard y registra discrepancias de backend sin corregir código. Un botón visible no demuestra autorización. Diferencia gestores del dashboard, PM/QA del portal y colaboradores externos.

## Entregables

1. `inventory.json`: funciones y controles realmente expuestos, fuentes/símbolos, estado y condiciones.
2. `capability-matrix.json`: lectura, gestión y capacidades por función; permiso IAM/módulo real, condiciones por registro y diferencias con el portal.
3. `articles/<id>.md`: borradores compatibles con `draftSchema`, IDs `tasks.<topic>`, `surface: dashboard`, audiencia correcta, evidencia verificable, `verification: source-only`, requisitos y pasos concretos. Incluye una propuesta de actualización/sustitución de `tasks.manage-tasks`; no cambies todavía su copia aceptada.
4. `questions.json`: casos separados de respuesta/aclaración/abstención; incluye las dos preguntas reales y variantes de reunión (crear, participantes, recurrencia, Meet, editar), permisos insuficientes, funciones inexistentes, seguimientos y diferencias dashboard/portal. No declares exactitud por una prueba léxica.
5. `publication-proposal.json`: revisión de los artículos NUEVOS o REVISADOS, con hashes SHA-256 UTF-8 de borradores y evidencias realmente auditadas, fecha/identidad, módulos, permisos, verticales y rutas. Explica cuáles reemplazan un ID existente; Codex combinará con el snapshot global más reciente para no perder el trabajo del portal.
6. `gaps.md` y `handoff.md`: coverage, fuentes/revisión base, diferencias de UI/backend, pendientes y pruebas manuales necesarias. Si cambia una fuente, marcar para reverificación; no recalcular hashes para fingir revisión.

No publiques ni sobrescribas `reviews/tasks-portal-reviewed-20261012.json`. Una propuesta parcial no se pasa directamente a `help:publish`, porque ese comando publica un snapshot completo. Codex validará/adaptará los filtros, combinará la propuesta, publicará, evaluará y recompilará. El usuario verifica respuestas reales en el navegador.
