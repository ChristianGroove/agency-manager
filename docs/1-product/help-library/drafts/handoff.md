# Informe de Entrega Editorial: Resolución de Incidencias Ronda 2 (Handoff)

Fecha de entrega: 12 de octubre de 2026.
Entorno de trabajo: `G:\Pixy\agency-manager\tmp\pet-workspace` (rama `pixyrobotpet`).
Revisión Git de referencia (HEAD): `047fa7ee0cadc0f49d9ce08220f633885b0801a7`.
Revisor editorial: Gemini (revisión editorial contra código fuente).

---

## 1. Resumen Ejecutivo de la Entrega

En respuesta a las dos incidencias señaladas en la revisión de integración `docs/1-product/help-library/reviews/gemini-round2-20261012.md`:

1. **Separación de reportes analíticos y pipeline comercial (Incidencia de Filtros):**
   - Se segregó la funcionalidad de reportes analíticos en una guía dedicada: [`crm.crm-reports.md`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/articles/crm.crm-reports.md), con módulo `crm-reports`, audiencia `tenant-admin` y ruta `/crm/reports`.
   - Se restauró la guía de pipeline [`crm.manage-pipeline.md`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/articles/crm.manage-pipeline.md) exclusivamente para el tablero Kanban (`/crm/pipeline`), manteniendo sus requisitos en `core_crm` y `crm.leads.view` sin imponer restricciones de reportes a usuarios operativos.
   - Se diferenció rigurosamente la **visibilidad en el menú lateral** (gobernada por `module-config.ts` con `parentModule: 'module_crm_reports'` y `allowedRoles: ['owner']`) frente a la **autorización efectiva de backend** (`getAdvancedReports` en `analytics-actions.ts`, que filtra por `organization_id` sin un guard estricto de roles). La discrepancia quedó documentada en las limitaciones del artículo y en la Sección 7 de [`gaps.md`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/gaps.md).
   - Se ajustó **Q60** en [`questions.json`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/questions.json) hacia `crm.crm-reports`.
   - Se actualizó [`inventory.json`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/inventory.json) separando los módulos `crm-pipeline` y `crm-reports`.

2. **Corrección de métricas de evaluación y metodología (Incidencia de Evaluación):**
   - Se corrigieron las cifras del handoff: el banco de evaluación contiene **65 preguntas en total**, clasificadas por comportamiento esperado en:
     - **56 preguntas de respuesta directa (`answer`):** La simulación determinista de recuperación léxica offline obtiene **56/56 aciertos (100% de hit rate)** sobre el denominador real de 56.
     - **4 preguntas de aclaración (`clarify`):** Consultas ambiguas diseñadas para solicitar contexto adicional al usuario, evaluables por comportamiento conversacional y no por hit léxico.
     - **5 preguntas de abstención (`abstain`):** Consultas sobre funciones no soportadas o fuera de alcance donde el asistente debe abstenerse de formular afirmaciones erróneas.
   - **Metodología y deslinde técnico:** La medición reportada corresponde estrictamente a una simulación offline de conveniencia ejecutada sobre `retrieveHelp` (`src/modules/features/caa/library/retrieval.ts`) para comprobar que los borradores contienen la indexación léxica suficiente. **No constituye la ejecución del pipeline oficial de evaluación de Codex ni representa una certificación del modelo de lenguaje.** La evaluación formal con modelos, verticales y suites de regresión técnica será ejecutada por Codex una vez integrado el candidato.

3. **Regeneración íntegra de `publication-review.json`:**
   - Se recalculó el manifiesto de publicación para los **21 artículos** borradores, con hashes SHA-256 actualizados de todos los archivos y de sus evidencias en código fuente.

4. **Validación estructural:**
   - `npm run help:validate` finalizó con código de salida `0` (65 preguntas válidas, 21 artículos estructuralmente conformes).

5. **Límites de intervención respetados:**
   - Trabajo circunscrito a `docs/1-product/help-library/drafts/`.
   - Sin modificaciones en `src/`, dependencias, migraciones ni base de datos.
   - Sin publicaciones en runtime (`help:publish`) ni commits en Git.

---

## 2. Resolución Detallada de Incidencias

### 2.1. Incidencia de Filtros: Separación de Reportes y Pipeline

#### A. Pipeline Comercial (`crm.manage-pipeline`)
- **Archivo:** [`docs/1-product/help-library/drafts/articles/crm.manage-pipeline.md`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/articles/crm.manage-pipeline.md)
- **Audiencia:** `tenant-user`
- **Rutas:** `["/crm/pipeline"]`
- **Módulo requerido en publicación:** `core_crm`
- **Permisos requeridos:** `["crm.leads.view"]`
- **Evidencias en código:**
  - `src/app/(dashboard)/crm/pipeline/page.tsx` (`CRMPipelinePage`)
  - `src/modules/features/crm/components/crm-dashboard.tsx` (`CRMDashboard`)
  - `src/modules/features/crm/crm-actions.ts` (`getPipelineViewDataAction`)
