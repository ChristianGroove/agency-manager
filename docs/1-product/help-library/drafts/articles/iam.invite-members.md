---
schema_version: 1
id: iam.invite-members
title: Invitar y gestionar miembros del equipo en la organización
module: iam-permissions
status: draft
audience: tenant-admin
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /platform/settings
keywords:
  - miembros
  - invitar
  - equipo
  - usuarios
  - roles
  - colaboradores
  - bajas
requirements:
  - Rol de Administrador o Dueño (permiso org.members.manage)
evidence:
  - path: src/modules/core/settings/actions/team.ts
    symbol: inviteMember
    claim: Genera enlaces seguros de invitación o magic link para vincular usuarios existentes o nuevos a la organización con role_id específico.
  - path: src/modules/core/settings/actions/team.ts
    symbol: getOrganizationMembers
    claim: Lista miembros activos filtrando automáticamente cuentas de superadministradores de plataforma para aislamiento estricto.
  - path: src/modules/core/settings/team-settings-tab.tsx
    symbol: TeamSettingsTab
    claim: Tabla de colaboradores con estado, rol asignado, selector de canales y modal de invitación.
---

# Invitar y gestionar miembros del equipo en la organización

## Propósito
Permitir a los administradores incorporar nuevos colaboradores a la organización mediante enlaces seguros de invitación, asignarles roles de acceso específicos y gestionar las altas o bajas del equipo.

## Requisitos y permisos
- Contar con rol de **Administrador** (`admin`) o **Dueño** (`owner`) en la organización activa.
- Para enviar invitaciones se requiere el permiso granular **Gestionar Miembros** (`org.members.manage`).
- El correo electrónico del colaborador debe ser válido y tener acceso a su bandeja de entrada para completar la confirmación.

## Ubicación en pantalla
- **Ruta web:** `/platform/settings`
- **Pestaña:** Navega a la pestaña de **Equipo** (*Team*) dentro de la configuración de la empresa.

## Flujo de invitación
El sistema maneja de forma inteligente dos escenarios según el estado previo del usuario en la plataforma:
1. **Usuario nuevo:** El sistema genera un enlace de invitación oficial (`type: 'invite'`) que le permite definir su contraseña personal al ingresar por primera vez.
2. **Usuario existente en Pixy (que ya pertenece a otra empresa o tiene cuenta previa):** Para evitar errores de cuenta duplicada, el sistema genera de forma transparente un enlace de acceso directo seguro (*Magic Link*) que lo vincula a la nueva organización sin requerir un nuevo registro.

## Pasos para invitar a un colaborador
1. Accede a **Configuración** (`/platform/settings`) y selecciona la pestaña **Equipo**.
2. Haz clic en el botón superior **Invitar Miembro**.
3. En el formulario modal que se abre:
   - Introduce el **Correo electrónico** del nuevo colaborador.
   - Selecciona el **Rol** que desempeñará (puedes elegir roles base o cualquier rol personalizado creado previamente en el gestor de roles).
4. Haz clic en **Enviar Invitación** o copia el enlace de acceso generado si requieres enviarlo directamente por canal interno.
5. El sistema añadirá el registro a la lista de miembros de la organización en estado activo o pendiente de ingreso.

## Pasos para modificar el rol de un miembro
1. En la tabla de miembros de la pestaña **Equipo**, localiza al usuario.
2. Utiliza el selector desplegable en la columna de **Rol** para asignar el nuevo rol deseado.
3. El cambio se guarda automáticamente y el usuario recibirá sus nuevos permisos de inmediato.

## Pasos para dar de baja a un miembro
1. Localiza al usuario en la lista de miembros.
2. Haz clic en el menú de acciones (icono de tres puntos o botón de papelera).
3. Selecciona **Eliminar Miembro**.
4. Confirma la acción. El usuario perderá el acceso a la organización de inmediato (sus sesiones abiertas no podrán seguir consultando datos del tenant).

## Resultado esperado
El usuario recibe la invitación por correo con un enlace seguro firmado por el sistema, o accede mediante el enlace proporcionado. Al autenticarse, es redirigido al `/dashboard` con las vistas y permisos correspondientes a su rol.

## Problemas habituales y causas comprobadas
- **Mensaje "Rol inválido (UUID requerido)":**
  *Causa comprobada:* Ocurre si se intenta enviar un rol legacy con nombre plano en vez del identificador único del catálogo dinámico de roles de la base de datos. Selecciona siempre el rol desde el desplegable oficial.
- **La cuenta del superadministrador no aparece en la lista del equipo:**
  *Causa comprobada:* Es un comportamiento intencional de seguridad (`getOrganizationMembers`). Las cuentas con rol de superadministrador global de la plataforma se excluyen deliberadamente de las vistas de los tenants para garantizar la confidencialidad técnica.
- **El enlace expiró antes de que el usuario lo abriera:**
  *Causa comprobada:* Los enlaces temporales tienen un plazo de expiración por seguridad. Si expira, el administrador simplemente debe volver a generar la invitación desde el panel.

## Limitaciones conocidas
- El Dueño inicial de la organización (`owner`) no puede ser eliminado ni degradado por otros administradores; la transferencia de titularidad requiere un proceso de cesión formal.

## Temas relacionados
- [Administrar roles personalizados y permisos del equipo](iam.manage-roles.md)
- [Navegación y vista general del panel principal](dashboard.overview.md)

## Notas de verificación
- Acciones de equipo: `src/modules/core/settings/actions/team.ts` (funciones `inviteMember` y `getOrganizationMembers`).
- Generación de enlaces seguros: `src/modules/core/iam/services/auth-link-utils.ts`
- Pestaña UI: `src/modules/core/settings/team-settings-tab.tsx`
