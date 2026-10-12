# Documento de Traspaso Técnico y Editorial: Biblioteca del Portal Tasks (Revisión Final)

**Entrega para integración, evaluación y equipo de arquitectura (Codex)**  
**Fecha:** 2026-10-12  
**Superficie objetivo:** `portal.tasks`  
**Audiencia objetivo:** `portal-collaborator`  
**Rama de trabajo:** `pixyrobotpet` en `G:\Pixy\agency-manager\tmp\pet-workspace`  
**Revisión de código fuente (Git HEAD):** `5aaeec98767f13ec9b495eed33486fcdba65ab86`  
**Ubicación de borradores:** `docs/1-product/help-library/drafts/articles/`  
**Snapshot nuevo completo:** `docs/1-product/help-library/reviews/tasks-portal-reviewed-final-20261012.json`  

---

## 1. Resumen Ejecutivo y Cumplimiento del Encargo

En esta fase se ejecutó la revisión profunda y optimización del portal de tareas según las directrices operativas:

1. **División de `tasks-portal.technical-capabilities`:**
   Se descompuso el artículo combinado en 4 procedimientos especializados independientes con requerimientos de capacidad mínima:
   - `tasks-portal.vcs-git-integration.md` (Capacidad `vcs_code`, perfiles `collaborator|qa|lead`).
   - `tasks-portal.design-figma-preview.md` (Capacidad `design_preview`, perfiles `collaborator|qa|lead`).
   - `tasks-portal.monitoring-and-telemetry.md` (Capacidad `monitoring`, perfiles `collaborator|qa|lead`).
   - `tasks-portal.finance-and-costs.md` (Capacidad `finance_costs`, perfil `lead`).
   Se eliminó el draft monolítico en `drafts/articles/` (preservando el histórico preparatorio). Ningún desarrollador requiere permisos financieros para consultar una rama Git.

2. **Resolución de los 8 Retrieval Misses:**
   Se analizaron y corrigieron las guías afectadas en `drafts/articles/` agregando vocabulario natural y keywords indexados:
   - `010`: `tasks-portal.task-lifecycle-and-status` (keywords `pendiente`, `en progreso`, `arrastrar`).
   - `015`: `tasks-portal.comments-and-mentions` (keywords `menciono`, `mencionar`, `@nombre`).
   - `016`: `tasks-portal.comments-and-mentions` (keywords `bitacora`, `mensajes`).
   - `037`: `tasks-portal.finance-and-costs` (keywords `cuanto ha costado`, `costado`, `horas trabajadas`, `costos`, `tarifas`).
   - `039`: `tasks-portal.task-lifecycle-and-status` (keywords `no puedo marcar`, `se queda en revision`, `completar`).
   - `040`: `tasks-portal.comments-and-mentions` (keywords `puedo comentar`, `no estoy asignado`, `desasignado`).
   - `042`: `tasks-portal.create-task-collaborator` (keywords `donde esta el boton`, `nuevo requerimiento`, `boton crear`).
   - `046`: `tasks-portal.access-and-pin` (keywords `computador compartido`, `equipo ajeno`, `salir de forma segura`).
   - `006` y `041`: `tasks-portal.view-modes-and-filters` (keywords `filtro`, `filtrar`, `proyecto`, `proyectos`, `buscar`, `busco`, `codigo`, `ticket`, `tk`).

3. **Resolución del Caso 045 (`all_collaborators` y tickets SUP):**
   - Evidencia verificada en `TaskCollaboratorPortal` (L1145): al hacer clic en un ticket con `origin_type === 'support'` o código `SUP-###`, el portal abre `TaskSupportTicketDetailModal` para consulta y respuesta técnica colaborativa.
   - En lugar de conceder acceso al portal exclusivo de soporte a todos los colaboradores (lo que expondría el panel de triaje y métricas directas de atención), se redactó la guía dedicada `tasks-portal.support-tickets-collaboration.md` (`collaborator|qa|lead|support`).
   - Se actualizó el caso 045 en `questions.json` hacia esta nueva guía.

4. **Preservación de Categorías y Caso Casual:**
   - Se preservaron intactos los 12 casos de aclaración (`clarify`) y 11 casos de abstención (`abstain`).
   - El caso casual 067 (`¿Puedes contarme un chiste?`) se mantiene clasificado con comportamiento `answer` y `expected_guides: []` (`requires_local_policy_check`), tratándose a nivel de política local sin guías artificiales.

