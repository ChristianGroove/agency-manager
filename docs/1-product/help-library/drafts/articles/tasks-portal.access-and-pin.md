---
schema_version: 1
id: tasks-portal.access-and-pin
title: Acceder al portal de tareas y configurar protección con código PIN
module: tasks
status: draft
surface: portal.tasks
audience: portal-collaborator
source_revision: 4063682d86bc2ad07e4977e54e89fbbddcd6d47b
verified_on: 2026-10-12
verification: source-only
routes:
  - /portal/tasks/[token]
keywords:
  - portal tareas
  - enlace de acceso
  - codigo pin
  - desbloqueo
  - seguridad
  - sesion
  - token
  - salir
  - salgo
  - forma segura
  - segura
  - computador compartido
  - computador
  - compartido
  - bloquear pantalla
  - bloqueo manual
  - cerrar ventana
requirements:
  - Enlace de acceso personal activo proporcionado por la organización
  - Navegador web moderno con cookies y almacenamiento seguro habilitados
evidence:
  - path: src/app/(public)/portal/tasks/[token]/page.tsx
    symbol: TaskCollaboratorPortalPage
    claim: Resuelve el token de acceso, valida el estado del colaborador y monta el entorno de trabajo con branding del tenant.
  - path: src/modules/features/portal-security/actions/portal-security-actions.ts
    symbol: verifyPortalPinAction
    claim: Valida criptográficamente el PIN de 6 dígitos con PBKDF2 y emite cookie de sesión HttpOnly.
  - path: src/modules/features/portal-security/components/portal-lockscreen.tsx
    symbol: PortalLockscreen
    claim: Despliega el teclado numérico de desbloqueo cuando el colaborador tiene un código PIN activo.
  - path: src/modules/features/tasks/services/task-mutation-access.ts
    symbol: requirePortalTaskMutation
    claim: Valida que la sesión esté desbloqueada por PIN mediante isPortalSessionUnlocked antes de permitir mutaciones de tareas en el portal.
---

# Acceder al portal de tareas y configurar protección con código PIN

## Propósito
Explicar el procedimiento para ingresar al portal ágil de tareas de la empresa mediante tu enlace personal seguro, configurar un código PIN de 6 dígitos que proteja la visualización de tus proyectos y aprender a salir de forma segura cuando utilices un computador compartido.

## Requisitos y perfiles
Los perfiles de usuario del bot de ayuda no otorgan acceso a enlaces de terceros. Para acceder al portal se validan las siguientes condiciones por registro:
- **Token único por colaborador:** Cada enlace web está asociado a un registro individual activo en `organization_staff`. El token es privado, no caduca por simple cierre de pestaña y pertenece exclusivamente al colaborador.
- **Perfiles aplicables:** Todos los colaboradores con token de acceso activo (Desarrolladores, Diseñadores, Especialistas, QA, PMs y Soporte).
- **Aislamiento de sesión:** La cookie de desbloqueo de PIN se emite de forma estricta (`HttpOnly`) para el navegador y dispositivo en uso.
- **PIN para acciones de gestión:** Si tu portal tiene un PIN configurado, debes desbloquearlo antes de cambiar prioridades, reasignar o eliminar tareas, individualmente o en grupo. El enlace privado por sí solo no permite ejecutar esas acciones mientras la sesión está bloqueada.

## Ubicación en pantalla
- **Ruta web:** `/portal/tasks/[token]` (tu URL privada única).
- **Menú de seguridad:** Haz clic sobre tu avatar en la esquina superior derecha del portal para desplegar las opciones de seguridad, PIN y bloqueo de pantalla.

## Procedimiento paso a paso

### 1. Ingreso inicial mediante enlace directo
1. Abre en tu navegador el enlace web privado entregado por el administrador o líder de proyecto.
2. Si no tienes configurado un código PIN, el portal cargará de inmediato tu panel de tareas con los colores y logotipo de la empresa.
3. Si ya tienes un PIN configurado, aparecerá automáticamente la **Pantalla de Bloqueo** solicitando tus 6 dígitos numéricos.

### 2. Desbloquear el portal con tu PIN
1. En el teclado numérico en pantalla (o utilizando el teclado físico de tu dispositivo), ingresa los 6 dígitos de tu clave.
2. Si deseas mantener la sesión abierta en ese equipo por 30 días, marca la casilla **Recordar en este dispositivo**. *Nota:* No marques esta casilla si estás en un computador compartido.
3. El sistema verificará la clave y desbloqueará el acceso al tablero operativo.

### 3. Configurar o cambiar tu código PIN por primera vez
1. Una vez dentro del portal, haz clic sobre tu foto o iniciales en la esquina superior derecha.
2. En el menú desplegable, selecciona **Seguridad y PIN**.
3. Se abrirá la ventana modal de configuración:
   - Si vas a crear un PIN nuevo: ingresa los 6 dígitos deseados y confírmalos en el segundo campo.
   - Si vas a cambiar un PIN existente: introduce primero tu PIN actual y luego el nuevo PIN de 6 dígitos.
4. Presiona **Guardar PIN**. La sesión quedará protegida con cifrado PBKDF2.

### 4. ¿Cómo salgo de mi portal de forma segura si estoy en un computador compartido?
Si trabajas desde un equipo público, compartido o de un cliente, sigue este protocolo obligatorio de seguridad:
1. Haz clic sobre tu **avatar** en la esquina superior derecha del portal.
2. En el menú desplegable, selecciona **Bloquear Pantalla**. El portal sellará inmediatamente el acceso y volverá a mostrar la pantalla de bloqueo por PIN numérico.
3. A continuación, **cierra la ventana del navegador** para limpiar la memoria de sesión.
4. *Advertencia de seguridad:* El enlace privado de acceso **no se autodestruye al cerrar la pestaña**; por lo tanto, bloquear la pantalla manualmente es indispensable, aun cuando la computadora disponga de contraseña del sistema operativo.

## Resultado esperado
Acceso directo, seguro y protegido a tus entregables, impidiendo que personas no autorizadas con acceso al historial del navegador puedan consultar información confidencial del proyecto.

## Errores y límites conocidos
- **Error "Enlace Inválido o Expirado":** Ocurre si el administrador desactivó tu usuario en la plataforma o si se revocó el token de acceso. Debes solicitar un nuevo enlace a tu líder de proyecto.
- **PIN olvidado:** El portal no dispone de botón de recuperación por correo para el colaborador externo. Si olvidas tu PIN, debes contactar a tu Project Manager o Administrador para que realice un blanqueo de PIN desde la consola del sistema.
- **Formato estricto:** El PIN debe contener exactamente 6 dígitos numéricos; no se permiten letras, símbolos ni longitudes distintas.

## Notas de verificación
- Entrada de página: `src/app/(public)/portal/tasks/[token]/page.tsx`
- Acciones de servidor: `src/modules/features/portal-security/actions/portal-security-actions.ts`
- Componente visual de bloqueo: `src/modules/features/portal-security/components/portal-lockscreen.tsx`
- Guard de seguridad de mutación con verificación de PIN: `src/modules/features/tasks/services/task-mutation-access.ts` (`requirePortalTaskMutation`)
