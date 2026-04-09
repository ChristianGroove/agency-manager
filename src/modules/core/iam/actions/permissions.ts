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
        VIEW_ALL: 'inbox.conversations.view_all',
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
        BRIEFINGS_MANAGE: 'operations.briefings.manage',
        CATALOG_MANAGE: 'operations.catalog.manage',
        BRANDING_MANAGE: 'operations.branding.manage',
    },

    // 6. Organization Management
    ORG: {
        MANAGE_MEMBERS: 'org.members.manage',
        MANAGE_BILLING: 'org.billing.manage',
        MANAGE_ROLES: 'org.roles.manage',
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
        description: 'GestiÃ³n de prospectos, clientes y exportaciÃ³n de datos.',
        permissions: [
            { id: PERMISSIONS.CRM.VIEW_LEADS, label: 'Ver Leads', description: 'Puede ver listas y detalles de leads' },
            { id: PERMISSIONS.CRM.EDIT_LEADS, label: 'Editar Leads', description: 'Puede modificar informaciÃ³n de leads' },
            { id: PERMISSIONS.CRM.DELETE_LEADS, label: 'Eliminar Leads', description: 'EliminaciÃ³n permanente de registros' },
            { id: PERMISSIONS.CRM.EXPORT_DATA, label: 'Exportar Datos', description: 'Descargar base de datos en CSV' },
        ]
    },
    {
        id: 'inbox',
        moduleKey: 'module_messaging',
        label: 'Bandeja y MensajerÃ­a',
        description: 'Control de acceso a chats y configuraciÃ³n de canales.',
        permissions: [
            { id: PERMISSIONS.INBOX.VIEW_ALL, label: 'Ver Todas las Conversaciones', description: 'Ver todos los chats dentro de los canales autorizados (si no, solo los asignados)' },
            { id: PERMISSIONS.INBOX.ASSIGN_AGENTS, label: 'Asignar Agentes', description: 'Puede reasignar chats a otros miembros' },
            { id: PERMISSIONS.INBOX.MANAGE_CHANNELS, label: 'Gestionar Canales', description: 'Conectar o desconectar nÃºmeros de WhatsApp' },
        ]
    },
    {
        id: 'finance',
        moduleKey: 'module_invoicing',
        label: 'FacturaciÃ³n y Finanzas',
        description: 'GestiÃ³n de facturas, pagos y reportes financieros.',
        permissions: [
            { id: PERMISSIONS.INVOICING.VIEW, label: 'Ver Facturas', description: 'Acceso a la lista de comprobantes' },
            { id: PERMISSIONS.INVOICING.MANAGE, label: 'Gestionar Pagos', description: 'Registrar pagos y emitir facturas' },
            { id: PERMISSIONS.INVOICING.EXPORT, label: 'Exportar Reportes', description: 'Descargar resÃºmenes financieros' },
        ]
    },
    {
        id: 'catalog',
        moduleKey: 'module_catalog',
        label: 'CatÃ¡logo de Servicios',
        description: 'AdministraciÃ³n de productos y servicios pÃºblicos.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.CATALOG_MANAGE, label: 'Gestionar CatÃ¡logo', description: 'Crear y editar productos/servicios' },
        ]
    },
    {
        id: 'briefings',
        moduleKey: 'module_briefings',
        label: 'Formularios y Briefings',
        description: 'GestiÃ³n de recolecciÃ³n de datos y flujos de bienvenida.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.BRIEFINGS_MANAGE, label: 'Gestionar Briefings', description: 'Crear y modificar formularios de datos' },
        ]
    },
    {
        id: 'automation',
        moduleKey: 'module_automation',
        label: 'AutomatizaciÃ³n e IA',
        description: 'GestiÃ³n de flujos automÃ¡ticos y chatbots.',
        permissions: [
            { id: PERMISSIONS.AUTOMATION.VIEW, label: 'Ver Flujos', description: 'Puede visualizar automatizaciones existentes' },
            { id: PERMISSIONS.AUTOMATION.EDIT, label: 'Editar Flujos', description: 'Crear y modificar nodos de automatizaciÃ³n' },
        ]
    },
    {
        id: 'org',
        moduleKey: 'core_settings',
        label: 'ConfiguraciÃ³n de Empresa',
        description: 'Controles administrativos de la organizaciÃ³n.',
        permissions: [
            { id: PERMISSIONS.ORG.MANAGE_MEMBERS, label: 'Gestionar Miembros', description: 'Invitar y remover miembros del equipo' },
            { id: PERMISSIONS.ORG.MANAGE_ROLES, label: 'Gestionar Roles', description: 'Crear y editar roles personalizados' },
            { id: PERMISSIONS.ORG.MANAGE_BILLING, label: 'Administrar SuscripciÃ³n', description: 'Gestionar planes y mÃ©todos de pago' },
            { id: PERMISSIONS.OPERATIONS.BRANDING_MANAGE, label: 'Gestionar Marca Blanca', description: 'Configurar logotipos y colores corporativos' },
        ]
    },
    {
        id: 'locations',
        moduleKey: 'core_locations',
        label: 'Sedes y Ubicaciones',
        description: 'GestiÃ³n de sucursales y puntos fÃ­sicos.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.LOCATIONS_VIEW, label: 'Ver Sedes', description: 'Puede visualizar la lista de sedes' },
            { id: PERMISSIONS.OPERATIONS.LOCATIONS_MANAGE, label: 'Gestionar Sedes', description: 'CreaciÃ³n y ediciÃ³n de sucursales' },
        ]
    },
    {
        id: 'attendance',
        moduleKey: 'module_attendance',
        label: 'Control de Asistencia',
        description: 'Monitoreo de entradas y salidas de personal.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW, label: 'Ver Asistencia', description: 'VisualizaciÃ³n de registros' },
            { id: PERMISSIONS.OPERATIONS.ATTENDANCE_MANAGE, label: 'Gestionar Asistencia', description: 'Editar o corregir registros' },
        ]
    },
    {
        id: 'resto',
        moduleKey: 'module_resto_tables',
        label: 'GestiÃ³n de Mesas y Salones',
        description: 'Layout de restaurante y estado de mesas.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.RESTO_VIEW, label: 'Ver Mesas', description: 'Visualizar el canvas de mesas' },
            { id: PERMISSIONS.OPERATIONS.RESTO_MANAGE, label: 'Gestionar Mesas', description: 'Modificar layout y estados' },
        ]
    }
];
