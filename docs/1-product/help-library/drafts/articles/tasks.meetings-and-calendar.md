---
schema_version: 1
id: tasks.meetings-and-calendar
title: Programar y gestionar reuniones, asistencia y videollamadas en Tareas
module: tasks
status: draft
surface: dashboard
audience: tenant-user
source_revision: 4063682d86bc2ad07e4977e54e89fbbddcd6d47b
verified_on: 2026-10-12
verification: source-only
routes:
  - /operations/tasks
keywords:
  - como crear una reunion
  - crear reunion
  - nueva reunion
  - reuniones
  - google meet
  - videollamada
  - asistencia
  - participantes
  - recurrencia
  - calendario
  - actividades sincronicas
  - minutas
requirements:
  - Modulo de proyectos y tareas habilitado en la empresa
  - Autorizacion para gestionar requerimientos y actividades operativas
evidence:
  - path: src/modules/features/tasks/components/meetings/task-meeting-modal.tsx
    symbol: TaskMeetingModal
    claim: Formulario modal para programar reuniones con modalidad, asistentes, recurrencia, duracion y Google Meet.
  - path: src/modules/features/tasks/components/meetings/task-meeting-detail-modal.tsx
    symbol: TaskMeetingDetailModal
    claim: Modal de detalle y edicion de reunion con consola de control de asistencia, minutas y comentarios.
  - path: src/modules/features/tasks/components/meetings/task-meeting-console.tsx
    symbol: TaskMeetingConsole
    claim: Consola interactiva para registro de presencia de asistentes y finalizacion de sesion con computo de horas.
  - path: src/modules/features/tasks/components/meetings/task-google-meet-connector.tsx
    symbol: TaskGoogleMeetConnector
    claim: Conector OAuth para vincular cuenta de Google Calendar y autogenerar enlaces de Google Meet.
  - path: src/modules/features/tasks/actions/task-actions.ts
    symbol: createTask
    claim: Accion del servidor que persiste la actividad sincronica con codigo prefijo MTG y sincroniza Google Calendar.
---

# Programar y gestionar reuniones, asistencia y videollamadas en Tareas

## Proposito
Instruir a los coordinadores y miembros del equipo en la programacion, ejecucion y seguimiento de actividades sincronicas y reuniones de trabajo desde el panel de Tareas, incluyendo la convocatoria de participantes, vinculacion con proyectos y ciclos agiles, conexion con Google Meet y control de asistencia con imputacion de horas.

## Requisitos y perfiles
- **Modulo:** Modulo de tareas activo en la empresa.
- **Autorizacion requerida:**
  - *Consultar reuniones programadas:* Autorizacion de lectura en tareas operativas.
  - *Crear, editar o finalizar reuniones:* Autorizacion de gestion operativa de tareas.
- **Conexion opcional de Google Meet:** Para generar salas de Google Meet de forma automatica, la cuenta del usuario debe tener vinculada la integracion con Google Calendar. Si no esta vinculada, se puede ingresar cualquier enlace de videollamada de forma manual.

## Ubicacion en pantalla
- En el panel de Tareas (`/operations/tasks`), haz clic en el boton superior **Nuevo** y selecciona **Nueva Reunion / Actividad**.
- Tambien puedes acceder desde la pestana **Calendario** haciendo clic en el dia y hora deseados.

## Pasos para programar una reunion

### 1. Datos basicos y proyecto
1. En el campo **Proyecto**, selecciona el proyecto al que corresponde la sesion de trabajo.
2. Ingresa un **Titulo de la reunion** claro y descriptivo (por ejemplo, *Revision de Sprint 4* o *Alineacion Tecnica de Arquitectura*).
3. En **Descripcion**, anade los objetivos o temas a tratar.
4. Si el proyecto trabaja bajo ciclos agiles, puedes asociar la reunion a un **Sprint** activo o dejarla independiente seleccionando *Ninguno*.

### 2. Modalidad y fecha
1. Selecciona la **Modalidad**:
   - *Virtual:* Para sesiones remotas mediante videollamada.
   - *Presencial:* Para sesiones en sala u oficina fisica, habilitando el campo de direccion o sala.
   - *Hibrida:* Combina enlace de videollamada y ubicacion fisica.
2. Define la **Fecha y hora de inicio**. El sistema sugiere por defecto el inicio de la siguiente hora disponible.
3. Elige la **Duracion en minutos** utilizando los botones rapidos (15, 30, 45, 60, 90 o 120 minutos) o escribiendo el valor deseado.

### 3. Convocatoria de participantes
1. En la seccion de participantes, haz clic sobre los colaboradores que deben asistir a la sesion para agregarlos a la lista.
2. Puedes utilizar el boton **Convocar a todos** para anadir a todos los miembros de la organizacion en un solo paso.
3. El sistema calcula automaticamente la fraccion de tiempo estimada por cada participante segun la duracion de la reunion.

