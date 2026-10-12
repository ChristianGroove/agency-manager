---
schema_version: 1
id: tasks.import-data
title: Importar tareas y proyectos desde archivos CSV, JSON o Jira
module: tasks
status: draft
surface: dashboard
audience: tenant-user
source_revision: 5aaeec98767f13ec9b495eed33486fcdba65ab86
verified_on: 2026-10-12
verification: source-only
routes:
  - /operations/tasks
keywords:
  - importar tareas
  - carga masiva
  - importacion
  - csv
  - json
  - jira
  - migracion
  - importar proyectos
  - archivo
requirements:
  - Modulo de tareas activo en la empresa
  - Autorizacion para gestionar y crear proyectos y tareas en operaciones
evidence:
  - path: src/modules/features/tasks/components/modals/task-import-modal.tsx
    symbol: TaskImportModal
    claim: Asistente modal para seleccionar archivos, previsualizar filas y configurar opciones de importacion.
  - path: src/modules/features/tasks/actions/task-import-actions.ts
    symbol: executeUniversalImport
    claim: Accion transaccional que valida el paquete universal, resuelve entidades existentes e inserta datos masivos.
---

# Importar tareas y proyectos desde archivos CSV, JSON o Jira

## Proposito
Instruir a los administradores y gestores de proyecto en la incorporacion masiva de requerimientos, proyectos y tareas en lote hacia el modulo de Tareas utilizando archivos estructurados en formatos JSON, CSV o exportaciones de Jira, facilitando la migracion inicial o la carga periodica de requerimientos.

## Requisitos y perfiles
- **Modulo:** Modulo de tareas activo en la organizacion.
- **Autorizacion requerida:** Autorizacion de gestion operativa de tareas en el panel de administracion.

## Ubicacion en pantalla
- En el panel de Tareas (`/operations/tasks`), haz clic en el boton superior **Nuevo** y selecciona la opcion **Importar Datos / Tareas**.

## Formatos compatibles de importacion

1. **Paquete Universal Pixy (JSON):** Archivo estructurado con soporte integral de jerarquias completas, incluyendo espacios de trabajo, proyectos, sprints, subtareas con responsables y dependencias entre tickets.
2. **Tabla de valores separados por coma (CSV):** Archivo tabular para importar listados planos de requerimientos. Permite mapear columnas para titulo, descripcion, responsable por correo, prioridad, fecha de vencimiento y horas estimadas.
3. **Exportacion de Jira (XML o CSV):** Asistente de compatibilidad para importar historias, epicas y tareas originadas en Jira con conservacion de claves originales y descripciones.

## Procedimiento paso a paso para importar

### 1. Cargar el archivo de origen
1. Abre el asistente **Importar Datos / Tareas**.
2. Arrastra el archivo al recuadro de carga o haz clic para seleccionarlo desde tu equipo.
3. El sistema analizara la estructura del archivo y validara que las cabeceras cumplan el formato esperado.

### 2. Configurar el destino y mapeo de datos
1. **Proyecto de destino:** Puedes elegir importar todas las tareas dentro de un proyecto existente o permitir que el asistente cree proyectos independientes segun figure en el archivo.
2. **Mapeo de colaboradores:** El sistema intentara emparejar los nombres o correos del archivo con los miembros existentes en el directorio de colaboradores. Si no encuentra coincidencia, puedes seleccionar un responsable por defecto.

### 3. Previsualizacion y confirmacion
1. La pantalla de resumen mostrara la cantidad de tareas detectadas, subtareas reconocidas y proyectos a crear.
2. Si se detectan inconsistencias en formatos de fecha o campos vacios, el asistente senalara las advertencias antes de proceder.
3. Presiona **Ejecutar Importacion**. El servidor procesara las inserciones de forma transaccional y actualizara el listado de tareas al finalizar.

## Resultado esperado
Carga rapida y automatizada de decenas o cientos de requerimientos en pocos minutos, eliminando la digitacion manual y garantizando la correspondencia de prioridades, fechas y proyectos.

## Limites conocidos
- Los archivos de gran tamano deben estructurarse preferentemente en formato JSON para preservar la jerarquia de subtareas y dependencias.
- Las tareas importadas se incorporan con progreso inicial al 0% a menos que el archivo declare un estado o porcentaje previo compatible.

## Notas de verificacion
- Asistente de importacion verificado en src/modules/features/tasks/components/modals/task-import-modal.tsx lineas 1-320.
- Logica de importacion masiva verificada en src/modules/features/tasks/actions/task-import-actions.ts lineas 20-120 (executeUniversalImport).
