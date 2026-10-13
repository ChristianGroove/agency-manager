---
schema_version: 1
id: tasks-portal.design-figma-preview
title: Previsualizar prototipos de diseño y lienzos interactivos de Figma en tareas
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
  - diseno
  - figma
  - prototipos
  - pantalla figma
  - preview figma
  - figma preview
  - design_preview
  - lienzo
  - ui
  - interfaces
  - especificaciones
  - mockup
  - assets
requirements:
  - Capacidad técnica design_preview activa en el perfil del colaborador (por defecto en diseñadores, QA leads y PMs)
  - Requerimiento con enlace válido de Figma adjunto
evidence:
  - path: src/modules/features/tasks/types.ts
    symbol: resolveCollaboratorCapabilities
    claim: Resuelve la capacidad design_preview por defecto para diseñadores, QA leads y PMs, y evalúa overrides en settings.
  - path: src/modules/features/tasks/components/detail/task-attachments-section.tsx
    symbol: TaskAttachmentsSection
    claim: Detecta enlaces a figma.com, clasifica el tipo a figma y renderiza el acceso directo al prototipo de interfaz.
  - path: src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx
    symbol: TaskCollaboratorsManager
    claim: Expone el switch y etiqueta de activación para la capacidad técnica de Diseño e Interfaces en la gestión de colaboradores.
---

# Previsualizar prototipos de diseño y lienzos interactivos de Figma en tareas

## Propósito
Explicar a diseñadores, desarrolladores y revisores de calidad cómo consultar especificaciones de interfaz, previsualizar prototipos interactivos de Figma y descargar assets visuales vinculados directamente a cada requerimiento dentro del portal de tareas.

## Requisitos y perfiles
- **Capacidad mínima requerida:** Capacidad técnica `design_preview`.
- **Perfiles con acceso por defecto:** Diseñadores (`designer`), Líderes QA (`qa_lead`) y Project Managers (`pm` / `pm_lead`).
- **Desarrolladores y especialistas:** Tienen esta capacidad desactivada por defecto para no sobrecargar el flujo operativo, pero el líder o administrador puede otorgársela mediante ajuste personalizado (`staff.settings.capabilities.design_preview: true`).
- **Requisitos por registro:**
  - El colaborador debe pertenecer al workspace y proyecto del ticket para acceder a sus especificaciones.
  - La tarea debe contar con una URL válida de Figma (`figma.com`) registrada en sus adjuntos o enlaces de diseño.

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Sección de **Archivos y Enlaces**, identificada con etiqueta de tipo *Figma Design* o pestaña interactiva de diseño cuando la capacidad `design_preview` está activa.

## Procedimiento paso a paso

### 1. Localizar los prototipos y pantallas de Figma
1. Abre el modal de detalle de la tarea técnica o de interfaz que vas a maquetar o auditar.
2. Desplázate hasta la sección de **Archivos y Enlaces Adjuntos** (`TaskAttachmentsSection`).
3. Si el diseñador o PM asoció un enlace de Figma, el sistema lo categoriza automáticamente con el distintivo de diseño e icono de Figma.

### 2. Previsualizar el diseño directamente en el portal
1. Haz clic sobre el enlace o la tarjeta del adjunto de Figma.
2. Si cuentas con la capacidad `design_preview`, el portal carga el lienzo interactivo embebido dentro de la ventana de detalle, permitiendo inspeccionar:
   - Pantallas aprobadas y componentes de UI.
   - Medidas, tipografías, colores de marca y espaciados de diseño.
   - Estados de componentes (hover, focus, disabled, errores).
3. Permite al desarrollador y al tester contrastar los entregables contra el diseño aprobado sin necesidad de salir del portal ni abrir software adicional.

### 3. Descargar assets y recursos visuales
1. Para descargar iconos, imágenes o especificaciones exportadas, haz clic en el botón de descarga del adjunto correspondiente.
2. También puedes usar el enlace externo (*Abrir en Figma*) para acceder al archivo fuente original en tu cuenta de Figma si tienes permisos de edición en la organización.

## Resultado esperado
Alineación inmediata entre las especificaciones visuales de diseño y la implementación en código, acelerando las revisiones de QA y asegurando que las pantallas implementadas coincidan con los prototipos aprobados.

## Errores y límites conocidos
- **No se visualiza la previsualización de Figma:**
  - *Causa 1:* El colaborador no tiene asignada la capacidad `design_preview` (los desarrolladores requieren override explícito).
  - *Causa 2:* El enlace adjunto no corresponde a un archivo público o compartido de Figma, o la URL no cumple el formato estándar figma.com/...
- **No se requiere instalar plugins:** La previsualización se realiza mediante integración web segura estándar; no es necesario instalar extensiones de terceros en el navegador.

## Notas de verificación
- Resolución de capacidad: `src/modules/features/tasks/types.ts` (`resolveCollaboratorCapabilities`)
- Detección y renderizado de Figma: `src/modules/features/tasks/components/detail/task-attachments-section.tsx` (`TaskAttachmentsSection`)
- Control de perfiles: `src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx` (`TaskCollaboratorsManager`)