### 4. Generacion de enlace de videollamada (Google Meet)
- **Conexion automatica:** Si el switch *Generar enlace automatico con Google Meet* esta encendido, el sistema creara la sala en Google Calendar y guardara el enlace directamente en la reunion.
- **Enlace manual:** Si utilizas Zoom, Microsoft Teams u otro proveedor, puedes desactivar el switch e ingresar la URL de la reunion en el campo correspondiente.

### 5. Configuracion de recurrencia (opcional)
1. Activa la casilla **Reunion recurrente**.
2. Selecciona el **Intervalo de repeticion**:
   - *Semanal:* Permite marcar los dias concretos de la semana en los que se repite la reunion (por ejemplo, Lunes, Miercoles y Viernes).
   - *Quincenal:* Se ejecuta cada dos semanas en el dia establecido.
   - *Mensual:* Se programa en un dia fijo de cada mes.
   - *Diaria:* Se ejecuta todos los dias laborales.
3. El sistema calcula la fecha de la proxima ocurrencia para asegurar la continuidad en el calendario.

### 6. Puntos de agenda y guardado
1. En la seccion de **Agenda**, escribe los puntos o temas a discutir y presiona anadir para crear la lista de chequeo de la sesion.
2. Presiona **Programar Reunion**. El sistema generara un ticket unico con prefijo alfanumerico MTG (por ejemplo, MTG-12).

## Gestion durante y despues de la reunion

### Consola de reunion y control de asistencia
Al hacer clic sobre una reunion en el listado o en el calendario, se abrira la ventana de detalle con la **Consola de Reunion**:
1. **Boton de acceso rapido:** Muestra el boton *Unirse a la llamada* para abrir el enlace de la sala en una pestana nueva.
2. **Ventana de asistencia:** Un aviso contextual indica si la sesion esta pendiente, dentro de la ventana de registro en curso o si ya ha concluido.
3. **Registro de asistencia:** Cada participante puede registrar su presencia, o el coordinador de la reunion puede marcar el estado de cada convocado: *Pendiente*, *Confirmado*, *Excusado*, *Presente* o *Ausente*.
4. **Finalizar sesion:** Al presionar *Finalizar Sesion*, el sistema cambia el estado del requerimiento a completado y registra automaticamente las horas efectivas en la bitacora de tiempo de los colaboradores que asistieron.

### Minutas y notas de seguimiento
- En la seccion de comentarios del modal de reunion, los participantes pueden registrar acuerdos, decisiones tomadas y enlaces a grabaciones o documentos generados durante la llamada.

## Visualizacion de reuniones en el panel
- **En la vista de Lista:** Puedes activar el conmutador *Ver Reuniones* ubicado en la barra de herramientas para desplegar las sesiones sincronicas junto a las tareas ordinarias o aislar exclusivamente las reuniones.
- **En el Calendario:** Las reuniones aparecen representadas con un distintivo visual de camara y la hora exacta programada.

## Diferencias clave frente al portal de colaboradores
- **Creacion global:** En el panel de control, un usuario con permisos de gestion puede programar reuniones para cualquier proyecto de la empresa y convocar a cualquier colaborador. En el portal externo, los colaboradores estan limitados a los proyectos en los que participan.
- **Integracion con Google Meet:** En el panel de control, la autogeneracion de enlaces utiliza la sesion autenticada del usuario en Google. En el portal de colaboradores externos, si el invitado carece de cuenta vinculada a Google Calendar, debe suministrar la URL manualmente.
- **Kanban desacoplado:** El tablero Kanban del panel de control prioriza el flujo de entregables y oculta las reuniones para evitar saturar las columnas de desarrollo; la consulta y control de reuniones se efectua en la lista o el calendario.

## Limites conocidos
- Si se programa una reunion virtual sin enlace y con el switch de Google Meet desactivado, el sistema emitira una advertencia para recordar que los convocados no tendran boton de acceso directo.
- Cancelar o eliminar una reunion desde el panel de tareas eliminara el evento asociado en Google Calendar si fue generado mediante la integracion oficial.

## Notas de verificacion
- Verificado contra TaskMeetingModal en src/modules/features/tasks/components/meetings/task-meeting-modal.tsx lineas 90-345.
- Componente de consola verificado en src/modules/features/tasks/components/meetings/task-meeting-console.tsx lineas 70-150.
- Conector de Google Meet verificado en src/modules/features/tasks/components/meetings/task-google-meet-connector.tsx lineas 45-120.
- Accion del servidor createTask verificada en src/modules/features/tasks/actions/task-actions.ts lineas 780-850, validando la asignacion del prefijo de ticket MTG y la llamada a createGoogleCalendarMeetingEvent.
