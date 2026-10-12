---
schema_version: 1
id: tasks-portal.technical-capabilities
title: Utilizar capacidades técnicas especializadas (Código VCS, Diseño, Monitoreo y Costos)
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
  - capacidades tecnicas
  - vcs
  - git
  - figma
  - monitoreo
  - costos
  - tarifas
  - figma preview
requirements:
  - Contar con la capacidad técnica correspondiente asignada por rol o configuración personalizada
evidence:
  - path: src/modules/features/tasks/types.ts
    symbol: resolveCollaboratorCapabilities
    claim: Resuelve las capacidades vcs_code, design_preview, monitoring y finance_costs a partir del rol del colaborador y sus overrides en settings.
  - path: src/modules/features/tasks/components/detail/task-vcs-container.tsx
    symbol: TaskVcsContainer
    claim: Renderiza la sección de ramas Git, commits y Pull Requests cuando la capacidad vcs_code está habilitada.
---

# Utilizar capacidades técnicas especializadas (Código VCS, Diseño, Monitoreo y Costos)

## Propósito
Instruir a los especialistas sobre el uso de las 4 pestañas y herramientas técnicas avanzadas integradas en el modal de detalle de cada requerimiento: control de versiones Git/VCS, previsualización de prototipos de diseño, telemetría de monitoreo y análisis de costos financieros.

## Matriz de capacidades por rol
El portal resuelve dinámicamente qué pestañas mostrar a cada usuario según su especialidad:

| Capacidad | Función en el portal | Habilitada por defecto para |
|---|---|---|
| **Código y Ramas (`vcs_code`)** | Generación de nombres de rama Git (`feature/TK-101`), inspección de commits y enlaces a Pull Requests / merge. | Desarrolladores, QA Leads y Project Managers |
| **Prototipos de Diseño (`design_preview`)** | Previsualización embebida de lienzos de Figma y pantallas de interfaz sin salir del portal. | Diseñadores, QA Leads y Project Managers |
| **Telemetría de Errores (`monitoring`)** | Seguimiento de eventos en Sentry / APM asociados al ticket y alertas de estabilidad técnica. | Desarrolladores, QA Leads y Project Managers |
| **Costos y Finanzas (`finance_costs`)** | Tarifa horaria del colaborador, costo presupuestado vs costo real acumulado del requerimiento. | Exclusivamente Project Managers |

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Barra de pestañas secundarias ubicada debajo de la descripción general del ticket.

## Procedimiento paso a paso

### 1. Trabajar con la pestaña de Código / VCS (Desarrolladores y QA)
1. Abre el modal de detalle de la tarea en la que vas a programar.
2. Haz clic en la pestaña **Código / VCS** (icono de rama Git).
3. Verás la sugerencia de nomenclatura estándar generada por la plataforma (por ejemplo: `git checkout -b feature/TK-102-autenticacion-oauth`).
4. Presiona el botón de copiar para llevarte el comando a tu terminal de desarrollo.
5. Si tu equipo tiene habilitada la integración con GitHub/GitLab, en esta pestaña verás los commits vinculados con el código del ticket y el estado del Pull Request (abierto, en revisión o fusionado).

### 2. Utilizar la Previsualización de Diseño (Diseñadores y QA)
1. En tareas vinculadas a interfaces de usuario, haz clic en la pestaña **Diseño / Prototipo** (icono de paleta).
2. Si el requerimiento cuenta con una URL de Figma válida, el portal cargará el marco de diseño interactivo directamente dentro del modal.
3. Permite al desarrollador y al tester contrastar los entregables contra el diseño aprobado sin necesidad de abrir herramientas externas.

### 3. Consultar la Telemetría de Monitoreo
1. En requerimientos de corrección de bugs o incidentes de producción, accede a la pestaña **Monitoreo**.
2. Observarás los eventos de error registrados en la plataforma de observabilidad vinculada, la traza de excepciones y la frecuencia de ocurrencia del fallo.

### 4. Consultar Costos Financieros (Solo Project Managers)
1. Los directores de proyecto verán la pestaña adicional **Costos y Presupuesto**.
2. Desglosa el costo financiero total del ticket multiplicando las horas reales imputadas por la tarifa horaria confidencial de cada colaborador involucrado.
3. Permite auditar la rentabilidad del proyecto en tiempo real.

## Resultado esperado
Un entorno de ingeniería unificado que conecta las especificaciones de negocio con las herramientas reales de código, diseño, calidad y finanzas del equipo.

## Errores y límites conocidos
- **Pestañas no visibles:** Si perteneces a un rol operativo general (por ejemplo, redactor o consultor comercial) y necesitas acceder a la pestaña de diseño o código, el administrador de la empresa debe habilitarte el permiso específico mediante un ajuste de capacidades personalizadas en tu ficha de colaborador (`staff.settings.capabilities`).

## Notas de verificación
- Algoritmo de resolución: `resolveCollaboratorCapabilities` en `src/modules/features/tasks/types.ts` (líneas 900–960)
- Contenedor visual de VCS: `src/modules/features/tasks/components/detail/task-vcs-container.tsx`