- **Contenido:** Se eliminó toda mención a `/crm/reports`, métricas de analítica y exportación de reportes PDF. La guía se enfoca de manera estricta en el tablero Kanban, etapas del embudo comercial, arrastre de tratos (*drag-and-drop*) y permisos de edición (`crm.leads.edit`).

#### B. Reportes Analíticos (`crm.crm-reports`)
- **Archivo:** [`docs/1-product/help-library/drafts/articles/crm.crm-reports.md`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/articles/crm.crm-reports.md)
- **Audiencia:** `tenant-admin`
- **Rutas:** `["/crm/reports"]`
- **Módulo requerido en publicación:** `module_crm_reports`
- **Permisos requeridos:** `[]` (sujeto a rol Dueño en configuración de ruta)
- **Evidencias en código:**
  - `src/app/(dashboard)/crm/reports/page.tsx` (`ReportsPage`)
  - `src/modules/features/crm/services/logic/analytics-actions.ts` (`getAdvancedReports`)
  - `src/modules/core/saas/module-config.ts` (`MODULE_ROUTES`)
- **Contenido:**
  - Diagnóstico de métricas clave: Leads Nuevos, Leads Activos, Conversión, Valor Pipeline, Tiempo de Respuesta (SLA < 5m) y Leads en Abandono (>24h).
  - Gráficas de tendencia de actividad (Recharts) y distribución por fuentes de captación.
  - Tabla de rendimiento de asesores comerciales con métricas individuales y descarga de informes de agente.
  - Filtros por presets temporales (Hoy, 7d, 15d, 30d, 60d, 90d) y selector de rango personalizado con calendario (`Calendar`).
  - Exportación de informe formal en PDF mediante `CrmPdfTemplate`, `html-to-image` y `jsPDF` con membrete corporativo (`getEffectiveBranding`).

#### C. Verificación Técnica: Menú vs. Backend y Registro en `gaps.md`
- **Menú lateral:** En `src/modules/core/saas/module-config.ts` (líneas 141-151), `/crm/reports` se define con `parentModule: 'module_crm_reports'` y `access: { allowedRoles: ['owner'] }`. La función `filterRoutesByModules` restringe la visibilidad del botón en la barra lateral exclusivamente a usuarios con rol Dueño (`owner` o `dueño`) en tenants suscritos a `module_crm_reports`.
- **Backend y Server Actions:** En `src/modules/features/crm/services/logic/analytics-actions.ts`, la acción `getAdvancedReports` valida `getCurrentOrganizationId()` pero no evalúa pertenencia a `owner` ni comprueba la suscripción activa a `module_crm_reports` antes de ejecutar la RPC `get_advanced_crm_reports`. Tampoco existe middleware de Next.js que restrinja `/crm/reports`.
- **Registro en `gaps.md`:** Se añadió la Sección 7 documentando esta discrepancia arquitectónica entre el filtrado cosmético de navegación y la autorización de ejecución en servidor.

#### D. Actualización de Inventario y Pregunta Q60
- **`inventory.json`:** Se separó el módulo `crm-reports` de `crm-pipeline`, documentando sus respectivas rutas y evidencias.
- **`questions.json` (Q60):**
  - `expected_article_ids: ["crm.crm-reports"]`
  - Audiencia: `tenant-admin`
  - Puntos esperados: Ubicación en `/crm/reports`, vinculación en menú al módulo `module_crm_reports` y rol `owner`, visualización de métricas de conversión/rendimiento con filtros de fecha y exportación en PDF.
  - Afirmaciones prohibidas: No afirmar que no está implementado, no afirmar que cualquier miembro puede ver el acceso directo en menú, y no afirmar la existencia de un guard backend de roles en `getAdvancedReports`.

---

### 2.2. Incidencia de Evaluación: Denominadores Reales y Metodología Verificable

#### A. Desglose del Banco de Evaluación (65 Preguntas)
El banco en [`docs/1-product/help-library/drafts/questions.json`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/questions.json) está conformado por:

| Tipo de Comportamiento (`expected_behavior`) | Cantidad de Casos | Criterio de Evaluación Aplicable |
|---|---|---|
| **Respuesta Directa (`answer`)** | **56** | **Recuperación léxica de artículo relevante (`expected_article_ids`). Denominador de retrieval.** |
| **Aclaración Requerida (`clarify`)** | **4** | Validación de diálogo conversacional: el asistente debe pedir precisiones ante ambigüedad sin asumir hechos. |
| **Abstención (`abstain`)** | **5** | Validación de abstención: el asistente debe rechazar educadamente temas ajenos o no soportados sin inventar capacidades. |
| **Total Banco de Evaluación** | **65** | **100% de las preguntas poseen referencias y esquema estructuralmente válidos.** |

#### B. Resultados de la Simulación Léxica Offline
- **Comando de prueba ejecutado:**
  ```bash
  npx tsx scratch/test-retrieval-questions.mjs
  ```
