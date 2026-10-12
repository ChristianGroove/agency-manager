---
schema_version: 1
id: tasks-portal.comments-and-mentions
title: Participar en discusiones, mencionar colaboradores y recibir notificaciones
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
  - discusion
  - menciones
  - notificaciones
  - campana
  - bitacora
requirements:
  - Token de acceso activo y pertenencia a la organización de la tarea
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalAddTaskComment
    claim: Inserta comentarios en task_comments, parsea menciones con regex @nombre y registra la autoría del colaborador.
  - path: src/modules/features/tasks/components/detail/task-discussion-feed.tsx
    symbol: TaskDiscussionFeed
    claim: Renderiza el hilo cronológico de comentarios, notas de auditoría y campo de texto con soporte de menciones.
---

# Participar en discusiones, mencionar colaboradores y recibir notificaciones

## Propósito
Explicar cómo colaborar con el equipo mediante el hilo de discusión integrado en cada tarea, utilizar menciones (@) para captar la atención de compañeros específicos y revisar el centro de notificaciones (la campana) en la barra superior del portal.

## Requisitos y perfiles
- **Perfiles aplicables:** Todos los colaboradores con acceso a la tarea (Desarrolladores, Diseñadores, QA, PMs y Soporte en tickets consultados).
- **Condición requerida:** Que la tarea pertenezca a la misma organización y workspace autorizado.

## Ubicación en pantalla
- **Hilo de discusión:** Sección inferior del modal de detalle de cualquier tarea o reunión.
- **Campana de notificaciones:** Icono de campana situado en la esquina superior derecha del portal, junto al avatar de usuario.

## Procedimiento paso a paso

### 1. Escribir un comentario en una tarea
1. Abre el modal de detalle de la tarea haciendo clic sobre su tarjeta o fila.
2. Desplázate hasta la sección **Discusión / Comentarios**.
3. En el campo de texto inferior, escribe tu mensaje o actualización sobre el entregable.
4. Presiona el botón **Enviar** o utiliza el atajo de teclado correspondiente. El comentario se publicará al instante con tu nombre, avatar y fecha.

### 2. Mencionar a un compañero de equipo (@)
1. Mientras escribes en la caja de texto, digita el símbolo arroba (`@`).
2. Aparecerá un menú contextual flotante con la lista de miembros de tu equipo.
3. Continúa escribiendo el nombre o apellido del compañero y selecciona el contacto deseado de la lista (por ejemplo, `@Carlos`).
4. Al publicar el comentario:
   - El texto de la mención quedará resaltado en color distintivo.
   - El compañero mencionado recibirá una notificación directa en su campana de avisos la próxima vez que abra su portal.

### 3. Consultar y gestionar notificaciones en la campana
1. Haz clic sobre el **icono de la campana** en la barra superior.
2. Se desplegará el panel con las menciones y avisos recientes:
   - Verás el autor del mensaje, el ticket relacionado (por ejemplo, `#TK-102`) y el fragmento del comentario.
3. Haz clic sobre cualquier notificación para abrir directamente el ticket correspondiente y leer el contexto completo.

## Tipos de mensajes en el hilo de discusión
En el feed cronológico observarás dos tipos de registros:
1. **Comentarios de usuarios:** Mensajes redactados por ti o tus compañeros de equipo para coordinar especificaciones o resolver dudas.
2. **Notas de auditoría del sistema:** Registros automáticos generados por la plataforma que dejan trazabilidad de eventos clave, tales como:
   - Cambios de avance porcentual (`📈 Avance de tarea actualizado del 20% al 50%`).
   - Imputación de horas de trabajo (`⏱️ Registro de trabajo: +3h`).
   - Desbloqueo de tareas sucesoras (`Desbloqueo: El ticket predecesor #TK-101 fue completado`).

## Errores y límites conocidos
- **Aislamiento de soporte:** Los colaboradores del portal de soporte paralelo únicamente reciben notificaciones en la campana correspondientes a tickets de soporte que ellos mismos hayan creado o en los que hayan sido consultados formalmente.
- **Filtro antispam:** Las notas de sistema generadas durante el pase de lista de reuniones no generan avisos en la campana de notificaciones para evitar saturar a los participantes.

## Notas de verificación
- Lógica de backend: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalAddTaskComment`)
- Feed de discusión: `src/modules/features/tasks/components/detail/task-discussion-feed.tsx`
- Menú de notificaciones: `src/modules/features/tasks/components/portal/task-collaborator-portal.tsx` (`recentMentions`)
