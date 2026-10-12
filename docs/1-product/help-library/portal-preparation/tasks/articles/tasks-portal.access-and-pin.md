---
schema_version: 1
id: tasks-portal.access-and-pin
title: Acceder al portal de tareas y configurar protección con código PIN
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
  - portal tareas
  - enlace de acceso
  - codigo pin
  - desbloqueo
  - seguridad
  - sesion
  - token
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
preparatory_note: "Contrato preparatorio: superficie portal.tasks. No procesar por el publicador vigente de dashboard."
---

# Acceder al portal de tareas y configurar protección con código PIN

## Propósito
Explicar el procedimiento para ingresar al portal ágil de tareas de la empresa mediante tu enlace personal seguro y configurar un código PIN de 6 dígitos que proteja la visualización de tus proyectos y requerimientos frente a terceros.

## Requisitos y perfiles
- **Perfiles aplicables:** Todos los colaboradores con token de acceso activo (Desarrolladores, Diseñadores, Especialistas, QA, PMs y Soporte).
- **Condición requerida:** Que tu registro en el equipo (`organization_staff`) esté marcado como activo y cuentes con el enlace web asignado.

## Ubicación en pantalla
- **Ruta web:** `/portal/tasks/[token]` (tu URL privada única).
- **Menú de seguridad:** Haz clic sobre tu avatar en la esquina superior derecha del portal para desplegar las opciones de seguridad y PIN.

## Procedimiento paso a paso

### 1. Ingreso inicial mediante enlace directo
1. Abre en tu navegador el enlace web privado entregado por el administrador o líder de proyecto.
2. Si no tienes configurado un código PIN, el portal cargará de inmediato tu panel de tareas con los colores y logotipo de la empresa.
3. Si ya tienes un PIN configurado, aparecerá automáticamente la **Pantalla de Bloqueo** solicitando tus 6 dígitos numéricos.

### 2. Desbloquear el portal con tu PIN
1. En el teclado numérico en pantalla (o utilizando el teclado físico de tu dispositivo), ingresa los 6 dígitos de tu clave.
2. Si deseas mantener la sesión abierta en ese equipo por 30 días, marca la casilla **Recordar en este dispositivo**.
3. El sistema verificará la clave y desbloqueará el acceso al tablero operativo.

### 3. Configurar o cambiar tu código PIN por primera vez
1. Una vez dentro del portal, haz clic sobre tu foto o iniciales en la esquina superior derecha.
2. En el menú desplegable, selecciona **Seguridad y PIN**.
3. Se abrirá la ventana modal de configuración:
   - Si vas a crear un PIN nuevo: ingresa los 6 dígitos deseados y confírmalos en el segundo campo.
   - Si vas a cambiar un PIN existente: introduce primero tu PIN actual y luego el nuevo PIN de 6 dígitos.
4. Presiona **Guardar PIN**. La sesión quedará protegida y vinculada a tu navegador.

### 4. Bloquear la sesión manualmente
- Si te ausentas temporalmente de tu puesto de trabajo, abre el menú de tu avatar y presiona **Bloquear Pantalla**. El portal se sellará al instante requiriendo el PIN para volver a ver los datos.

## Resultado esperado
Acceso directo, seguro y protegido a tus entregables, impidiendo que personas no autorizadas con acceso a tu pantalla o historial puedan consultar información confidencial del proyecto.

## Errores y límites conocidos
- **Error "Enlace Inválido o Expirado":** Ocurre si el administrador desactivó tu usuario en la plataforma o si se generó un nuevo token de acceso para tu cuenta. Debes solicitar un nuevo enlace a tu líder de proyecto.
- **PIN olvidado:** El portal no dispone de botón de recuperación por correo para el colaborador externo. Si olvidas tu PIN, debes contactar a tu Project Manager o Administrador para que realice un blanqueo de PIN desde la consola del sistema.
- **Formato estricto:** El PIN debe contener exactamente 6 dígitos numéricos; no se permiten letras, símbolos ni longitudes distintas.

## Notas de verificación
- Entrada de página: `src/app/(public)/portal/tasks/[token]/page.tsx`
- Acciones de servidor: `src/modules/features/portal-security/actions/portal-security-actions.ts`
- Componente visual de bloqueo: `src/modules/features/portal-security/components/portal-lockscreen.tsx`
