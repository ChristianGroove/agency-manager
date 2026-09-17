# Reporte de Auditoría y Estabilización: Módulo de Gestión de Tareas (Tasks)
**Fecha: 2026-09-17**  
**Alcance: Plataforma Central (`/operations/tasks`) y Portales de Colaboradores (`/portal/tasks/[token]`)**

---

## 1. Contexto y Objetivos de la Intervención

Se ejecutó una auditoría profunda y reestructuración del módulo de Gestión de Tareas para resolver problemas de diseño de interfaz (antipatrones en modales, placeholders informales), corregir la jerarquía y control de acceso por espacios de trabajo, auditar y optimizar el rendimiento bajo alta concurrencia de tickets, y resolver integralmente la arquitectura de etiquetas (Tags & Etapas QA).

---

## 2. Resumen de Problemas Resueltos y Acciones Ejecutadas

### A. Jerarquía de Espacios y Control de Acceso Granular (RBAC)
- **Problema**: El selector de proyectos y espacios no reflejaba una jerarquía en árbol clara; los gestores de proyectos (PMs) no tenían permisos claros para crear proyectos ni tickets delimitados por su espacio asignado, y se producía un error al guardar membresías individuales de espacio.
- **Acción**:
  - Implementación de combobox unificado en árbol (Espacios alineados a la izquierda sin dot; Proyectos anidados a la derecha con indentación y dot de color).
  - Botón de edición contextual con icono de lápiz para editar el espacio o proyecto seleccionado en caliente.
  - Creación de membresías de acceso granular en `task_workspace_members` con validación de UUIDs válidos (evitando errores por strings vacíos).
  - Permiso para que PMs puedan crear tanto tickets como proyectos en sus portales, acotados estrictamente a sus espacios asignados.

### B. Rendimiento, Carga y Escalabilidad
- **Problema**: Riesgo de lentitud y DOM bloat con volumen alto de tickets en tableros Kanban y tablas.
- **Acción**:
  - **Migración de Índices (`20260916000003_optimize_task_indexes.sql`)**: Creación de índices compuestos para `(organization_id, project_id, status)`, `(organization_id, assigned_staff_id)`, `(organization_id, created_at DESC)` y `(organization_id, staff_id)`.
  - **Caché y Paralelismo**: Adopción de `React.cache()` y `Promise.all()` en `collaborator-portal-actions.ts`.
  - **Paginación en Lista**: Selector de 10, 25, 50 y 100 tickets por página en `TaskListView`.
  - **Memoización y $O(n)$ en Kanban**: `TaskKanbanCard` memoizado con `React.memo` y clasificación en una sola iteración.
  - **Aislamiento de Sliders y Lazy Loading**: Componente `PortalTaskSlider` aislado de re-renders globales y carga diferida de animaciones Lottie (celebración y alertas).

### C. Limpieza de Cabeceras en Modales (Estilo Linear / Jira)
- **Problema**: Existían badges engañosos que simulaban ser botones interactivos (`+ NUEVO TICKET`), duplicación del nombre del proyecto en la barra superior y badges de rol redundantes (`Gestor de Proyecto (Configuración Completa)`, `Modo Gestor PM`).
- **Acción**:
  - Eliminación de falsos botones y badges de rol en [`task-form-modal.tsx`](file:///G:/Pixy/agency-manager/src/modules/features/tasks/components/modals/task-form-modal.tsx) y [`task-portal-detail-modal.tsx`](file:///G:/Pixy/agency-manager/src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx).
  - Cabecera limpia y minimalista: `<CheckSquare className="w-4 h-4 text-primary" />` con el título del modal, botón de acción principal (`Crear Ticket` o `Guardar Cambios`) y botón de cierre `X`.

### D. Placeholder Minimalista y Profesional
- **Problema**: El input de título contenía un placeholder informal y saturado (`"Ej. Integración de webhooks, diseño de pantalla de pago, QA..."`).
- **Acción**:
  - Estandarización unificada al placeholder profesional: `"Título de la tarea o requerimiento..."` en todos los modales (`task-form-modal.tsx`, `task-detail-modal.tsx`, `task-portal-detail-modal.tsx`).

### E. Sistema Integral de Etiquetas (Tags & Etapas QA)
- **Problema**: No existía interfaz para añadir etiquetas en la creación ni en los portales; en detalle solo había 4 botones fijos y en Kanban/Lista las etiquetas personalizadas se ocultaban debido a un bug (`!sysTag return null`).
- **Acción**:
  - Creación del componente unificado [`TaskTagSelector.tsx`](file:///G:/Pixy/agency-manager/src/modules/features/tasks/components/tags/task-tag-selector.tsx) con soporte para:
    1. Etapas clave del sistema (`qa-failed`, `uat`, `vendor-blocked`, `ready-for-release`) conectadas a los filtros de estado.
    2. Etiquetas libres tipo `#` con input dinámico y desinfección automática.
    3. Chips removibles con botón `×`.
  - Integración en `task-form-modal.tsx`, `task-detail-modal.tsx` y `task-portal-detail-modal.tsx`.
  - Persistencia en base de datos vía `createTask`, `updateTask`, `portalCreateTask` y `portalUpdateTask`.
  - Corrección visual en `task-kanban-board.tsx`, `task-list-view.tsx` y `task-collaborator-portal.tsx` para mostrar todas las etiquetas.

---

## 3. Matriz de Archivos Modificados / Creados

| Archivo | Tipo de Modificación |
|---|---|
| `docs/2-architecture/modules/task-management-architecture.md` | **[ACTUALIZADO]** Documentación integral de arquitectura del módulo de tareas |
| `docs/4-history/audits/TASK_MANAGEMENT_STABILIZATION_AND_REFACTOR.md` | **[NUEVO]** Registro histórico de estabilización y auditoría |
| `src/modules/features/tasks/components/tags/task-tag-selector.tsx` | **[NUEVO]** Componente unificado para gestión de etiquetas y etapas |
| `src/modules/features/tasks/components/modals/task-form-modal.tsx` | **[MODIFICADO]** Cabecera limpia, nuevo placeholder, tags selector y persistencia |
| `src/modules/features/tasks/components/modals/task-detail-modal.tsx` | **[MODIFICADO]** Integración de `TaskTagSelector`, nuevo placeholder |
| `src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx` | **[MODIFICADO]** Cabecera limpia, placeholder, soporte de tags en creación y edición |
| `src/modules/features/tasks/actions/collaborator-portal-actions.ts` | **[MODIFICADO]** Persistencia de `tags` en `portalCreateTask` y `portalUpdateTask` |
| `src/modules/features/tasks/components/kanban/task-kanban-board.tsx` | **[MODIFICADO]** Corrección de visualización de etiquetas personalizadas y de sistema |
| `src/modules/features/tasks/components/list/task-list-view.tsx` | **[MODIFICADO]** Renderizado completo de etiquetas en la vista de lista |
| `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx` | **[MODIFICADO]** Renderizado de chips de tags en tarjetas y tabla del portal |

---

## 4. Estado de Validación Técnica

- **Chequeo de Tipos (`tsc`)**: `npx tsc --noEmit` ejecutado con éxito sin ningún error de TypeScript (código de salida 0).
- **Servidor de Desarrollo**: Operativo en el puerto `3001` sin advertencias de renderizado.
- **Deuda Técnica**: 0 deuda técnica pendiente en el flujo de tareas, modales y portales.
