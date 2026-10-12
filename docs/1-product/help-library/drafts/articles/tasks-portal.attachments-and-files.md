---
schema_version: 1
id: tasks-portal.attachments-and-files
title: Subir y consultar archivos adjuntos y enlaces en una tarea
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
  - adjuntos
  - archivos
  - documentos
  - capturas
  - enlaces externos
  - figma
  - storage
requirements:
  - Acceso a la tarea en el portal y conexión a internet estable
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUploadTaskAttachment
    claim: Carga archivos al bucket de almacenamiento seguro y añade el registro en el array attachments del ticket.
  - path: src/modules/features/tasks/components/detail/task-attachments-section.tsx
    symbol: TaskAttachmentsSection
    claim: Renderiza la zona de carga de archivos (dropzone), galería de adjuntos y enlaces externos asociados.
---

# Subir y consultar archivos adjuntos y enlaces en una tarea

## Propósito
Indicar cómo adjuntar documentación técnica, capturas de pantalla, prototipos de diseño o enlaces externos a un requerimiento técnico, permitiendo que todos los miembros asignados cuenten con los insumos necesarios para ejecutar su trabajo.

## Requisitos y perfiles
- **Perfiles aplicables:** Todos los colaboradores con acceso a la tarea (Desarrolladores, Diseñadores, QA, PMs y Soporte).
- **Tipos de contenido admitidos:**
  - Archivos locales (imágenes PNG/JPG/WebP, documentos PDF, hojas de cálculo, archivos comprimidos ZIP).
  - Enlaces externos (URLs de Figma, repositorios GitHub, documentos de Google Drive o tableros externos).

## Ubicación en pantalla
- **Modal de Detalle de Tarea:** Pestaña o sección **Archivos y Enlaces** (icono de clip o documento).
- **Dentro de la discusión:** También es posible adjuntar archivos individuales como complemento de un comentario específico.

## Procedimiento paso a paso

### 1. Subir un archivo desde tu dispositivo
1. Abre el modal de detalle de la tarea haciendo clic sobre su tarjeta o fila.
2. Navega a la sección **Archivos y Enlaces**.
3. Haz clic en el botón **Subir Archivo** o arrastra el archivo directamente sobre la zona delimitada (*Dropzone*).
4. El portal procesará la subida hacia el almacenamiento seguro de la plataforma (`task-attachments`).
5. Una vez cargado, el archivo aparecerá en la galería de adjuntos mostrando su nombre original, tamaño en kilobytes y fecha de carga.

### 2. Vincular un enlace externo
1. En la misma sección de adjuntos, presiona el botón **Añadir Enlace**.
2. En la ventana emergente:
   - Ingresa el título descriptivo del recurso (por ejemplo, `Prototipo de Checkout en Figma`).
   - Pega la dirección web completa (`URL`).
3. Presiona **Guardar**. El enlace quedará fijado en la cabecera de la tarea para acceso rápido de todo el equipo.

### 3. Descargar o consultar un adjunto existente
- Haz clic sobre cualquier tarjeta de archivo para abrir la previsualización directa en una nueva pestaña o descargar el documento a tu equipo.
- Las imágenes y capturas de pantalla cuentan con previsualización en miniatura directamente en el portal.

## Resultado esperado
Centralización de todos los activos, especificaciones y evidencias de prueba dentro del propio ticket, evitando pérdidas de información por canales externos de mensajería.

## Errores y límites conocidos
- **Límite de tamaño:** Los archivos que superen el límite de carga establecido por la organización (habitualmente 10 MB a 25 MB por archivo) serán rechazados con un mensaje de alerta.
- **Tareas completadas:** Aunque una tarea esté en estado *Completada* (`done`), los colaboradores pueden seguir consultando y descargando los archivos adjuntos que se cargaron durante el desarrollo.

## Notas de verificación
- Lógica de almacenamiento: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalUploadTaskAttachment`)
- Componente de interfaz: `src/modules/features/tasks/components/detail/task-attachments-section.tsx`
