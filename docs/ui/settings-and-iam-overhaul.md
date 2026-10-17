# Arquitectura y Estándar: Configuración, Equipo y Roles IAM V2

Documentación técnica del refactor, estandarización y blindaje de seguridad del módulo de Configuración ([`/platform/settings`](file:///G:/Pixy/agency-manager-mejorasuxui/src/app/(dashboard)/platform/settings/page.tsx)), Gestión de Equipo ([`team-settings-tab.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/team-settings-tab.tsx)), Ficha de Miembro ([`member-edit-sheet.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/member-edit-sheet.tsx)) y Sistema de Roles y Permisos ([`role-manager.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/components/role-manager.tsx) / [`role-service.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/role-service.ts)).

---

## 1. Reorganización de `/platform/settings`

### Pestañas activas y filtrado dinámico por Space
El componente [`SettingsForm`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/settings-form.tsx) gobierna la navegación principal mediante pestañas sincronizadas con la URL (`?tab=`):

- **Suscripción (`subscription`)**: Vista del plan actual y detalles de facturación directa de la app SaaS.
- **Equipo (`team`)**: Directorio del personal, métricas de presencia en tiempo real del Inbox, accesos y ficha detallada.
- **Roles y Permisos (`roles`)**: Tab principal de primer nivel con arquitectura Maestro-Detalle para visualización, duplicación y gestión de permisos por módulo.
- **Notificaciones (`notifications`)**: Remitente de correos, bandeja de salida y enlace directo a `/tools/email-engine`.
- **Facturación (`billing`)**: Emisores y prefijos; se muestra únicamente si la organización tiene activo `core_billing` o `module_invoicing`.
- **Pagos (`payments`)**: Pasarelas (Wompi) y métodos; se muestra únicamente si el Space tiene contratado `module_payments` o facturación.
- **Comisiones (`revenue`)**: Exclusivo para organizaciones de tipo revendedor (`isReseller === true`).

### Limpieza de Pestañas Inactivas / Redundantes
- **Portal (`portal`)**: Eliminado de Settings; la configuración de marca se centraliza en el Centro de Marca y la gobernanza del portal opera en su propio contexto.
- **Auditoría (`audit`)**: Eliminado de Settings debido a acoplamiento roto con `auth.users` y falta de políticas RLS.
- **Vault & Backups (`vault`)**: Desacoplado temporalmente de la interfaz para rediseño futuro, preservando su backend en `src/modules/infrastructure/data-vault`.

### Comportamiento del Encabezado
El botón global **"Guardar"** solo se renderiza en pestañas que editan propiedades de `organization_settings` (`notifications`, `billing`, `payments`). Las pestañas de Equipo y Roles gestionan sus mutaciones de manera transaccional e independiente.

---

## 2. Gestión de Equipo y Ficha Integral del Miembro

### Directorio de Equipo (`TeamSettingsTab`)
- **Métricas Operativas de Inbox**:
  - El contador **Agentes Online (Inbox)** y el indicador `● En línea` validan la presencia efectiva mediante latido reciente (`last_seen_at` o última sesión activa $\le$ 5 minutos).
  - Si un usuario tiene estado configurado como `online` en base de datos pero no tiene actividad reciente, se cataloga correctamente como `Desconectado` u `Offline`.
- **Navegación Fluida**:
  - Enlace rápido "Gestionar Roles y Permisos" que conmuta a la pestaña `roles` sin recargar la página.

### Ficha Detallada del Miembro (`MemberEditSheet`)
Organizada en 4 secciones funcionales:
1. **Perfil**: Nombre completo, cargo (`job_title`), teléfono y metadatos de cuenta (verificación de correo y fecha de último acceso).
2. **Rol IAM**: Selector de rol reactivo (`RolePicker`), resumen de permisos asignados, y panel de **Excepciones Individuales (Overrides)** filtrado estrictamente por los módulos contratados por el inquilino (`activeModules`).
3. **Inbox**: Asignación de canales autorizados (`inbox_access` sincronizado bidireccionalmente con `agent_channels`), capacidad máxima de atención y modo de auto-asignación.
4. **Seguridad**: Disparo de correo de restablecimiento de contraseña, reenvío de invitación, asignación manual de contraseña (restringida a Dueños) y suspensión/reactivación de acceso.

### Prevención de Pérdida de Datos
El estado `hasAnyUnsavedChanges` evalúa modificaciones pendientes en cualquiera de las 4 secciones. Si el usuario intenta cerrar la ficha (clic en backdrop, tecla `ESC`, cruz `X` o botón de cierre) o navegar fuera, el sistema intercepta el evento y solicita confirmación antes de descartar los cambios.

---

## 3. Blindaje de Seguridad Multi-Tenant y Jerárquico

Se implementó una arquitectura de contención en [`src/modules/core/settings/actions/team.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/actions/team.ts) y [`src/modules/core/iam/services/role-service.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/role-service.ts):

| Vulnerabilidad Neutralizada | Regla Implementada en Código |
| :--- | :--- |
| **Fuga de Credenciales / Account Takeover** | `sendMemberPasswordReset`, `resendMemberInvitation` e `inviteMember` retornan únicamente `{ success: true }`. Ningún enlace o token de Supabase Auth se envía al cliente HTTP; la entrega es exclusiva por SMTP. |
| **Inyección de Roles Foráneos** | `createUserManually`, `inviteMember` y `updateMemberRole` consultan `organization_roles` con `.eq('organization_id', orgId)`. Si el rol no pertenece a la organización, la operación es rechazada de inmediato. |
| **Inviolabilidad del Rol Dueño** | Ningún Administrador o usuario de menor jerarquía puede crear, invitar, degradar, suspender o eliminar a un Dueño (`hierarchy >= 100` o `'dueño'` / `'owner'`). Solo un Dueño en sesión puede transferir o modificar a otro Dueño. |
| **Barrera de Jerarquía en Creación / Asignación** | Un usuario con permisos de gestión de miembros no puede asignar ni invitar usuarios con roles de jerarquía igual o superior a la suya (`newHierarchy < actor.hierarchy`). |
| **Prevención de Auto-Escalada** | Un Administrador no puede modificar sus propias excepciones individuales (`caller.id !== target.user_id`) ni otorgar permisos que él mismo no tenga activos. Tampoco se permite conceder `overrides: { all: true }` a usuarios no-Dueños. |
| **Prevención de Auto-Bloqueo** | `toggleMemberStatus` prohíbe que un usuario suspenda su propia cuenta (`caller.id !== target.user_id`). |
| **Permiso Granular IAM** | Se implementó `requireManageMembersAccess` para evaluar `PERMISSIONS.ORG.MANAGE_MEMBERS` (`'org.members.manage'`) además de la compatibilidad con roles base administrativos. |

---

## 4. Roles y Permisos (IAM V2) y Sincronización con Inbox

### Visualización e Hidratación de Permisos (`RoleEditor`)
- Los roles de sistema (`Dueño`, `Administrador`, `Miembro`) se hidratan canónicamente desde [`DEFAULT_ROLES`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts) cuando su definición en base de datos es simplificada (ej. `{ all: true }` o vacía).
- Los switches de los roles de sistema se presentan en modo solo lectura para garantizar la estabilidad del esquema.
- El acordeón de permisos inicializa desplegado sin parpadeos de interfaz.

### Duplicación de Roles
- Se implementó la Server Action [`duplicateRole(roleId, customName)`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/role-actions.ts) que permite clonar un rol base o personalizado como plantilla, ajustando su jerarquía dentro de los límites de roles personalizados ($\le 49$) y revalidando la caché de Next.js.

### Prevención de Error PostgreSQL `42P17`
- Para evitar la recursión infinita en políticas RLS sobre `organization_roles`, las funciones de `role-service.ts` validan la sesión y permisos del actor en el contexto de servidor y ejecutan las lecturas y mutaciones administrativas utilizando `supabaseAdmin`.

### Consistencia con el Inbox (`assignment-engine.ts` y `transfer-service.ts`)
- Se alineó la visibilidad y asignación de canales: los agentes reciben únicamente chats de los canales incluidos en `inbox_access` / `agent_channels`, salvo que posean explícitamente el permiso `inbox.conversations.global_view: true` o sean Dueños de la organización.
- Las consultas al motor de asignación aíslan estrictamente los agentes por `organization_id` y omiten miembros suspendidos (`status === 'blocked'`).

---

## 5. Expansión y Cobertura Completa del Catálogo IAM V2

Se agregaron dominios completos y granulares en [`src/modules/core/iam/actions/permissions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/permissions.ts) y [`default-roles.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts):

- **Arriendos e Inmuebles (`module_rentals`)**:
  - `rentals.view`: Lectura del centro de arriendos, cartera y contratos.
  - `rentals.properties.manage`: Creación, edición y catálogo de propiedades.
  - `rentals.contracts.manage`: Emisión y rescisión de contratos de arriendo.
  - `rentals.settlements.manage`: Liquidaciones a propietarios y cobranza.
- **Cotizaciones (`module_quotes`)**:
  - `quotes.view`: Consulta de cotizaciones y propuestas comerciales.
  - `quotes.manage`: Creación y modificación de propuestas comerciales.
  - `quotes.convert`: Conversión de cotizaciones en clientes y contratos.
- **Órdenes de Trabajo (`module_cleaning`)**:
  - `work_orders.view`: Tablero de operaciones de campo y turnos.
  - `work_orders.manage`: Asignación, despacho y finalización de servicios.
- **Nómina y Liquidaciones (`module_attendance`)**:
  - `payroll.view`: Historial y liquidaciones salariales.
  - `payroll.process`: Procesamiento y cálculo de periodos de nómina.
  - `payroll.pay`: Registro de desembolsos y pagos.
- **Bóveda de Datos (`core_settings`)**:
  - `vault.backup.manage`: Creación y descarga de copias de seguridad.
  - `vault.backup.restore`: Restauración de respaldos.
- **Permisos Huérfanos Saneados**:
  - `automation.workflows.execute` agregado a `PERMISSION_GROUPS.automation`.
  - `org.audit.view` agregado a `PERMISSION_GROUPS.org`.

---

## 6. Blindaje de Server Actions Críticas por Módulo

Todas las acciones del servidor ahora implementan la primitiva canónica `await requirePermission(PERMISSIONS.<DOMINIO>.<ACCION>, orgId)` en [`role-service.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/role-service.ts):

- **Facturación (`billing-actions.ts`)**: `createInvoiceAction`, `deleteInvoicesAction`, `registerPaymentAction`, `deleteServicesAction` exigen `invoicing.manage`; `getInvoicesAction` exige `invoicing.view`.
- **CRM (`lead-management-actions.ts`, `crm-advanced-actions.ts`, `crm-actions.ts`)**: `deleteLeads`, `deleteLeadsByPipeline`, `deleteAllLeads` exigen `crm.leads.delete`; `updateLead` exige `crm.leads.edit`.
- **Tareas (`task-actions.ts`)**: `deleteTask`, `createProject`, `updateProject`, `deleteProject`, `updateWorkspace` exigen `operations.tasks.manage`.
- **Restaurante (`resto-orders/actions.ts`, `resto/tables/actions.ts`, `menu/actions.ts`)**: `processOrderPayment` y `updateRestoOrderStatus` exigen `operations.resto_orders.manage`; `saveLayout` exige `operations.resto.manage`; categorías y platos exigen `operations.resto_menu.manage`.
- **Canales (`channels/actions.ts`)**: `createChannel`, `updateChannel`, `deleteChannel`, `getChannelQrCode` sustituyeron el chequeo legacy `requireOrgRole('admin')` por `inbox.channels.manage`.
- **Asistencia (`attendance/actions.ts`)**: Creación de turnos y registros manuales exigen `operations.attendance.manage`.
- **Arriendos (`rentals-service.ts`, `leases.ts`)**: Creación y cancelación de contratos y liquidaciones exigen `rentals.contracts.manage` y `rentals.settlements.manage`.

---

## 7. Blindaje de Páginas de Servidor (Server Route Guards)

Los Server Components de las rutas principales verifican `hasPermission` y redirigen de forma limpia a `/dashboard?error=unauthorized` si el usuario carece del permiso:

- `/invoices` $\rightarrow$ `invoicing.view`
- `/quotes` $\rightarrow$ `quotes.view`
- `/quotes/create` $\rightarrow$ `quotes.manage`
- `/rentals` $\rightarrow$ `rentals.view`
- `/attendance` $\rightarrow$ `operations.attendance.view`
- `/operations/tasks` $\rightarrow$ `operations.tasks.view`
- `/operations/work-orders` $\rightarrow$ `work_orders.view`
- `/crm/contacts` $\rightarrow$ `crm.leads.view`
- `/crm/pipeline` $\rightarrow$ `crm.leads.view`
- `/crm/marketing` $\rightarrow$ `marketing.campaigns.view`
- `/crm/automations` $\rightarrow$ `automation.workflows.view`
- `/platform/settings` $\rightarrow$ `org.settings.manage`

---

## 8. Hardening de Base de Datos y Asistente IA

1. **Políticas RLS en Base de Datos**:
   - Migración [`20261016000000_harden_task_management_rls.sql`](file:///G:/Pixy/agency-manager-mejorasuxui/supabase/migrations/20261016000000_harden_task_management_rls.sql): Reemplaza las políticas permisivas `USING (true)` en `task_projects`, `task_items`, `task_comments` y `task_project_members` por verificación estricta de aislamiento multi-tenant contra `organization_members`.
2. **Contexto del Asistente IA**:
   - En [`src/modules/assistant/context-resolver.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/assistant/context-resolver.ts), se sustituyó el mock estático de permisos por la resolución en tiempo real vía `getUserPermissionsPayload` y `getActiveModules`, manteniendo compatibilidad con las acciones del asistente.

---

## 9. Estandarización UI/UX, i18n Completo y Ordenamiento Canónico de Roles

1. **Rediseño Estandarizado de la Ficha del Miembro (`MemberEditSheet`)**:
   - Archivo: [`src/modules/core/settings/member-edit-sheet.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/settings/member-edit-sheet.tsx).
   - **Header y Footer Unificados**: Adopta el estándar visual de sheets de plataforma (`/platform/integrations`), eliminando botones duplicados de cierre y consolidando una barra inferior inteligente que habilita **Guardar Cambios** únicamente cuando existen cambios reales (`dirty state`) en la pestaña activa, evitando falsos positivos en la alerta de abandono.
   - **Depuración de Tab Inbox y Seguridad**:
     - En la pestaña **Inbox**, se administra exclusivamente la vinculación de canales (`inbox_access` / `agent_channels`). La disponibilidad y capacidad de carga o autoasignación de agentes es autoridad exclusiva de la configuración directa del módulo Inbox para todo el equipo.
     - En la pestaña **Seguridad**, se eliminaron botones duplicados y bloques redundantes que ya operan desde la tabla principal, además de neutralizar el autocompletado automático del navegador (`autoComplete="new-password"`, `readOnly` hasta foco explícito) en campos de contraseña y barras de búsqueda.

2. **Internacionalización Completa (i18n `es` / `en`) y Orden Canónico de Roles**:
   - Archivos:
     - [`src/modules/core/i18n/dictionaries/es.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/es.ts) y [`src/modules/core/i18n/dictionaries/en.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/en.ts)
     - [`src/modules/core/iam/actions/use-localized-iam.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/use-localized-iam.ts)
   - Todos los tabs de `/platform/settings` (General, Suscripción, Equipo, Roles y Permisos, Facturación, Pagos) y los **13 grupos y 56 permisos** de la matriz IAM cuentan con traducción reactiva 100% libre de textos hardcodeados.
   - **Orden Canónico (`sortRolesWithSystemBaseFirst`)**: En [`src/modules/core/iam/actions/permissions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/permissions.ts), los 3 roles base del sistema se fijan siempre a la izquierda en orden jerárquico (`[Dueño / Owner]`, `[Administrador / Administrator]`, `[Miembro / Member]`), y cualquier rol personalizado creado por la organización se acumula hacia la derecha por orden de creación.

---

## 10. Gobernanza Global IAM V2 en SuperAdmin (`/platform/admin`)

Se implementó el centro de gobierno y auditoría multi-tenant de Roles y Permisos en `/platform/admin` $\rightarrow$ pestaña **Red (Tenants)** $\rightarrow$ sub-pestaña **Roles & Permisos IAM**:

- **Archivos Clave**:
  - Backend / Server Actions: [`src/modules/core/iam/actions/superadmin-iam-actions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/superadmin-iam-actions.ts)
  - Componente UI SuperAdmin: [`src/app/(dashboard)/platform/admin/_components/superadmin-iam-manager.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/app/(dashboard)/platform/admin/_components/superadmin-iam-manager.tsx)
  - Integración en Admin Dashboard: [`src/app/(dashboard)/platform/admin/page.tsx`](file:///G:/Pixy/agency-manager-mejorasuxui/src/app/(dashboard)/platform/admin/page.tsx)
  - Provisioning conectado a plantilla viva: [`src/modules/core/organizations/actions/provisioning.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/organizations/actions/provisioning.ts)
  - Suite de pruebas unitarias: [`src/modules/core/iam/actions/superadmin-iam-actions.test.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/superadmin-iam-actions.test.ts)

### 10.1. Modelo de Precedencia de 3 Capas en Tiempo de Ejecución
La función `normalizePermissionSet` en [`src/modules/core/iam/services/role-service.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/role-service.ts) evalúa los permisos efectivos de cada miembro con la siguiente jerarquía estricta:

1. **Capa 1 — Wildcard Inmutable de Dueño (`Owner`)**:
   - Si el miembro es `Owner` (`role === 'owner'`, `hierarchy_level >= 100` o `role.permissions.all === true`), recibe acceso total (`all: true` y los 56 permisos en `true`). Ningún cambio de rol ni override individual puede revocar permisos a un Dueño.
2. **Capa 2 — Excepción Individual del Usuario (`organization_members.permissions`)**:
   - Si el miembro posee un booleano explícito en su JSONB de excepciones individuales:
     - `true`: **Concesión Extra** sobre su rol asignado.
     - `false`: **Revocación Explícita** aunque su rol asignado tenga el permiso en `true`.
   - Claves reservadas como `inbox_access` (array de UUIDs de canales) se preservan intactas sin colisionar con claves booleanas.
3. **Capa 3 — Permiso del Rol Asignado (`organization_roles.permissions`)**:
   - Si el miembro no tiene excepción individual para una clave, hereda el valor booleano del rol asignado (hidratado con `DEFAULT_ROLES` para roles de sistema).

### 10.2. Políticas de Propagación Global y Resolución de Overrides
Cuando el SuperAdmin edita la matriz global de un rol base (`Administrador` o `Miembro`) y la publica globalmente mediante `publishGlobalBaseRoleAction`, el sistema ejecuta auto-curación de roles base faltantes, revincula `role_id` huérfanos, limpia overrides redundantes y aplica una de las **3 Políticas de Propagación**:

| Política | Comportamiento sobre `organization_members.permissions` | Caso de Uso Recomendado |
| :--- | :--- | :--- |
| **`preserve_overrides`** *(Recomendado)* | Conserva las concesiones (`true`) y revocaciones (`false`) individuales explícitas; solo limpia overrides redundantes que ya coinciden con el nuevo valor del rol base. | Actualizaciones evolutivas de permisos base sin alterar acuerdos particulares de cada agencia. |
| **`clear_conflicting_overrides`** | Elimina únicamente los overrides individuales en las claves de permisos que cambiaron en esta publicación, forzando que esos permisos adopten el nuevo estándar global. | Cuando se corrige o endurece un permiso específico y ningún usuario con ese rol debe conservar la excepción anterior en esa clave. |
| **`clear_all_role_overrides`** | Limpia todos los overrides booleanos de los miembros que tienen ese rol base (preservando intacto `inbox_access`), alineándolos al 100% con la plantilla global. | Estandarización total de auditoría sobre el rol base en toda la red de tenants. |

---

## 11. Protocolo Obligatorio para Nuevos Módulos y Features (Disabled-by-Default & IAM V2 Registration)

> [!CAUTION]
> **REGLA DE ARQUITECTURA INQUEBRANTABLE**:
> 1. **Desactivado por Defecto (`Disabled-by-Default`)**: Todo módulo nuevo o feature nueva que entre al sistema **DEBE nacer desactivado por defecto** (`false` en roles no-Dueño, `auto_enable = false` para tenants existentes, o feature flag apagado) y **requiere confirmación explícita** del SuperAdmin o del Dueño del Tenant antes de activarse.
> 2. **Registro Obligatorio en IAM V2**: Ningún módulo, ruta o acción de servidor puede fusionarse en el repositorio sin estar registrado en el catálogo de permisos de Roles y Permisos IAM V2.

### Checklist Paso a Paso al Registrar un Nuevo Módulo o Feature

1. **1. Registro del Módulo en el Motor SaaS (Desactivado por defecto)**:
   - Si es un módulo comercializable o de Space, registrarlo en `system_modules` / `saas_app_modules` con `auto_enable = false` para organizaciones existentes, exigiendo activación explícita confirmada.
   - Registrar su metadata en `MODULE_METADATA` y sus rutas protegidas en `MODULE_ROUTES` dentro de [`src/modules/core/saas/module-config.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/saas/module-config.ts).

2. **2. Registro en el Catálogo Canónico de Permisos (`permissions.ts`)**:
   - En [`src/modules/core/iam/actions/permissions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/permissions.ts):
     - Añadir las constantes en `PERMISSIONS.<DOMINIO>` usando nomenclatura canónica por puntos (`dominio.recurso.accion`, ej. `'nuevo_modulo.view'`, `'nuevo_modulo.manage'`).
     - Añadir el grupo o las entradas correspondientes en `PERMISSION_GROUPS` vinculando obligatoriamente su `moduleKey` (ej. `moduleKey: 'module_nuevo'`).

3. **3. Configuración en `DEFAULT_ROLES` (Desactivado por Defecto en Roles Operativos)**:
   - En [`src/modules/core/iam/services/default-roles.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts):
     - Todo permiso de una nueva feature o módulo entra en **`false` por defecto** en el rol `Miembro` (y en `false` en `Administrador` si es una capacidad crítica o sensible), de modo que solo se habilite tras confirmación explícita desde **SuperAdmin $\rightarrow$ Roles & Permisos IAM** o por el **Dueño** de la organización.

4. **4. Traducción Bilingüe (`es.ts` y `en.ts`) y Hook de Localización**:
   - Registrar las etiquetas y descripciones del grupo y de cada permiso en [`src/modules/core/i18n/dictionaries/es.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/es.ts), [`src/modules/core/i18n/dictionaries/en.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/en.ts) y mapearlos en [`src/modules/core/iam/actions/use-localized-iam.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/use-localized-iam.ts).

5. **5. Blindaje en Backend (`requirePermission`) y Frontend (`hasPermission`)**:
   - **Backend (Server Actions / API)**: Invocar siempre `await requirePermission(PERMISSIONS.DOMINIO.ACCION, orgId)` al inicio de cada acción.
   - **Frontend (UI / Rutas)**: Filtrar vistas, tabs y botones de mutación con `hasPermission` o `usePermissions`.

---

## 12. Procedimientos de Verificación y Compilación

Para certificar la integridad de este módulo antes de cualquier despliegue o commit:

```bash
# 1. Comprobación estricta de tipos de TypeScript (0 errores requeridos)
npm run check:types

# 2. Ejecución de la suite completa de IAM, SuperAdmin IAM, Settings y Módulos Operativos
npx vitest run src/modules/core/iam src/modules/core/settings src/modules/core/organizations src/modules/features/messaging src/modules/features/billing src/modules/features/crm src/modules/features/tasks src/modules/features/resto-orders src/modules/features/resto/tables src/modules/features/menu src/modules/features/attendance src/modules/features/rentals src/modules/features/work-orders src/modules/features/channels

# 3. Compilación de producción optimizada de Next.js
npm run check:build
```

