# Arquitectura del Módulo de Gestión de Tareas (Task Management)

Este documento detalla la estructura, funcionamiento, reglas de negocio y patrones de diseño del módulo de Gestión de Tareas (`tasks`), sus portales de acceso rápido para colaboradores y gestores de proyecto, y su integración con el ecosistema de PIXY Agency Manager.

---

## 1. Visión General

El módulo de Gestión de Tareas orquesta el ciclo de vida operativo de los tickets y sprints en proyectos de la agencia. Proporciona:
- **Portales Seguros por Token**: Entornos dedicados para colaboradores externos o miembros del equipo sin necesidad de credenciales directas de base de datos.
- **Doble Perspectiva por Rol**:
  - **Colaborador / Especialista**: Vista enfocada en entregables propios, minimizando ruido visual (columna de responsable oculta), con slider de progreso seguro y checklist interactivo.
  - **Gestor de Proyecto (PM / Lead)**: Puesto de comando futurista con switch de doble vista (*Dashboard de Telemetría* con KPIs, gráficos de velocidad, distribución de carga y horas estimadas vs. reales, y *Vista de Gestión* con monitor de especialistas en cinta interactiva y supervisión de responsables).
- **Consistencia Visual con la Plataforma**: Fondo global `bg-gray-100 dark:bg-[#0a0a0a]` con partículas animadas (`GlobalParticles`), adaptación reactiva al ADN de Marca (logos dark/light y color corporativo primario), y avatares 3D con efecto pop-out flotante.

---

## 2. Modelo de Datos Central

La base de datos se estructura alrededor de las tablas del esquema relacional en Supabase (`supabase/migrations/20260912000000_create_task_management_module.sql`):

### Tabla: `tasks`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador único de la tarea. |
| `organization_id` | UUID | Tenant propietario del ticket (SaaS multi-tenant). |
| `project_id` | UUID | Proyecto o Sprint asociado (`task_projects`). |
| `ticket_code` | Text | Código legible autogenerado (ej: `TK-108`, `MS-107`). |
| `title` | Text | Título descriptivo del ticket. |
| `description` | Text | Alcance técnico, especificaciones y criterios de aceptación. |
| `status` | Text (`TaskStatus`) | `backlog`, `todo`, `in_progress`, `in_review`, `blocked`, `done`. |
| `priority` | Text (`TaskPriority`) | `low`, `medium`, `high`, `urgent`. |
| `type` | Text (`TaskType`) | `feature`, `bug`, `improvement`, `review`, `documentation`. |
| `assigned_staff_id` | UUID | Especialista asignado a la ejecución (`staff`). |
| `qa_staff_id` | UUID | Revisor asignado a la etapa de aseguramiento de calidad. |
| `progress_percentage` | Integer | Porcentaje de avance registrado (0 a 100). |
| `estimated_hours` | Numeric | Horas estimadas para la tarea. |
| `actual_hours` | Numeric | Horas reales invertidas reportadas. |
| `checklist` | JSONB | Lista de entregables y criterios (`TaskChecklistItem[]`). |
| `attachments` | JSONB | Enlaces de Figma, repositorios, documentos o archivos adjuntos. |
| `due_date` | Timestamp | Fecha límite de entrega del sprint. |

### Tabla: `task_projects`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador del proyecto. |
| `organization_id` | UUID | Tenant propietario. |
| `name` | Text | Nombre del proyecto o sprint. |
| `color` | Text | Color hexadecimal para identificación visual en chips y badges. |
| `is_active` | Boolean | Estado de vigencia del proyecto. |

### Tabla: `task_comments`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador del comentario. |
| `task_id` | UUID | Tarea a la que pertenece el hilo. |
| `staff_id` | UUID | Autor del mensaje (colaborador o PM). |
| `content` | Text | Contenido con soporte de menciones (@). |
| `created_at` | Timestamp | Marca de tiempo para orden cronológico del hilo. |

---

## 3. Server Actions y Lógica de Negocio

El módulo separa estrictamente las operaciones administrativas internas de las acciones accesibles mediante token público:

