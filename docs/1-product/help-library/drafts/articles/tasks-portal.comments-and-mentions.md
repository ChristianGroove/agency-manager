---
schema_version: 1
id: tasks-portal.comments-and-mentions
title: Participar en discusiones, mencionar compañeros en comentarios y recibir avisos
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
  - comentarios
  - comentario
  - discusion
  - menciones
  - mencion
  - menciono
  - menciona
  - mencionar
  - companero
  - companeros
  - notificaciones
  - notificacion
  - aviso
  - avisos
  - campana
  - bitacora
requirements:
  - Token de acceso activo y pertenencia al workspace o proyecto de la tarea
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalAddTaskComment
    claim: Inserta comentarios en task_comments, parsea menciones con regex @nombre y registra la autoría del colaborador.
  - path: src/modules/features/tasks/components/detail/task-discussion-feed.tsx
    symbol: TaskDiscussionFeed
    claim: Renderiza el hilo cronológico de comentarios, notas de auditoría y campo de texto con soporte de menciones.
---

# Participar en discusiones, mencionar compañeros en comentarios y recibir avisos

## Propósito
Explicar cómo colaborar con el equipo mediante el hilo de discusión integrado en cada tarea, utilizar menciones (@) para que le llegue un aviso directo a un compañero de trabajo y revisar las notificaciones en el centro de avisos (la campana) situado en la barra superior del portal.

## Requisitos y perfiles
Los perfiles de ayuda no otorgan acceso a proyectos ajenos. Para interactuar en las discusiones se validan las siguientes condiciones por registro:
- **Pertenencia al Workspace o Proyecto:** El colaborador debe formar parte activa del workspace o proyecto que contiene el requerimiento para leer o publicar comentarios en su hilo.
- **Perfiles aplicables:** Todos los colaboradores con acceso a la tarea (Desarrolladores, Diseñadores, Especialistas, QA, PMs y Soporte en tickets consultados).
- **Notificaciones acotadas por usuario:** La campana de notificaciones solo recopila menciones dirigidas explícitamente a tu identidad (`@tu_nombre`) dentro de los tickets en los que participas.

## Ubicación en pantalla
- **Hilo de discusión y comentarios:** Sección inferior del modal de detalle de cualquier tarea o reunión (`TaskDiscussionFeed`).
- **Campana de notificaciones:** Icono de campana situado en la esquina superior derecha del portal, junto al avatar de usuario.

## Procedimiento paso a paso

### 1. Escribir un comentario en una tarea
1. Abre el modal de detalle de la tarea haciendo clic sobre su tarjeta o fila.
2. Desplázate hasta la sección **Discusión / Comentarios**.
3. En el campo de texto inferior, escribe tu mensaje o actualización sobre el entregable.
4. Presiona el botón **Enviar** o utiliza el atajo de teclado correspondiente. El comentario se publicará al instante con tu nombre, avatar y fecha.

### 2. Mencionar a un compañero en un comentario para que le llegue aviso
1. Mientras redactas en la caja de comentarios, escribe el símbolo arroba (`@`).
2. Se desplegará un menú contextual flotante con la lista de miembros de tu equipo.
3. Continúa escribiendo el nombre o apellido del compañero y selecciona el contacto deseado de la lista (por ejemplo, `@Carlos`).
4. Al publicar el comentario:
   - El texto de la mención quedará resaltado en color distintivo.
   - A tu compañero le llegará un aviso inmediato reflejado en el icono de la campana en su portal.

### 3. Consultar las notificaciones cuando alguien te menciona
¿Dónde ves las notificaciones cuando alguien te menciona en un ticket?
1. Dirígete a la barra superior derecha del portal y haz clic sobre el **icono de la campana**.
2. Se abrirá el panel lateral con la lista de menciones y avisos recientes:
   - Podrás ver quién te mencionó, en qué ticket ocurrió (por ejemplo, `#TK-102`) y el fragmento del comentario recibido.
3. Haz clic directamente sobre la notificación para abrir el requerimiento de inmediato y continuar la conversación.

## Tipos de mensajes en el hilo de discusión
En el feed cronológico observarás dos tipos de registros:
1. **Comentarios de usuarios:** Mensajes redactados por ti o tus compañeros para coordinar especificaciones técnicas, aclarar dudas o avisar sobre entregables listos.
2. **Notas de auditoría del sistema:** Registros automáticos generados por la plataforma que dejan trazabilidad de eventos clave:
   - Cambios de avance porcentual (`📈 Avance de tarea actualizado del 20% al 50%`).
   - Imputación de horas de trabajo (`⏱️ Registro de trabajo: +3h`).
   - Desbloqueo de tareas sucesoras (`Desbloqueo: El ticket predecesor #TK-101 fue completado`).

## Errores y límites conocidos
- **Aislamiento de soporte:** Los colaboradores del portal de soporte paralelo únicamente reciben notificaciones en la campana correspondientes a tickets de soporte que ellos mismos hayan creado o en los que hayan sido consultados formalmente.
- **Canal de avisos:** Las notificaciones se presentan en la campana web del portal; no se envían mensajes SMS a teléfonos personales ni correos automáticos por cada mención ordinaria.

## Notas de verificación
- Lógica de backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalAddTaskComment`)
- Feed de discusión: `src/modules/features/tasks/components/detail/task-discussion-feed.tsx`
- Menú de notificaciones: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx` (`recentMentions`)
