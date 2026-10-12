---
schema_version: 1
id: tasks-portal.quick-notes
title: Guardar notas rápidas privadas por colaborador sobre una tarea
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
  - notas rapidas
  - notas privadas
  - apuntes personales
  - privacidad
  - recordatorio
requirements:
  - Acceso a la tarea asignada en el portal operativo
evidence:
  - path: src/modules/features/tasks/actions/collaborator-portal-actions.ts
    symbol: portalUpdateTaskQuickNote
    claim: Almacena apuntes privados en el diccionario quick_notes de la tarea bajo la clave del staffId sin exponerlo a otros colaboradores.
  - path: src/modules/features/tasks/components/shared/task-quick-note-action.tsx
    symbol: TaskQuickNoteAction
    claim: Despliega el botón de lápiz y el popover con caja de texto para guardar y editar la nota privada.
---

# Guardar notas rápidas privadas por colaborador sobre una tarea

## Propósito
Explicar el uso de la función de Notas Rápidas Privadas, diseñada para que cada desarrollador o especialista pueda registrar recordatorios personales, fragmentos de código, comandos de terminal o ideas pendientes sobre un requerimiento sin que sean visibles para los demás compañeros ni para los clientes.

## Requisitos y perfiles
- **Perfiles aplicables:** Todos los colaboradores con acceso operativo al portal de tareas.
- **Aislamiento estricto de privacidad (Zero-Leak):** Cada nota rápida queda asociada exclusivamente a tu identificador de colaborador (`staff.id`). Ningún otro miembro del equipo (ni siquiera otros desarrolladores asignados a la misma tarea) puede leer tus notas privadas.

## Ubicación en pantalla
- **En tarjetas de Cuadrícula:** Icono de lápiz / nota rápida situado en la esquina inferior derecha de la tarjeta.
- **En filas de la Lista:** Botón de acción rápida en la penúltima columna de la tabla.
- **En el Modal de Detalle:** Bloque de **Mi Nota Privada** en la barra lateral de la tarea.

## Procedimiento paso a paso

### 1. Crear o consultar tu nota privada
1. En tu tarjeta de tarea o en la fila de la lista, haz clic sobre el **icono del lápiz** (botón de Nota Rápida).
2. Se desplegará una pequeña ventana flotante (*Popover*) con un área de texto.
3. Si ya habías guardado una nota previa, verás el texto que escribiste anteriormente.

### 2. Editar y guardar el apunte
1. Escribe tu recordatorio personal (por ejemplo: `Revisar migración en servidor de staging antes de hacer merge; credenciales temporales en keepass`).
2. Haz clic en el botón **Guardar Nota** (o presiona fuera de la ventana flotante).
3. El icono cambiará de color o mostrará un indicador activo, señalando que tienes un apunte privado guardado en ese requerimiento.

### 3. Eliminar una nota privada
1. Vuelve a abrir el panel de nota rápida haciendo clic en el lápiz.
2. Borra todo el contenido del campo de texto dejando la caja completamente vacía.
3. Presiona **Guardar**. El sistema limpiará el registro de tu nota privada en la base de datos.

## Resultado esperado
Un espacio personal, confidencial y de acceso inmediato para organizar tus pensamientos técnicos sin saturar el feed público de comentarios de la tarea.

## Errores y límites conocidos
- **No es un canal de comunicación:** Recuerda que las notas rápidas son estrictamente individuales. Si necesitas que el Project Manager, el tester o un compañero conozca una decisión técnica o impedimento, debes publicarlo en la sección de **Comentarios**, no en tu nota privada.
- **Límite de caracteres:** La nota rápida está diseñada para apuntes breves y concisos; para documentación extensa se recomienda adjuntar un archivo o enlace externo.

## Notas de verificación
- Lógica de persistencia: `src/modules/features/tasks/actions/collaborator-portal-actions.ts` (`portalUpdateTaskQuickNote`)
- Limpieza en carga (Zero-leak): líneas 619–624 de `collaborator-portal-actions.ts`
- Componente visual: `src/modules/features/tasks/components/shared/task-quick-note-action.tsx`
