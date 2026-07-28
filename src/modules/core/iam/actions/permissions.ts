export const PERMISSIONS = {
    // 1. CRM & Sales
    CRM: {
        VIEW_LEADS: 'crm.leads.view',
        EDIT_LEADS: 'crm.leads.edit',
        DELETE_LEADS: 'crm.leads.delete',
        EXPORT_DATA: 'crm.data.export',
    },

    // 2. Messaging (Inbox)
    INBOX: {
        GLOBAL_VIEW: 'inbox.conversations.global_view',
        VIEW_ALL: 'inbox.conversations.view_all',
        TEAM_VIEW: 'inbox.team.view',
        ASSIGN_AGENTS: 'inbox.conversations.assign',
        MANAGE_CHANNELS: 'inbox.channels.manage',
    },

    // 3. Automation / Workflows
    AUTOMATION: {
        VIEW: 'automation.workflows.view',
        EDIT: 'automation.workflows.edit',
        EXECUTE: 'automation.workflows.execute',
    },

    // 4. Invoicing & Finance
    INVOICING: {
        VIEW: 'invoicing.view',
        MANAGE: 'invoicing.manage',
        EXPORT: 'invoicing.export',
    },

    // 5. Specialized Modules
    OPERATIONS: {
        LOCATIONS_VIEW: 'operations.locations.view',
        LOCATIONS_MANAGE: 'operations.locations.manage',
        ATTENDANCE_VIEW: 'operations.attendance.view',
        ATTENDANCE_MANAGE: 'operations.attendance.manage',
        RESTO_VIEW: 'operations.resto.view',
        RESTO_MANAGE: 'operations.resto.manage',
        RESTO_ORDERS_VIEW: 'operations.resto_orders.view',
        RESTO_ORDERS_MANAGE: 'operations.resto_orders.manage',
        RESTO_MENU_VIEW: 'operations.resto_menu.view',
        RESTO_MENU_MANAGE: 'operations.resto_menu.manage',
        RESTO_STAFF_VIEW: 'operations.resto_staff.view',
        RESTO_STAFF_MANAGE: 'operations.resto_staff.manage',
        BRIEFINGS_MANAGE: 'operations.briefings.manage',
        CATALOG_MANAGE: 'operations.catalog.manage',
        BRANDING_MANAGE: 'operations.branding.manage',
    },

    // 6. Organization Management
    ORG: {
        MANAGE_MEMBERS: 'org.members.manage',
        MANAGE_BILLING: 'org.billing.manage',
        MANAGE_ROLES: 'org.roles.manage',
        MANAGE_SETTINGS: 'org.settings.manage',
        VIEW_AUDIT_LOGS: 'org.audit.view',
    }
} as const;

// Helper type to extract all permission strings
type PermissionObject = typeof PERMISSIONS;
type PermissionValues<T> = T extends string ? T : T extends object ? PermissionValues<T[keyof T]> : never;
export type PermissionString = PermissionValues<PermissionObject>;