### `collaborator-portal-actions.ts` (Portales Públicos por Token)
- **`getCollaboratorPortalData(token)`**: Resuelve de forma segura el miembro del staff mediante token firmado, cargando su organización, proyectos activos, tareas asignadas (y todas las tareas del sprint si es PM/Lead), menciones recientes y configuración de marca.
- **`portalUpdateTaskProgress(token, taskId, progress)`**: Actualiza el avance verificando que colaboradores estándar no puedan retroceder progreso ya guardado y validando la regla del 95%.
- **`portalUpdateTaskStatus(token, taskId, status)`**: Transiciona el estado del ticket (`todo`, `in_progress`, `in_review`, `blocked`, `done`).
- **`portalToggleChecklist(token, taskId, itemId, completed)`**: Marca o desmarca entregables específicos en el JSONB del ticket.
- **`portalAddTaskComment(token, taskId, content)`**: Publica comentarios en el ticket y emite notificaciones por menciones (@).
- **`portalCreateTask(token, data)`**: Permite a gestores de proyecto crear tickets de sprint directamente desde el portal.

---

## 4. Reglas de Negocio y Restricciones Operativas

1. **Regla de Entregables al 95%**:
   - Una tarea **no puede avanzar al 100% ni marcarse como completada (`done`)** si tiene entregables pendientes en su checklist.
   - Si se intenta llevar el slider al 100% o marcar "Listo" existiendo criterios pendientes, el sistema frena el avance en **95%**, ajusta el estado a `in_review` y notifica al usuario.
2. **Slider de Progreso Seguro (Prevención de Guardado Accidental)**:
   - Mientras el usuario mantenga sostenido el slider (`onValueChange`), el valor se actualiza en memoria local para una interacción visual fluida sin disparar peticiones de guardado a la base de datos.
   - El commit real (`onValueCommit`) solo se ejecuta al soltar el clic.
   - Si el colaborador retrocede antes de soltar, puede retornar al punto fijado sin perder el estado previo.
3. **Visibilidad Contextual de Responsable**:
   - En la tabla de la vista de lista, la columna `Responsable` se renderiza **únicamente para Gestores de Proyecto (`isLeadOrPm`)**.
   - Para colaboradores estándar, la columna se omite por completo, maximizando el espacio de visualización de títulos, proyectos y sliders de progreso.
4. **Soporte Integral de Estado "Bloqueado"**:
   - El estado `blocked` se representa transversalmente en la **Tabla** (badge rojo "Bloqueado"), **Kanban** (columna dedicada "Bloqueadas"), **Vista Compacta**, **Cuadrícula** y **Filtros Rápidos**.

---

## 5. Arquitectura de Componentes en Frontend

```
src/modules/features/tasks/
├── actions/
│   └── collaborator-portal-actions.ts       # Server Actions autenticadas por token
├── components/
│   ├── collaborators/
│   │   └── task-collaborators-manager.tsx   # Panel de gestión de colaboradores y modal con selector 3D
│   ├── kanban/
│   │   └── task-kanban-board.tsx            # Tablero Kanban con DnD (@dnd-kit)
│   └── portal/
│       ├── task-collaborator-portal.tsx     # Contenedor raíz del portal (vistas, hero, toolbar, tabla)
│       ├── task-collaborator-ribbon.tsx     # Monitor de equipo (cinta horizontal de especialistas)
│       ├── task-pm-operations-dashboard.tsx # Dashboard futurista para PMs (Recharts, telemetría)
│       └── task-portal-detail-modal.tsx     # Modal completo de gestión, entregables y comentarios
├── types.ts                                 # Tipos TypeScript compartidos (TaskItem, TaskStatus, etc.)
└── utils/
    └── avatar-presets.ts                    # Hash determinista para el paquete de 11 avatares 3D
```

---

## 6. Experiencia de Usuario y Diseño

- **Fondo Global y Partículas**: Uso de `GlobalParticles` (`components/layout/global-particles.tsx`) con pre-warming de animaciones para presencia inmediata en pantalla completa y soporte de color corporativo (`brandColor`).
- **Header Limpio**: Icono estándar de perfil (`User` de `lucide-react`) en la barra superior para evitar duplicidad visual con el avatar grande del Hero.
- **Hero Pop-Out 3D**: Avatar 3D con posición absoluta, +10% de tamaño adicional y desborde libre (`overflow-visible`) por encima de la tarjeta con efecto sutil de flotación vertical (`motion.div`).
- **Cinta Monitora Ultrarrápida**: Avatares sin contenedor plano flotando sobre las tarjetas, microinteracciones a 120ms sin recálculos de layout forzados, y zoom dinámico para el especialista seleccionado.
