# Estándares de Seguridad y Control de Acceso (RBAC)

Este documento define los protocolos obligatorios para el desarrollo de nuevas funcionalidades y la gestión de accesos en la plataforma.

## 1. Modelo de Seguridad (Enterprise RBAC v2)

La plataforma utiliza un modelo de **Control de Acceso Basado en Roles (RBAC)** estricto y unificado.
- **Un Usuario = Un Rol de Organización**.
- Los permisos **no se asignan individualmente** a usuarios.
- Los permisos se asignan a **Roles**, y los Roles a **Usuarios**.

### Roles del Sistema (Inmutables/Traducidos)
- **Dueño (Owner):** Acceso total (`*`). No editable.
- **Admin:** Acceso administrativo amplio. Editable limitadamente.
- **Miembro (Member):** Acceso estándar base.

### Roles Personalizados
- Creados dinámicamente en `/settings/roles` (ej. "Ventas", "Editor", "Soporte").
- Tienen un set específico de permisos (`permissions` JSONB en BD).

## 2. Protocolo para Nuevas Features

**CRÍTICO:** Cada vez que se desarrolle una nueva funcionalidad, módulo o "Feature Flag", se debe seguir este procedimiento:

### A. Definición del Permiso
1.  Identificar si la funcionalidad requiere control de acceso.
2.  Agregar la definición del permiso en `src/modules/core/iam/permissions.ts`.
    ```typescript
    export const PERMISSIONS = {
        // ...
        NUEVO_MODULO: {
            VER: 'nuevo_modulo:view',
            EDITAR: 'nuevo_modulo:edit',
        }
    }
    ```
3.  Agregar el permiso a los grupos visuales en `PERMISSION_GROUPS` del mismo archivo para que aparezca en el Editor de Roles.

### B. Implementación en Backend (Server Actions/API)
Nunca confiar solo en la UI. Proteger siempre la acción del servidor.
```typescript
import { hasPermission } from "@/modules/core/iam/services/role-service"

export async function nuevaAccionSensible() {
   const permitido = await hasPermission('nuevo_modulo:edit');
   if (!permitido) throw new Error("Acceso denegado");
   // ... lógica
}
```

### C. Implementación en Frontend (UI)
Ocultar elementos a los que el usuario no tiene acceso.
```typescript
const canEdit = usePermission('nuevo_modulo:edit');

if (canEdit) {
  <Button>Editar</Button>
}
```

### D. Actualización de Roles Existentes
Al desplegar la feature, decidir si los roles existentes (Admin, Miembro) deben tener este permiso por defecto y crear una migración o script si es necesario, o instruir al Super Admin para que actualice los roles desde "Gestionar Roles".

### E. Protección Granular de Interfaz (Business Admin Only)
En vistas que consolidan tanto operación como administración (ej. Inbox Settings), se debe usar el patrón de inyección de `isAdmin`/`isOwner` derivado de `getCurrentUserPermissions`.
- **Regla**: Pestañas de configuración masiva o dashboards de supervisión deben renderizarse condicionalmente.
- **Implementación**: Pasar el flag `isAdmin` desde el contenedor principal (Sheet) hacia los sub-componentes especializados (Dashboards).

## 3. Gestión de Usuarios y UI

- **Unificación:** La asignación de roles y la gestión de credenciales se realiza estrictamente a través de `MemberEditSheet` en `/settings`.
- **Prohibido:** No crear interfaces paralelas de asignación de permisos directos ("toggles" sueltos en perfiles de usuario que no estén atados a un rol).
- **UX:** Usar `RolePicker` para consistencia en toda la plataforma.

## 4. Autorización Granular de Canales (Inbox)

La asignación de canales a agentes sigue un esquema híbrido por razones de compatibilidad y granularidad:
- **Legacy/Type-level (Tabla `agent_channels`):** Se usa para permisos por tipo de proveedor (ej. "todos los WhatsApp").
- **Modern/Channel-level (Array `inbox_access`):** Almacenado en el JSON de `permissions` del miembro (`organization_members`). Es el estándar preferido para asignar canales específicos por su UUID.
- **Regla de Validación**: El motor de asignación (`assignment-engine.ts`) y la UI de editores deben validar contra **ambos orígenes** (OR) para determinar la elegibilidad de un agente.
- **Acceso Implícito**: Los roles `Admin` y `Owner` siempre se consideran autorizados para todos los canales de la organización, independientemente de sus vinculaciones explícitas.

## 5. Auditoría y Limpieza

- Mantener la tabla `organization_roles` limpia.
- Migraciones de base de datos deben respetar la integridad referencial de `role_id`.
