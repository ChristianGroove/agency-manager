---
schema_version: 1
id: tasks.collaborators-and-portals
title: Administrar colaboradores, enlaces de portal y seguridad PIN en Tareas
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
  - colaboradores
  - portal de colaboradores
  - enlace del portal
  - pin
  - blanqueo de pin
  - restablecer pin
  - seguridad
  - token de acceso
  - capacidades tecnicas
  - git
  - figma
  - monitoreo
requirements:
  - Modulo de proyectos y tareas habilitado en la empresa
  - Autorizacion para gestionar el personal operativo y la configuracion de colaboradores
evidence:
  - path: src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx
    symbol: TaskCollaboratorsManager
    claim: Panel de administracion de colaboradores para copiar enlaces privados, gestionar seguridad de PIN y alternar capacidades tecnicas.
  - path: src/modules/features/portal-security/actions/portal-security-actions.ts
    symbol: setupPortalPinAction
    claim: Acciones de servidor para configurar, blanquear o remover codigos PIN y revocar sesiones de acceso al portal.
  - path: src/modules/features/tasks/types.ts
    symbol: resolveCollaboratorCapabilities
    claim: Evalua las capacidades asignadas a cada colaborador para codigo Git, prototipos de diseno y observabilidad.
---

# Administrar colaboradores, enlaces de portal y seguridad PIN en Tareas

## Proposito
Instruir a los administradores y lideres de equipo en la gestion del directorio de colaboradores operativos, la emision de enlaces de acceso privados al portal de tareas, la configuracion y restablecimiento de codigos de seguridad PIN y la habilitacion selectiva de capacidades tecnicas avanzadas.

## Requisitos y perfiles
- **Modulo:** Modulo de tareas activo en la empresa.
- **Autorizacion requerida:**
  - *Consultar el directorio de colaboradores:* Autorizacion de lectura en operaciones.
  - *Gestionar enlaces, restablecer PIN y modificar capacidades:* Autorizacion de gestion operativa de tareas.
- **Diferenciacion de usuarios:** Los miembros con acceso al panel de control administran la operacion global, mientras que los colaboradores externos operan en su propio portal privado sin necesidad de disponer de una cuenta de administracion general en la plataforma.

## Ubicacion en pantalla
- En el panel de Tareas (`/operations/tasks`), haz clic en la pestana **Colaboradores** ubicada en la barra superior.

## Gestion de enlaces privados de acceso

### Que es el enlace del portal
Cada colaborador registrado en el directorio cuenta con un token de acceso criptografico unico que le permite ingresar directamente a su portal de tareas (`/portal/tasks/[token]`). En dicho portal visualiza exclusivamente los proyectos y tickets a los que ha sido asignado.

### Procedimiento para obtener o regenerar el enlace
1. En la pestana **Colaboradores**, localiza la tarjeta o fila del miembro del equipo.
2. Haz clic en el boton **Copiar Enlace del Portal**. El enlace quedara en el portapapeles listo para ser enviado al colaborador por correo o mensajeria segura.
3. Si el colaborador pierde su dispositivo o se requiere revocar el acceso anterior por seguridad, presiona el icono de **Regenerar Token**. El enlace previo quedara invalidado de forma inmediata y se emitira uno nuevo.

## Seguridad y gestion del codigo PIN

### Proteccion con PIN de 6 digitos
Para evitar accesos no autorizados en equipos compartidos, el portal de tareas cuenta con una pantalla de bloqueo numerica protegida por un PIN de 6 digitos.

### Procedimiento de blanqueo o restablecimiento de PIN
Si un colaborador olvida su clave numerica de 6 digitos o su cuenta queda bloqueada:
1. Accede a la pestana **Colaboradores** en el panel de Tareas.
2. Localiza al colaborador afectado y presiona el boton **Seguridad / PIN**.
3. Selecciona la opcion **Blanquear PIN** (o *Restablecer PIN*).
4. El sistema eliminara la clave anterior de forma segura en el servidor y revocara las sesiones activas en navegadores.
5. La proxima vez que el colaborador ingrese a su enlace de portal, podra establecer un nuevo PIN de 6 digitos de forma autonoma.

### Bloqueo forzoso de sesion
Desde el mismo menu de seguridad es posible presionar **Bloquear Sesion Activa**, lo cual exige ingresar de inmediato el PIN en cualquier pantalla que el colaborador mantenga abierta.

## Asignacion de capacidades tecnicas avanzadas
En la ficha de cada colaborador, el lider puede activar o desactivar interruptores de capacidad para conceder herramientas especializadas segun su perfil:

1. **Inspeccion de Codigo y Git:** Habilita la pestana tecnica de control de versiones dentro del modal de detalle de cada requerimiento para consultar el nombre de rama sugerido y el comando de copia para la terminal.
2. **Previsualizacion de Prototipos de Diseno:** Habilita la integracion para renderizar pantallas interactivas embebidas de Figma vinculadas a los adjuntos del requerimiento.
3. **Observabilidad y Logs:** Concede acceso a la pestana de telemetria para inspeccionar eventos de excepcion y trazas de error asociadas a tickets de bugs.
4. **Eliminacion en grupo en el portal:** Permite que un colaborador de confianza que no sea lider pueda utilizar la barra de seleccion masiva para eliminar requerimientos desde su portal externo.

## Resultado esperado
Control centralizado y seguro del acceso de colaboradores, capacidad de resolver bloqueos de credenciales en pocos segundos sin friccion tecnica y personalizacion de herramientas de trabajo segun las responsabilidades reales de cada colaborador.

## Limites conocidos
- El PIN de seguridad consta estrictamente de 6 digitos numericos; no admite letras ni caracteres especiales.
- Regenerar el token de un colaborador invalida de inmediato cualquier sesion guardada previamente en navegadores o marcadores de favoritos.

## Notas de verificacion
- Componente de gestion verificado en src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx lineas 1-450.
- Acciones de seguridad de PIN verificadas en src/modules/features/portal-security/actions/portal-security-actions.ts lineas 20-110 (setupPortalPinAction, removePortalPinAction, lockPortalSessionAction).
- Resolucion de capacidades verificada en src/modules/features/tasks/types.ts lineas 900-960 (resolveCollaboratorCapabilities).
