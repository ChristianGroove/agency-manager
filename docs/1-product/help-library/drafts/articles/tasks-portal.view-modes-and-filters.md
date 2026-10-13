---
schema_version: 1
id: tasks-portal.view-modes-and-filters
title: Navegar entre modos de visualización y filtrar tareas en el portal
module: tasks
status: draft
surface: portal.tasks
audience: portal-collaborator
source_revision: 5aaeec98767f13ec9b495eed33486fcdba65ab86
verified_on: 2026-10-12
verification: source-only
routes:
  - /portal/tasks/[token]
keywords:
  - modos de vista
  - tarjetas
  - lista
  - kanban
  - calendario
  - filtros
  - filtro
  - filtrar
  - proyecto
  - proyectos
  - reuniones
  - buscador
  - buscar
  - busco
  - codigo
  - ticket
  - tk
requirements:
  - 'Acceso al portal de tareas en modo operaciones (`portalMode: ''operations''`)'
evidence:
  - path: src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
    symbol: ViewToggle
    claim: Permite alternar entre cuadrícula de tarjetas, tabla de lista, tablero Kanban y calendario.
  - path: src/modules/core/ui/components/search-filter-bar.tsx
    symbol: SearchFilterBar
    claim: Provee caja de búsqueda por texto y selector de proyectos y colaboradores.
  - path: src/modules/features/tasks/components/shared/task-meeting-view-toggle.tsx
    symbol: TaskMeetingViewToggle
    claim: Alterna de forma exclusiva entre la visualización de tickets de desarrollo y sesiones de reuniones.
---

# Navegar entre modos de visualización y filtrar tareas en el portal

## Propósito
Guiar al colaborador en el uso de los diferentes modos de presentación visual (Tarjetas, Lista tabular, Tablero Kanban y Calendario de entregas) y en la aplicación de filtros para localizar requerimientos y compromisos rápidamente.

## Requisitos y perfiles
- **Perfiles aplicables:** Desarrolladores, Diseñadores, Especialistas, QA y Project Managers.
- **Ámbito:** Portal operativo general de tareas (no aplica para el portal exclusivo de soporte paralelo).

## Ubicación en pantalla
- **Barra de control de vistas:** Ubicada en la parte superior derecha del área de trabajo, junto a la barra de búsqueda.
- **Alternador de actividades:** Botón central para conmutar entre **Ver Tickets** y **Ver Reuniones**.
- **Barra de filtros:** Controles de búsqueda textual, selector de Proyecto/Workspace y pestañas de estado (*Todos*, *Por hacer*, *En progreso*, *En revisión*, *Bloqueadas*, *Completadas*).

## Procedimiento paso a paso

### 1. Cambiar el modo de visualización
En el grupo de iconos de vista en la esquina superior derecha, selecciona la modalidad que mejor se adapte a tu dinámica de trabajo:
1. **Modo Cuadrícula (Tarjetas / Grid):** Presenta cada tarea como una tarjeta gráfica con medidor de avance deslizable, fecha de entrega, prioridad con código de color y conteo de subtareas. Ideal para el trabajo diario individual.
2. **Modo Lista (Tabla / Rows):** Formato tabular estructurado con columnas alineadas (Código de ticket, Título, Proyecto, Prioridad, Estado y Horas). Permite seleccionar múltiples casillas a la izquierda para ejecutar acciones masivas.
3. **Modo Tablero (Kanban):** Muestra columnas verticales por etapa del flujo de trabajo (*Backlog*, *Por hacer*, *En progreso*, *En revisión*, *Bloqueadas* y *Completadas*). Permite visualizar la carga global y arrastrar tarjetas entre estados.
4. **Modo Calendario:** Proyecta las tareas y reuniones en un calendario mensual o semanal con base en su fecha límite (`due_date`) o fecha programada de sesión.

### 2. Alternar entre Entregables y Reuniones
- El portal separa de forma estricta los requerimientos técnicos de las sesiones sincrónicas:
  - Haz clic en **Ver Tickets** para ocultar las reuniones y enfocarte exclusivamente en tus entregables y código.
  - Haz clic en **Ver Reuniones** para listar únicamente tus videollamadas, pases de lista y sesiones agendadas con enlaces a Google Meet.

### 3. Aplicar filtros combinados
1. **Búsqueda por texto:** Escribe en la caja de búsqueda cualquier palabra clave, nombre de entregable o código de ticket (por ejemplo, `TK-104`). La lista se actualizará en tiempo real.
2. **Filtrar por Proyecto o Workspace:** Abre el menú desplegable de proyectos para acotar la visualización únicamente al cliente o módulo en el que estás trabajando.
3. **Pestañas de estado rápido:** Utiliza la barra superior de pestañas para saltar de inmediato a requerimientos *En Progreso* o *En Revisión*.

## Resultado esperado
Una interfaz personalizada y ordenada que reduce el ruido visual y permite al colaborador enfocarse en sus entregas inmediatas según su preferencia operativa.

## Errores y límites conocidos
- **Kanban deshabilitado en modo Reuniones:** Las reuniones sincronizadas no poseen columnas técnicas de desarrollo; si estás en modo Reuniones, el botón Kanban permanecerá deshabilitado con un aviso explicativo.
- **Vista Compacta no disponible:** Aunque en versiones anteriores existía una vista ultracompacta, actualmente está retirada y el selector redirige automáticamente a la vista de Lista estructurada.

## Notas de verificación
- Componente principal: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx`
- Alternador de vistas: `src/modules/core/ui/components/view-toggle.tsx`
- Selector de reuniones: `src/modules/features/tasks/components/shared/task-meeting-view-toggle.tsx`
