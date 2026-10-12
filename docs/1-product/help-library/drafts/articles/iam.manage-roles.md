---
schema_version: 1
id: iam.manage-roles
title: Administrar roles personalizados y permisos del equipo (IAM V2)
module: iam-permissions
status: draft
audience: tenant-admin
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
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
Permitir a los administradores diseñar y asignar perfiles de acceso a la medida de su equipo, concediendo únicamente los permisos necesarios para cada puesto de trabajo (vendedores, supervisores de soporte, cajeros, meseros u operativos) sin exponer información confidencial.

## Requisitos y permisos
- Contar con el permiso granular **Gestionar Roles** (`org.roles.manage`).
- Por defecto, este permiso está asignado a los roles de Dueño (`owner`) y Administrador (`admin`).
- Los usuarios que carezcan de este privilegio son redirigidos automáticamente fuera de la página de gestión de roles.

## Ubicación en pantalla
- **Ruta web:** `/platform/settings/roles`
- **Navegación:** Sección **Plataforma** (Configuración) → pestaña o submenú de **Roles & Permisos**.

## Estructura de la interfaz
La pantalla se divide en dos áreas de trabajo:
1. **Panel lateral izquierdo (Lista de roles):**
   - Buscador para filtrar roles por nombre.
   - Botón **`+` (Nuevo Rol)** para crear un rol desde cero.
   - Listado de roles existentes con indicativo de rol de sistema (*System Role*) en los roles base.
   - Menú de opciones por rol (tres puntos) con opción de eliminar roles personalizados.
2. **Panel derecho (Editor de permisos):**
   - Campos de nombre y descripción del rol.
   - Indicador de permisos habilitados vs. total de permisos disponibles.
   - Acordeones desplegables con interruptores (*switches*) para cada permiso atómico.

## Catálogo de permisos por módulo
Los permisos disponibles se ajustan dinámicamente a los módulos activos de la empresa:
- **CRM y Clientes:**
  - *Ver Leads (`crm.leads.view`):* Visualización de prospectos y detalles.
  - *Editar Leads (`crm.leads.edit`):* Creación y modificación de datos de clientes.
  - *Eliminar Leads (`crm.leads.delete`):* Borrado de registros de clientes.
  - *Exportar Datos (`crm.data.export`):* Descarga de bases de datos en formato CSV.
- **Bandeja y Mensajería (Inbox):**
  - *Vista Global de Canales (`inbox.conversations.global_view`):* Acceso total a todos los canales de WhatsApp y redes sin requerir asignación previa.
  - *Ver Todas las Conversaciones (`inbox.conversations.view_all`):* Modo supervisor para leer chats asignados a otros agentes o no asignados.
  - *Supervisión de Equipo (`inbox.team.view`):* Monitoreo de carga y actividad de agentes.
  - *Asignar Agentes (`inbox.conversations.assign`):* Reasignar conversaciones entre miembros.
  - *Gestionar Canales (`inbox.channels.manage`):* Conectar o desconectar números de WhatsApp.
- **Facturación y Finanzas:**
  - *Ver Facturas (`invoicing.view`):* Consulta de comprobantes emitidos.
  - *Gestionar Pagos (`invoicing.manage`):* Registrar abonos y crear facturas.
  - *Exportar Reportes (`invoicing.export`):* Descargar reportes financieros.
- **Configuración de Empresa:**
  - *Gestionar Miembros (`org.members.manage`):* Invitar o dar de baja colaboradores.
  - *Gestionar Roles (`org.roles.manage`):* Crear y editar roles y permisos.
  - *Administrar Suscripción (`org.billing.manage`):* Métodos de pago y plan de la plataforma.
  - *Gestionar Configuración (`org.settings.manage`):* Parámetros generales del tenant.
- **Módulos Operativos (según vertical activa):**
  - Tareas (`operations.tasks.view`, `operations.tasks.manage`), Catálogo (`operations.catalog.manage`), Sedes (`operations.locations.manage`), Asistencia (`operations.attendance.manage`), Menú digital y Pedidos de restaurante.

## Pasos para crear y configurar un rol
1. Accede a `/platform/settings/roles`.
2. Haz clic en el botón **`+`** en la parte superior de la lista izquierda. Se creará un nuevo rol con nombre provisional (*New Custom Role*).
3. En el panel derecho, edita el nombre (por ejemplo: *"Agente de Ventas Junior"*) y escribe una descripción clara.
4. Despliega los grupos de permisos que corresponden a sus funciones y enciende los interruptores necesarios.
5. Haz clic en el botón superior **Guardar Cambios** (`Save`).
6. El rol quedará disponible de inmediato para ser asignado a miembros nuevos o existentes.

## Pasos para eliminar un rol personalizado
1. Selecciona el rol en la lista izquierda.
2. Haz clic en el icono de opciones (tres puntos) junto al nombre del rol.
3. Selecciona **Eliminar**.
4. Confirma la advertencia de que los usuarios que tenían asignado este rol perderán sus accesos asociados.

## Resultado esperado
Los cambios se persisten en la tabla `organization_roles`. Los miembros asignados a este rol verán adaptadas sus pantallas y opciones de menú de inmediato en su siguiente acción o recarga.

## Problemas habituales y causas comprobadas
- **No aparece el botón de eliminar o el nombre del rol está bloqueado:**
  *Causa comprobada:* El rol seleccionado es un **Rol de Sistema** predefinido (`is_system_role: true`, como Dueño o Administrador). Estos roles no pueden eliminarse ni renombrarse para proteger la estabilidad del sistema.
- **Un usuario con permiso de ver leads no puede exportar datos:**
  *Causa comprobada:* La exportación a CSV está segregada bajo el permiso independiente `crm.data.export`. Debes habilitar ese interruptor específico en el editor de roles.
- **Un grupo de permisos completo no aparece en pantalla:**
  *Causa comprobada:* El editor de roles oculta automáticamente los grupos cuyos módulos no estén contratados o habilitados en la organización activa para mantener limpia la configuración.

## Limitaciones conocidas
- La jerarquía de roles impide que un usuario edite un rol con mayor nivel de privilegios que el suyo propio.
- Los superadministradores de la plataforma global gestionan sus permisos de forma externa a este panel de tenant.

## Temas relacionados
- [Invitar y gestionar miembros del equipo](iam.invite-members.md)
- [Navegación y vista general del panel principal](dashboard.overview.md)

## Notas de verificación
- Página: `src/app/(dashboard)/platform/settings/roles/page.tsx`
- Componentes UI: `src/modules/core/iam/components/role-manager.tsx`, `role-editor.tsx`
- Definición de permisos: `src/modules/core/iam/actions/permissions.ts`
- Acciones de servidor: `src/modules/core/iam/actions/role-actions.ts`