- **Método:** Invocación directa de la función pura `retrieveHelp` exportada por `src/modules/features/caa/library/retrieval.ts`, alimentada con los 21 borradores y los metadatos de acceso correspondientes al perfil de cada pregunta.
- **Resultado en casos `answer` (denominador 56):**
  - **Aciertos:** 56 / 56 (**100%**).
  - Casos críticos de rondas anteriores:
    - **Q29** (`automation.create-workflows`): Hit positivo (score prioritario con términos de bienvenida y primer contacto).
    - **Q49** (`iam.manage-roles`): Hit positivo (score prioritario para consulta administrativa de roles del sistema).
    - **Q60** (`crm.crm-reports`): Hit positivo (primer resultado recuperado para reportes de rendimiento y conversión del CRM).
- **Advertencia metodológica:** Esta medición certifica únicamente que la indexación de vocabulario, títulos y rutas en los borradores permite a la heurística determinista seleccionar el artículo objetivo. No sustituye la evaluación integral del pipeline oficial de Codex con LLMs, que medirá la generación de respuestas, citas y las políticas de aclaración y abstención.

---

## 3. Manifiesto Completo de Publicación (`publication-review.json`)

El archivo [`docs/1-product/help-library/drafts/publication-review.json`](file:///G:/Pixy/agency-manager/tmp/pet-workspace/docs/1-product/help-library/drafts/publication-review.json) contiene la aprobación formal de los **21 artículos**, con sus filtros comprobados y hashes vigentes recalculados:

| ID del Artículo | Módulos Requeridos | Permisos Requeridos (IAM V2) | Verticales | Ruta de Enlace (`link_route`) |
|---|---|---|---|---|
| `theme.toggle-theme` | `[]` | `[]` | `[]` | `null` |
| `pet.pet-interaction` | `[]` | `[]` | `[]` | `null` |
| `help.chat-and-history` | `[]` | `[]` | `[]` | `null` |
| `inbox.manage-conversations` | `["module_messaging"]` | `[]` | `[]` | `null` |
| `inbox.saved-replies-and-templates` | `["module_messaging"]` | `[]` | `[]` | `"/crm/inbox"` |
| `inbox.manage-channels` | `["module_messaging"]` | `["inbox.channels.manage"]` | `[]` | `"/crm/settings/channels"` |
| `branding.manage-adn` | `["core_settings"]` | `[]` | `[]` | `null` |
| `branding.brand-center` | `["core_settings"]` | `["operations.branding.manage"]` | `[]` | `"/platform/settings"` |
| `pet.manage-pet` | `[]` | `[]` | `[]` | `null` |
| `dashboard.overview` | `[]` | `[]` | `[]` | `"/dashboard"` |
| `iam.manage-roles` | `["core_settings"]` | `["org.roles.manage"]` | `[]` | `"/platform/settings/roles"` |
| `iam.invite-members` | `["core_settings"]` | `["org.members.manage"]` | `[]` | `"/platform/settings"` |
| `crm.manage-contacts` | `["core_clients"]` | `["crm.leads.view"]` | `[]` | `"/crm/contacts"` |
| `crm.manage-pipeline` | `["core_crm"]` | `["crm.leads.view"]` | `[]` | `"/crm/pipeline"` |
| `crm.crm-reports` | `["module_crm_reports"]` | `[]` | `[]` | `"/crm/reports"` |
| `billing.manage-invoices` | `["module_invoicing"]` | `["invoicing.view"]` | `[]` | `"/invoices"` |
| `automation.create-workflows` | `["module_automation"]` | `["automation.workflows.view"]` | `[]` | `"/automations"` |
| `tasks.manage-tasks` | `["module_tasks"]` | `["operations.tasks.view"]` | `[]` | `"/operations/tasks"` |
| `quotes.create-quotes` | `["module_quotes"]` | `[]` | `[]` | `"/quotes"` |
| `resto.manage-menu` | `["module_resto_menu"]` | `["operations.resto_menu.view"]` | `["resto"]` | `"/menu"` |
| `resto.manage-orders` | `["module_resto_orders"]` | `["operations.resto_orders.view"]` | `["resto"]` | `"/resto-orders"` |

- **Revisor:** `"reviewed_by": "Gemini: source verification and editorial review"`.
- **Fecha:** `"2026-10-12"`.

---

## 4. Resultado de Validación Automatizada

```bash
$ npm run help:validate

> agency-manager@0.1.0 help:validate
> tsx scripts/help-library.mjs validate

Preguntas con referencias válidas: 65. Evaluación semántica pendiente.
Artículos estructuralmente válidos: 21. Esto no certifica sus procedimientos.
```

- **Código de salida:** `0`.
- **Estado del checkout:** Completamente limpio en el código productivo (`src/`, `package.json`, configuraciones de base de datos). Todas las modificaciones residen estrictamente en `docs/1-product/help-library/drafts/`.