// UI Metadata for the Role Editor (Accordion Groups)
export const PERMISSION_GROUPS = [
    {
        id: 'crm',
        moduleKey: 'core_clients',
        label: 'CRM y Clientes',
        description: 'Gestión de prospectos, clientes y exportación de datos.',
        permissions: [
            { id: PERMISSIONS.CRM.VIEW_LEADS, label: 'Ver Leads', description: 'Puede ver listas y detalles de leads' },
            { id: PERMISSIONS.CRM.EDIT_LEADS, label: 'Editar Leads', description: 'Puede modificar información de leads' },
            { id: PERMISSIONS.CRM.DELETE_LEADS, label: 'Eliminar Leads', description: 'Eliminación permanente de registros' },
            { id: PERMISSIONS.CRM.EXPORT_DATA, label: 'Exportar Datos', description: 'Descargar base de datos en CSV' },
        ]
    },
    {
        id: 'inbox',
        moduleKey: 'module_messaging',
        label: 'Bandeja y Mensajería',
        description: 'Control de acceso al inbox, canales y supervisión de equipo.',
        permissions: [
            { id: PERMISSIONS.INBOX.GLOBAL_VIEW, label: 'Vista Global de Canales', description: 'Acceso total: ve todos los canales sin necesidad de autorizarlos individualmente' },
            { id: PERMISSIONS.INBOX.VIEW_ALL, label: 'Ver Todas las Conversaciones', description: 'Ve chats no asignados o de otros agentes dentro de los canales autorizados (modo supervisor)' },
            { id: PERMISSIONS.INBOX.TEAM_VIEW, label: 'Supervisión de Equipo', description: 'Puede ver el filtro de agentes y monitorear la actividad del equipo en el inbox' },
            { id: PERMISSIONS.INBOX.ASSIGN_AGENTS, label: 'Asignar Agentes', description: 'Puede reasignar chats a otros miembros' },
            { id: PERMISSIONS.INBOX.MANAGE_CHANNELS, label: 'Gestionar Canales', description: 'Conectar o desconectar números de WhatsApp' },
        ]
    },
    {
        id: 'finance',
        moduleKey: 'module_invoicing',
        label: 'Facturación y Finanzas',
        description: 'Gestión de facturas, pagos y reportes financieros.',
        permissions: [
            { id: PERMISSIONS.INVOICING.VIEW, label: 'Ver Facturas', description: 'Acceso a la lista de comprobantes' },
            { id: PERMISSIONS.INVOICING.MANAGE, label: 'Gestionar Pagos', description: 'Registrar pagos y emitir facturas' },
            { id: PERMISSIONS.INVOICING.EXPORT, label: 'Exportar Reportes', description: 'Descargar resúmenes financieros' },
        ]
    },
    {
        id: 'catalog',
        moduleKey: 'module_catalog',
        label: 'Catálogo de Servicios',
        description: 'Administración de productos y servicios públicos.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.CATALOG_MANAGE, label: 'Gestionar Catálogo', description: 'Crear y editar productos/servicios' },
        ]
    },
    {
        id: 'briefings',
        moduleKey: 'module_briefings',
        label: 'Formularios y Briefings',
        description: 'Gestión de recolección de datos y flujos de bienvenida.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.BRIEFINGS_MANAGE, label: 'Gestionar Briefings', description: 'Crear y modificar formularios de datos' },
        ]
    },
    {
        id: 'automation',
        moduleKey: 'module_automation',
        label: 'Automatización e IA',
        description: 'Gestión de flujos automáticos y chatbots.',
        permissions: [
            { id: PERMISSIONS.AUTOMATION.VIEW, label: 'Ver Flujos', description: 'Puede visualizar automatizaciones existentes' },
            { id: PERMISSIONS.AUTOMATION.EDIT, label: 'Editar Flujos', description: 'Crear y modificar nodos de automatización' },
        ]
    },
    {
        id: 'org',
        moduleKey: 'core_settings',
        label: 'Configuración de Empresa',
        description: 'Controles administrativos de la organización.',
        permissions: [
            { id: PERMISSIONS.ORG.MANAGE_MEMBERS, label: 'Gestionar Miembros', description: 'Invitar y remover miembros del equipo' },
            { id: PERMISSIONS.ORG.MANAGE_ROLES, label: 'Gestionar Roles', description: 'Crear y editar roles personalizados' },
            { id: PERMISSIONS.ORG.MANAGE_BILLING, label: 'Administrar Suscripción', description: 'Gestionar planes y métodos de pago' },
            { id: PERMISSIONS.ORG.MANAGE_SETTINGS, label: 'Gestionar Configuración', description: 'Acceso general al portal de configuración de la organización' },
            { id: PERMISSIONS.OPERATIONS.BRANDING_MANAGE, label: 'Gestionar Marca Blanca', description: 'Configurar logotipos y colores corporativos' },
        ]
    },
    {
        id: 'locations',
        moduleKey: 'core_locations',
        label: 'Sedes y Ubicaciones',
        description: 'Gestión de sucursales y puntos físicos.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.LOCATIONS_VIEW, label: 'Ver Sedes', description: 'Puede visualizar la lista de sedes' },
            { id: PERMISSIONS.OPERATIONS.LOCATIONS_MANAGE, label: 'Gestionar Sedes', description: 'Creación y edición de sucursales' },
        ]
    },
    {
        id: 'attendance',
        moduleKey: 'module_attendance',
        label: 'Control de Asistencia',
        description: 'Monitoreo de entradas y salidas de personal.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW, label: 'Ver Asistencia', description: 'Visualización de registros' },
            { id: PERMISSIONS.OPERATIONS.ATTENDANCE_MANAGE, label: 'Gestionar Asistencia', description: 'Editar o corregir registros' },
        ]
    },
    {
        id: 'resto',
        moduleKey: 'module_resto_tables',
        label: 'Gestión de Mesas y Salones',
        description: 'Layout de restaurante y estado de mesas.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.RESTO_VIEW, label: 'Ver Mesas', description: 'Visualizar el canvas de mesas' },
            { id: PERMISSIONS.OPERATIONS.RESTO_MANAGE, label: 'Gestionar Mesas', description: 'Modificar layout y estados' },
        ]
    },
    {
        id: 'resto_orders',
        moduleKey: 'module_resto_orders',
        label: 'Gestión de Pedidos',
        description: 'Visualización, KDS y gestión operativa de pedidos de restaurante.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW, label: 'Ver Pedidos', description: 'Visualizar pedidos activos y su estado' },
            { id: PERMISSIONS.OPERATIONS.RESTO_ORDERS_MANAGE, label: 'Gestionar Pedidos', description: 'Cambiar estados, editar y cancelar pedidos' },
        ]
    },
    {
        id: 'resto_menu',
        moduleKey: 'module_resto_menu',
        label: 'Menú Digital',
        description: 'Edición de carta, precios, categorías y modificadores.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW, label: 'Ver Menú', description: 'Visualizar la carta y categorías' },
            { id: PERMISSIONS.OPERATIONS.RESTO_MENU_MANAGE, label: 'Gestionar Menú', description: 'Crear, editar y eliminar platos y categorías' },
        ]
    },
    {
        id: 'resto_staff',
        moduleKey: 'module_resto_staff',
        label: 'Personal Operativo',
        description: 'Gestión de meseros, cajeros, zonas y accesos a portales.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.RESTO_STAFF_VIEW, label: 'Ver Personal', description: 'Visualizar lista de colaboradores y sus zonas' },
            { id: PERMISSIONS.OPERATIONS.RESTO_STAFF_MANAGE, label: 'Gestionar Personal', description: 'Crear, editar, bloquear y eliminar colaboradores' },
        ]
    }
];