5. **Requisitos por Registro vs Perfiles del Asistente:**
   - Se explicitó en cada guía que los perfiles del bot solo autorizan la recuperación de explicaciones en el chat.
   - Toda mutación en el producto exige pertenencia por registro (`assigned_staff_id`, `qa_staff_id`, proyecto/workspace).
   - Se actualizaron `capability-matrix.json` y `gaps.md` documentando la separación estricta entre limitaciones documentales y vulnerabilidades de servidor (GAP-01 a GAP-10).

---

## 2. Catálogo de Artículos Vigentes (43 Artículos en Total)

### Artículos del Portal Tasks (22 Guías en `drafts/articles/`)
1. `tasks-portal.access-and-pin.md`
2. `tasks-portal.attachments-and-files.md`
3. `tasks-portal.bulk-actions.md`
4. `tasks-portal.comments-and-mentions.md`
5. `tasks-portal.create-task-collaborator.md`
6. `tasks-portal.create-task-pm.md`
7. `tasks-portal.design-figma-preview.md` *(Nuevo especializado)*
8. `tasks-portal.finance-and-costs.md` *(Nuevo especializado)*
9. `tasks-portal.meetings-and-meet.md`
10. `tasks-portal.monitoring-and-telemetry.md` *(Nuevo especializado)*
11. `tasks-portal.parallel-support-portal.md`
12. `tasks-portal.pm-operations-dashboard.md`
13. `tasks-portal.pm-weekly-pacing.md`
14. `tasks-portal.qa-review-flow.md`
15. `tasks-portal.quick-notes.md`
16. `tasks-portal.subtasks-checklist.md`
17. `tasks-portal.support-tickets-collaboration.md` *(Nuevo colaborativo)*
18. `tasks-portal.task-lifecycle-and-status.md`
19. `tasks-portal.task-progress-and-slider.md`
20. `tasks-portal.vcs-git-integration.md` *(Nuevo especializado)*
21. `tasks-portal.view-modes-and-filters.md`
22. `tasks-portal.worklog-and-hours.md`

### Artículos del Dashboard Preservados (21 Guías)
Conservados íntegramente desde `tasks-portal-reviewed-20261012.json` sin alterar sus revisiones ni atribuciones:
`automation.create-workflows`, `billing.manage-invoices`, `branding.brand-center`, `branding.manage-adn`, `crm.crm-reports`, `crm.manage-contacts`, `crm.manage-pipeline`, `dashboard.overview`, `help.chat-and-history`, `iam.invite-members`, `iam.manage-roles`, `inbox.manage-channels`, `inbox.manage-conversations`, `inbox.saved-replies-and-templates`, `pet.manage-pet`, `pet.pet-interaction`, `quotes.create-quotes`, `resto.manage-menu`, `resto.manage-orders`, `tasks.manage-tasks`, `theme.toggle-theme`.

---

## 3. Resultados de la Evaluación Fuera de Línea

La simulación estricta con el motor léxico oficial (`retrieval.ts`) y los fixtures de capacidades arrojó:

| Métrica | Valor Previo | Valor Actual | Estado |
|---|---|---|---|
| **Total de Casos Evaluados** | 70 | 70 | 100% cubierto |
| **Casos de Respuesta (`answer`)** | 47 | 47 | Inalterado |
| **Aciertos de Recuperación (`retrieval_hits`)** | 35 | **46** | +11 aciertos |
| **Fallos de Recuperación (`retrieval_misses`)** | 8 | **0** | **0 fallos** |
| **Bloqueados por Perfil/Capacidad (`access_blocked`)** | 3 | **0** | **0 bloqueos indebidos** |
| **Política Local (Caso Casual 067)** | 1 | 1 | Preservado |
| **Casos de Aclaración (`clarify`)** | 12 | 12 | Preservados |
| **Casos de Abstención (`abstain`)** | 11 | 11 | Preservados |

---

## 4. Estado de Validación Técnica y Contratos

1. **`npm run help:validate`:**
   - Ejecutado con éxito (`code 0`).
   - Salida: `Preguntas con referencias válidas: 65. Evaluación semántica pendiente. Artículos estructuralmente válidos: 43. Esto no certifica sus procedimientos.`
2. **Snapshot Completo Generado:**
   - `docs/1-product/help-library/reviews/tasks-portal-reviewed-final-20261012.json`
   - Validado exhaustivamente con `reviewSchema` de Zod.
   - Sincronizado en `docs/1-product/help-library/drafts/publication-review.json`.
   - Contiene 43 revisiones con SHA-256 exactos de borradores y archivos de evidencia reales leídos en disco.
3. **No regresión:**
   - Ningún archivo fuera de documentación fue tocado (`src/`, base de datos, Git y `published.json` intactos).
