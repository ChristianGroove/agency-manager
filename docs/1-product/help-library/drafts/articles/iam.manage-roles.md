---
schema_version: 1
id: iam.manage-roles
title: Administrar roles personalizados y permisos del equipo (IAM V2)
module: iam-permissions
status: draft
audience: tenant-admin
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /platform/settings/roles
keywords:
  - roles
  - permisos
  - iam
  - equipo
  - accesos
  - seguridad
  - privilegios
  - sistema
  - consultar
  - roles del sistema
  - roles de sistema
  - dueño
  - administrador
  - miembro
requirements:
  - Permiso granular org.roles.manage (Gestionar Roles)
evidence:
  - path: src/app/(dashboard)/platform/settings/roles/page.tsx
    symbol: RolesPage
    claim: Protege la ruta mediante validación de sesión y verificación del permiso org.roles.manage.
  - path: src/modules/core/iam/components/role-manager.tsx
    symbol: RoleManager
    claim: Interfaz de dos paneles para listar, buscar, crear, duplicar y eliminar roles de la organización.
  - path: src/modules/core/iam/components/role-editor.tsx
    symbol: RoleEditor
    claim: Editor de permisos en acordeón filtrado por módulos activos, con switches independientes por capacidad.
  - path: src/modules/core/iam/actions/permissions.ts
    symbol: PERMISSIONS
    claim: Catálogo oficial de permisos atómicos clasificados por dominio (CRM, Inbox, Finanzas, Operaciones, Organización).
---

# Administrar roles personalizados y permisos del equipo (IAM V2)

## Propósito
Permitir a los administradores consultar los roles del sistema, diseñar y asignar perfiles de acceso a la medida de su equipo, concediendo únicamente los permisos necesarios para cada puesto de trabajo (vendedores, supervisores de soporte, cajeros, meseros u operativos) sin exponer información confidencial.

## Requisitos y permisos
- Contar con el permiso granular **Gestionar Roles** (`org.roles.manage`).
- Por defecto, este permiso está asignado a los roles de Dueño (`owner`) y Administrador (`admin`).
- Los usuarios que carezcan de este privilegio son redirigidos automáticamente fuera de la página de gestión de roles. La consulta y modificación de roles no está abierta a usuarios con rol regular de miembro (`member`).

## Ubicación en pantalla
- **Ruta web:** `/platform/settings/roles`
- **Navegación:** Sección **Plataforma** (Configuración) → pestaña o submenú de **Roles & Permisos**.

## Roles predeterminados del sistema y roles personalizados
En la columna izquierda de `/platform/settings/roles`, la plataforma presenta la lista completa de roles clasificados en:
1. **Roles del Sistema (System Roles):** Identificados con la etiqueta distintiva *System Role*. Son los roles base de la organización:
   - **Dueño (`owner`):** Control total administrativo, financiero y de suscripción de la organización.
   - **Administrador (`admin`):** Gestión de operaciones, configuración, canales, automatizaciones y equipo.
   - **Miembro (`member`):** Perfil operativo estándar con permisos acotados para sus tareas diarias.
   *Nota de seguridad:* Los nombres de los roles de sistema no pueden renombrarse ni eliminarse de la base de datos para preservar la integridad del control de acceso.
2. **Roles Personalizados (Custom Roles):** Creados por administradores para acotar permisos específicos (por ejemplo: 'Vendedor CRM', 'Supervisor de Soporte', 'Cajero').

## Estructura de la interfaz
La pantalla se divide en dos áreas de trabajo:
1. **Panel lateral izquierdo (Lista de roles):**
   - Buscador para filtrar roles por nombre.
   - Botón **`+` (Nuevo Rol)** para crear un rol desde cero.
   - Listado de roles existentes con indicativo de rol de sistema (*System Role*) en los roles base.
   - Menú de opciones por rol (tres puntos) con opción de eliminar roles personalizados.
2. **Panel derecho (Editor de permisos):**
   - Campos de nombre y descripción del rol.
   - Selector en acordeón de permisos granulares agrupados por módulo.
   - Interruptores individuales para activar o desactivar cada capacidad.

## Pasos para crear un rol personalizado
1. Accede a `/platform/settings/roles`.
2. Presiona el botón **`+`** o **Crear Rol**.
3. Escribe un nombre identificativo (ej: *"Agente de Soporte WhatsApp"*).
4. Despliega los grupos de permisos requeridos y enciende los interruptores correspondientes (ejemplo: en *Bandeja y Mensajería*, activar *Ver Todas las Conversaciones* y *Asignar Agentes*).
5. Haz clic en **Guardar cambios**. El nuevo rol quedará disponible inmediatamente para ser asignado al invitar miembros o editar usuarios existentes.

## Resultado esperado
El rol personalizado se registra en la base de datos de la empresa y restringe las vistas y acciones del usuario según los permisos configurados.

## Problemas habituales y causas comprobadas
- **Al intentar entrar a `/platform/settings/roles` el sistema redirige a `/platform/settings`:**
  *Causa comprobada:* Tu usuario carece del permiso `org.roles.manage`. Solo los administradores o dueños pueden acceder a este módulo.
- **No aparece el botón para eliminar un rol:**
  *Causa comprobada:* Los roles base marcados como *System Role* no admiten eliminación.

## Limitaciones conocidas
- La asignación de roles a miembros se gestiona desde `/platform/settings` en la pestaña de Miembros, no directamente en el editor de roles.

## Temas relacionados
- [Invitar miembros y asignar roles al equipo](iam.invite-members.md)
- [Panel de control y visión general del sistema](dashboard.overview.md)

## Notas de verificación
- Página principal: `src/app/(dashboard)/platform/settings/roles/page.tsx`
- Gestor de roles: `src/modules/core/iam/components/role-manager.tsx`
- Editor de permisos: `src/modules/core/iam/components/role-editor.tsx`
- Catálogo de permisos: `src/modules/core/iam/actions/permissions.ts`
