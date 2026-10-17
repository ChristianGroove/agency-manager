# Estándares de Seguridad y Control de Acceso (IAM V2 / Enterprise RBAC)

Este documento define los protocolos obligatorios para el desarrollo de nuevas funcionalidades, incorporación de nuevos módulos y gobierno de accesos en **Pixy Agency Manager**.

---

## 1. Modelo de Seguridad IAM V2 (Precedencia de 3 Capas)

La plataforma utiliza el motor unificado **IAM V2** ([`src/modules/core/iam/services/role-service.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/role-service.ts)), donde cada miembro pertenece a un Rol de Organización (`organization_roles`) y puede poseer excepciones individuales controladas (`organization_members.permissions`).

### Jerarquía de Evaluación en Tiempo de Ejecución (`normalizePermissionSet`)
1. **Capa 1 — Wildcard Inmutable de Dueño (`Owner`)**:
   - Si el miembro tiene el rol `Dueño` (`role === 'owner'`, `hierarchy_level >= 100` o `role.permissions.all === true`), recibe acceso absoluto (`all: true` y los 56 permisos del catálogo en `true`).
   - El rol `Dueño` no puede ser degradado, suspendido ni restringido por overrides individuales ni publicaciones globales.
2. **Capa 2 — Excepción Individual del Miembro (`organization_members.permissions`)**:
   - Administrada exclusivamente desde la pestaña **Rol IAM** dentro de [`MemberEditSheet`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/member-edit-sheet.tsx) por actores de jerarquía superior.
   - `true`: **Concesión Extra** sobre el rol asignado (un Administrador solo puede conceder permisos que él mismo posea).
   - `false`: **Revocación Explícita** sobre el rol asignado, incluso si el rol tiene el permiso en `true`.
   - Claves no booleanas como `inbox_access` (array de UUIDs de canales) se preservan sin interferir con la matriz booleana.
3. **Capa 3 — Permiso del Rol Asignado (`organization_roles.permissions`)**:
   - Si el miembro no posee excepción explícita para una clave, hereda el valor booleano del rol asignado (hidratado con [`DEFAULT_ROLES`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts) para roles de sistema).

### Roles Base del Sistema y Orden Canónico (`sortRolesWithSystemBaseFirst`)
- En todas las vistas de la plataforma, los **3 roles base de sistema** se fijan a la izquierda en orden jerárquico:
  1. **`Dueño` / `Owner`** (`hierarchy_level: 100`, inmutable).
  2. **`Administrador` / `Administrator`** (`hierarchy_level: 50`, plantilla base global administrable desde SuperAdmin).
  3. **`Miembro` / `Member`** (`hierarchy_level: 10`, plantilla base global administrable desde SuperAdmin).
- Los **Roles Personalizados** creados por cada organización se acumulan a la derecha por fecha de creación.

---

## 2. Regla Inquebrantable para Nuevos Módulos y Features (`Disabled-by-Default`)

> [!IMPORTANT]
> **TODA FEATURE NUEVA O MÓDULO NUEVO ENTRA DESACTIVADO POR DEFECTO Y DEBE REGISTRARSE EN IAM V2**:
> 1. **Desactivado por Defecto (`Disabled-by-Default`)**: Ningún módulo nuevo ni feature nueva puede activarse automáticamente de forma silenciosa en producción. Debe entrar **desactivado por defecto** (`auto_enable = false` en `saas_app_modules` para organizaciones existentes, feature flag apagado, y permiso en `false` dentro de los roles operativos `Miembro` / `Administrador` según corresponda) y **pedir confirmación explícita** antes de activarse.
> 2. **Registro Obligatorio en el Sistema de Roles y Permisos**: Todo módulo o funcionalidad nueva debe registrarse en el catálogo canónico IAM V2 antes de exponerse en UI o Backend.

### Protocolo Paso a Paso para Incorporar un Nuevo Módulo o Feature

#### A. Definición Canónica del Permiso (`permissions.ts`)
1. Agregar las claves en [`src/modules/core/iam/actions/permissions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/permissions.ts) utilizando **notación por puntos (`dominio.recurso.accion`)**:
   ```typescript
   export const PERMISSIONS = {
       // ...
       NUEVO_MODULO: {
           VIEW: 'nuevo_modulo.view',
           MANAGE: 'nuevo_modulo.manage',
       }
   } as const;
   ```
2. Registrar el grupo visual en `PERMISSION_GROUPS` vinculando obligatoriamente su `moduleKey` (para que la matriz IAM filtre automáticamente el grupo si el tenant no tiene activo dicho módulo):
   ```typescript
   nuevo_modulo: {
       label: 'Nuevo Módulo',
       description: 'Control de acceso para el nuevo módulo',
       moduleKey: 'module_nuevo_modulo',
       permissions: [
           { key: PERMISSIONS.NUEVO_MODULO.VIEW, label: 'Ver Nuevo Módulo', description: '...' },
           { key: PERMISSIONS.NUEVO_MODULO.MANAGE, label: 'Gestionar Nuevo Módulo', description: '...' },
       ]
   }
   ```

#### B. Estado Inicial Desactivado en `DEFAULT_ROLES` y Rutas SaaS
1. En [`src/modules/core/iam/services/default-roles.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts):
   - Incluir los nuevos permisos en `DEFAULT_ROLES` estableciéndolos en **`false` por defecto** en `Miembro` (y en `false` en `Administrador` si requiere activación explícita confirmada).
2. En [`src/modules/core/saas/module-config.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/saas/module-config.ts):
   - Registrar el módulo en `MODULE_METADATA` y asociar su ruta y `permission` requerido en `MODULE_ROUTES`.

#### C. Internacionalización (`es.ts`, `en.ts` y `use-localized-iam.ts`)
1. Añadir las traducciones del grupo y de cada permiso en [`es.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/es.ts) y [`en.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/en.ts) bajo `settings.iam_catalog`.
2. Conectar las claves en [`use-localized-iam.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/use-localized-iam.ts).

#### D. Protección Estricta en Backend (`requirePermission`)
Nunca confiar únicamente en la UI ni usar validaciones legacy hardcodeadas (`role === 'admin'`). Proteger siempre cada Server Action o endpoint:
```typescript
import { requirePermission } from "@/modules/core/iam/services/role-service";
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions";

export async function accionSensibleNuevoModulo(orgId: string) {
    await requirePermission(PERMISSIONS.NUEVO_MODULO.MANAGE, orgId);
    // ... lógica autorizada
}
```

#### E. Protección en Frontend (UI y Rutas)
```typescript
const { hasPermission } = usePermissions();
const canManage = hasPermission(PERMISSIONS.NUEVO_MODULO.MANAGE);
```

---

## 3. Gobernanza Global desde SuperAdmin (`/platform/admin`)

Desde `/platform/admin` $\rightarrow$ **Red (Tenants)** $\rightarrow$ **Roles & Permisos IAM** ([`superadmin-iam-manager.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/app/(dashboard)/platform/admin/_components/superadmin-iam-manager.tsx)), el SuperAdmin gobierna las plantillas globales de `Administrador` y `Miembro`:
- **Confirmación y Diff Explícito**: Antes de propagar cualquier cambio de permisos o activar permisos de un nuevo módulo a nivel global, el modal exige confirmar el diff exacto (`+Activados` / `-Desactivados`) y seleccionar la política de propagación sobre overrides individuales (`preserve_overrides`, `clear_conflicting_overrides`, `clear_all_role_overrides`).
- **Aprovisionamiento Conectado**: Toda nueva organización creada vía [`provisioning.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/organizations/actions/provisioning.ts) hereda automáticamente la plantilla global vigente resuelta por `getResolvedGlobalBaseRoles()`.

---

## 4. Autorización Granular de Conversaciones, Leads y Canales (CRM & Inbox)

1. **Visibilidad Global vs Asignados**:
   - **CRM (`crm.leads.view_all`)**: Quien posee `crm.leads.view_all = true` visualiza todos los leads de la organización; quien lo tiene en `false` solo visualiza y opera los leads donde `assigned_to === user.id`.
   - **Inbox (`inbox.conversations.global_view`)**: Quien posee `inbox.conversations.global_view = true` supervisa todas las conversaciones; quien lo tiene en `false` solo accede a conversaciones asignadas a él, sin asignar dentro de sus canales autorizados (`inbox_access` / `agent_channels`), o de canales sin restricción explícita.
2. **Autoridad de Configuración Operativa del Inbox**:
   - La disponibilidad de agentes, capacidad máxima de chats y reglas de autoasignación se administran directamente en la configuración global del módulo **Inbox**, mientras que en [`MemberEditSheet`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/member-edit-sheet.tsx) solo se administra la vinculación de canales permitidos para el miembro.

