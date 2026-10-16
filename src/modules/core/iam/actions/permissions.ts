export const PERMISSIONS = {
    MARKETING: {
        VIEW: 'marketing.campaigns.view',
        MANAGE: 'marketing.campaigns.manage',
        EXECUTE: 'marketing.campaigns.execute',
        IMPORT: 'marketing.campaigns.import',
        EXPORT: 'marketing.campaigns.export',
    },
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
        TASKS_VIEW: 'operations.tasks.view',
        TASKS_MANAGE: 'operations.tasks.manage',
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
        MANAGE_INTEGRATIONS: 'org.integrations.manage',
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
        id: 'marketing',
        moduleKey: 'core_crm',
        label: 'Campañas de Marketing',
        description: 'Diseño, activación y datos de campañas.',
        permissions: [
            { id: PERMISSIONS.MARKETING.VIEW, label: 'Ver campañas', description: 'Consultar audiencias, campañas y resultados' },
            { id: PERMISSIONS.MARKETING.MANAGE, label: 'Diseñar campañas', description: 'Crear y editar borradores y audiencias' },
            { id: PERMISSIONS.MARKETING.EXECUTE, label: 'Activar y pausar', description: 'Controlar los envíos masivos' },
            { id: PERMISSIONS.MARKETING.IMPORT, label: 'Importar contactos', description: 'Importar contactos y registrar evidencia de consentimiento' },
            { id: PERMISSIONS.MARKETING.EXPORT, label: 'Exportar resultados', description: 'Descargar resultados de campañas' },
        ],
    },
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
            { id: PERMISSIONS.ORG.MANAGE_INTEGRATIONS, label: 'Gestionar Integraciones', description: 'Instalar, configurar y revocar integraciones externas' },
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
        moduleKey: 'module_resto_orders',
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
        moduleKey: 'module_resto_orders',
        label: 'Personal Operativo',
        description: 'Gestión de meseros, cajeros, zonas y accesos a portales.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.RESTO_STAFF_VIEW, label: 'Ver Personal', description: 'Visualizar lista de colaboradores y sus zonas' },
            { id: PERMISSIONS.OPERATIONS.RESTO_STAFF_MANAGE, label: 'Gestionar Personal', description: 'Crear, editar, bloquear y eliminar colaboradores' },
        ]
    },
    {
        id: 'tasks',
        moduleKey: 'module_tasks',
        label: 'Proyectos & Tareas (TaskFlow)',
        description: 'Gestión ágil de proyectos, tableros Kanban y portales de colaboradores.',
        permissions: [
            { id: PERMISSIONS.OPERATIONS.TASKS_VIEW, label: 'Ver Proyectos y Tareas', description: 'Visualizar tableros Kanban, listas y métricas' },
            { id: PERMISSIONS.OPERATIONS.TASKS_MANAGE, label: 'Gestionar Tareas y Proyectos', description: 'Crear proyectos, tickets, asignar colaboradores y editar estados' },
        ]
    }
];

export const LEGACY_PERMISSION_ALIASES: Record<string, string> = {
    'org.manage_members': PERMISSIONS.ORG.MANAGE_MEMBERS,
    'org.manage_roles': PERMISSIONS.ORG.MANAGE_ROLES,
    'org.manage_billing': PERMISSIONS.ORG.MANAGE_BILLING,
    'org.view_billing': PERMISSIONS.ORG.MANAGE_BILLING,
    'org.manage_settings': PERMISSIONS.ORG.MANAGE_SETTINGS,
    'org.manage_integrations': PERMISSIONS.ORG.MANAGE_INTEGRATIONS,
    'crm.view_leads': PERMISSIONS.CRM.VIEW_LEADS,
    'crm.edit_leads': PERMISSIONS.CRM.EDIT_LEADS,
    'crm.delete_leads': PERMISSIONS.CRM.DELETE_LEADS,
    'crm.export_data': PERMISSIONS.CRM.EXPORT_DATA,
    'inbox.view_all': PERMISSIONS.INBOX.VIEW_ALL,
    'inbox.assign_agents': PERMISSIONS.INBOX.ASSIGN_AGENTS,
    'inbox.manage_channels': PERMISSIONS.INBOX.MANAGE_CHANNELS,
};

/**
 * Repairs mojibake / replacement character sequences ("??" or "\uFFFD") from legacy DB seeds
 */
export function sanitizeBrokenUtf8(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã‘/g, 'Ñ')
        .replace(/â€”/g, '—')
        .replace(/â€“/g, '–')
        .replace(/est(?:\?+|\uFFFD+)ndar/gi, (m) => (m[0] === 'E' ? 'Estándar' : 'estándar'))
        .replace(/Due(?:\?+|\uFFFD+)o/g, 'Dueño')
        .replace(/due(?:\?+|\uFFFD+)o/g, 'dueño')
        .replace(/organizaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'O' ? 'Organización' : 'organización'))
        .replace(/facturaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'F' ? 'Facturación' : 'facturación'))
        .replace(/configuraci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'C' ? 'Configuración' : 'configuración'))
        .replace(/gesti(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'G' ? 'Gestión' : 'gestión'))
        .replace(/m(?:\?+|\uFFFD+)dulo/gi, (m) => (m[0] === 'M' ? 'Módulo' : 'módulo'))
        .replace(/operaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'O' ? 'Operación' : 'operación'))
        .replace(/administraci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'A' ? 'Administración' : 'administración'))
        .replace(/asignaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'A' ? 'Asignación' : 'asignación'))
        .replace(/informaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'I' ? 'Información' : 'información'))
        .replace(/edici(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'E' ? 'Edición' : 'edición'))
        .replace(/creaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'C' ? 'Creación' : 'creación'))
        .replace(/eliminaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'E' ? 'Eliminación' : 'eliminación'))
        .replace(/espec(?:\?+|\uFFFD+)fico/gi, (m) => (m[0] === 'E' ? 'Específico' : 'específico'))
        .replace(/jerarqu(?:\?+|\uFFFD+)a/gi, (m) => (m[0] === 'J' ? 'Jerarquía' : 'jerarquía'))
        .replace(/l(?:\?+|\uFFFD+)der/gi, (m) => (m[0] === 'L' ? 'Líder' : 'líder'))
        .replace(/cat(?:\?+|\uFFFD+)logo/gi, (m) => (m[0] === 'C' ? 'Catálogo' : 'catálogo'))
        .replace(/men(?:\?+|\uFFFD+)/gi, (m) => (m[0] === 'M' ? 'Menú' : 'menú'))
        .replace(/b(?:\?+|\uFFFD+)sico/gi, (m) => (m[0] === 'B' ? 'Básico' : 'básico'))
        .replace(/autom(?:\?+|\uFFFD+)tico/gi, (m) => (m[0] === 'A' ? 'Automático' : 'automático'))
        .replace(/aut(?:\?+|\uFFFD+)nomo/gi, (m) => (m[0] === 'A' ? 'Autónomo' : 'autónomo'))
        .replace(/tel(?:\?+|\uFFFD+)fono/gi, (m) => (m[0] === 'T' ? 'Teléfono' : 'teléfono'))
        .replace(/electr(?:\?+|\uFFFD+)nico/gi, (m) => (m[0] === 'E' ? 'Electrónico' : 'electrónico'))
        .replace(/contrase(?:\?+|\uFFFD+)a/gi, (m) => (m[0] === 'C' ? 'Contraseña' : 'contraseña'))
        .replace(/sesi(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'S' ? 'Sesión' : 'sesión'))
        .replace(/notificaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'N' ? 'Notificación' : 'notificación'))
        .replace(/ubicaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'U' ? 'Ubicación' : 'ubicación'))
        .replace(/atenci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'A' ? 'Atención' : 'atención'))
        .replace(/dise(?:\?+|\uFFFD+)o/gi, (m) => (m[0] === 'D' ? 'Diseño' : 'diseño'))
        .replace(/campa(?:\?+|\uFFFD+)a/gi, (m) => (m[0] === 'C' ? 'Campaña' : 'campaña'))
        .replace(/descripci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'D' ? 'Descripción' : 'descripción'))
        .replace(/validaci(?:\?+|\uFFFD+)n/gi, (m) => (m[0] === 'V' ? 'Validación' : 'validación'))
        .replace(/rese(?:\?+|\uFFFD+)a/gi, (m) => (m[0] === 'R' ? 'Reseña' : 'reseña'));
}

export function resolveSystemRoleKind(role: {
    name?: string | null;
    hierarchy_level?: number | null;
    is_system_role?: boolean | null;
    permissions?: Record<string, any> | null;
}): 'owner' | 'admin' | 'member' | null {
    const cleanName = sanitizeBrokenUtf8(role?.name).trim().toLowerCase();
    const level = typeof role?.hierarchy_level === 'number' ? role.hierarchy_level : 0;
    const isSystem = Boolean(role?.is_system_role);

    if (
        cleanName === 'owner' ||
        cleanName === 'dueño' ||
        cleanName === 'dueno' ||
        level >= 100 ||
        (isSystem && level === 3) ||
        role?.permissions?.all === true
    ) {
        return 'owner';
    }

    if (
        cleanName === 'admin' ||
        cleanName === 'administrador' ||
        (isSystem && (level === 50 || level === 2))
    ) {
        return 'admin';
    }

    if (
        cleanName === 'member' ||
        cleanName === 'miembro' ||
        (isSystem && (level === 10 || level === 1))
    ) {
        return 'member';
    }

    return null;
}

export function getDefaultBaseRolePermissions(kind: 'owner' | 'admin' | 'member'): Record<string, boolean> {
    if (kind === 'owner') {
        return { all: true };
    }
    if (kind === 'admin') {
        return {
            [PERMISSIONS.ORG.MANAGE_MEMBERS]: true,
            [PERMISSIONS.ORG.MANAGE_ROLES]: true,
            [PERMISSIONS.ORG.MANAGE_BILLING]: true,
            [PERMISSIONS.ORG.MANAGE_SETTINGS]: true,
            [PERMISSIONS.ORG.MANAGE_INTEGRATIONS]: true,
            [PERMISSIONS.ORG.VIEW_AUDIT_LOGS]: true,
            [PERMISSIONS.CRM.VIEW_LEADS]: true,
            [PERMISSIONS.CRM.EDIT_LEADS]: true,
            [PERMISSIONS.CRM.DELETE_LEADS]: true,
            [PERMISSIONS.CRM.EXPORT_DATA]: true,
            [PERMISSIONS.MARKETING.VIEW]: true,
            [PERMISSIONS.MARKETING.MANAGE]: true,
            [PERMISSIONS.MARKETING.EXECUTE]: true,
            [PERMISSIONS.MARKETING.IMPORT]: true,
            [PERMISSIONS.MARKETING.EXPORT]: true,
            [PERMISSIONS.INBOX.VIEW_ALL]: true,
            [PERMISSIONS.INBOX.TEAM_VIEW]: true,
            [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
            [PERMISSIONS.INBOX.ASSIGN_AGENTS]: true,
            [PERMISSIONS.INBOX.MANAGE_CHANNELS]: true,
            [PERMISSIONS.INVOICING.VIEW]: true,
            [PERMISSIONS.INVOICING.MANAGE]: true,
            [PERMISSIONS.INVOICING.EXPORT]: true,
            [PERMISSIONS.AUTOMATION.VIEW]: true,
            [PERMISSIONS.AUTOMATION.EDIT]: true,
            [PERMISSIONS.OPERATIONS.CATALOG_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.BRIEFINGS_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.BRANDING_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.LOCATIONS_VIEW]: true,
            [PERMISSIONS.OPERATIONS.LOCATIONS_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW]: true,
            [PERMISSIONS.OPERATIONS.ATTENDANCE_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.TASKS_VIEW]: true,
            [PERMISSIONS.OPERATIONS.TASKS_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.RESTO_VIEW]: true,
            [PERMISSIONS.OPERATIONS.RESTO_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW]: true,
            [PERMISSIONS.OPERATIONS.RESTO_ORDERS_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW]: true,
            [PERMISSIONS.OPERATIONS.RESTO_MENU_MANAGE]: true,
            [PERMISSIONS.OPERATIONS.RESTO_STAFF_VIEW]: true,
            [PERMISSIONS.OPERATIONS.RESTO_STAFF_MANAGE]: true,
        };
    }
    return {
        [PERMISSIONS.CRM.VIEW_LEADS]: true,
        [PERMISSIONS.CRM.EDIT_LEADS]: true,
        [PERMISSIONS.INBOX.VIEW_ALL]: false,
        [PERMISSIONS.INBOX.TEAM_VIEW]: false,
        [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
        [PERMISSIONS.INBOX.ASSIGN_AGENTS]: false,
        [PERMISSIONS.INVOICING.VIEW]: true,
        [PERMISSIONS.AUTOMATION.VIEW]: true,
        [PERMISSIONS.OPERATIONS.LOCATIONS_VIEW]: true,
        [PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW]: true,
        [PERMISSIONS.OPERATIONS.TASKS_VIEW]: true,
        [PERMISSIONS.OPERATIONS.RESTO_VIEW]: true,
        [PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW]: true,
        [PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW]: true,
    };
}

export function normalizeRolePermissions(role: {
    name?: string | null;
    hierarchy_level?: number | null;
    is_system_role?: boolean | null;
    permissions?: Record<string, any> | null;
}): Record<string, boolean> {
    const raw = (role?.permissions && typeof role.permissions === 'object' && !Array.isArray(role.permissions))
        ? role.permissions
        : {};

    const extracted: Record<string, boolean> = {};

    // Flatten legacy nested features map if present
    if (raw.features && typeof raw.features === 'object' && !Array.isArray(raw.features)) {
        for (const [k, v] of Object.entries(raw.features)) {
            if (typeof v === 'boolean') {
                extracted[k] = v;
                const mapped = LEGACY_PERMISSION_ALIASES[k];
                if (mapped && extracted[mapped] === undefined) {
                    extracted[mapped] = v;
                }
            }
        }
    }

    for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'boolean') {
            extracted[k] = v;
            const mapped = LEGACY_PERMISSION_ALIASES[k];
            if (mapped && extracted[mapped] === undefined) {
                extracted[mapped] = v;
            }
        }
    }

    const kind = resolveSystemRoleKind(role);
    if (kind === 'owner') {
        const ownerPerms: Record<string, boolean> = { all: true };
        for (const g of PERMISSION_GROUPS) {
            for (const p of g.permissions) {
                ownerPerms[p.id] = true;
            }
        }
        return {
            ...ownerPerms,
            ...extracted,
            all: true,
        };
    }

    if (kind === 'admin') {
        return {
            ...getDefaultBaseRolePermissions('admin'),
            ...extracted,
        };
    }

    if (kind === 'member') {
        return {
            ...getDefaultBaseRolePermissions('member'),
            ...extracted,
        };
    }

    return extracted;
}

export function normalizeRoleRecord<T extends {
    name?: string;
    description?: string | null;
    hierarchy_level?: number;
    is_system_role?: boolean;
    permissions?: any;
}>(role: T): T {
    if (!role) return role;
    const kind = resolveSystemRoleKind(role);
    const cleanedName = sanitizeBrokenUtf8(role.name);
    const cleanedDescription = role.description != null ? sanitizeBrokenUtf8(role.description) : null;

    let normalizedLevel = typeof role.hierarchy_level === 'number' ? role.hierarchy_level : 10;
    if (kind === 'owner' && normalizedLevel < 100) normalizedLevel = 100;
    else if (kind === 'admin' && normalizedLevel < 50) normalizedLevel = 50;
    else if (kind === 'member' && normalizedLevel < 10) normalizedLevel = 10;

    return {
        ...role,
        name: cleanedName || role.name,
        description: cleanedDescription,
        hierarchy_level: normalizedLevel,
        permissions: normalizeRolePermissions({
            ...role,
            name: cleanedName,
            hierarchy_level: normalizedLevel,
        }),
    };
}

/**
 * Filters PERMISSION_GROUPS strictly by the tenant's active modules,
 * always including universal core modules ('core_clients', 'core_settings').
 */
export function getVisiblePermissionGroups(activeModules?: string[]) {
    // If explicitly undefined, return all PERMISSION_GROUPS as fallback
    if (activeModules === undefined) {
        return PERMISSION_GROUPS;
    }

    const effectiveSet = new Set<string>([
        'core_clients',
        'core_settings',
        ...activeModules,
    ]);

    if (effectiveSet.has('module_marketing')) effectiveSet.add('core_crm');
    if (effectiveSet.has('core_crm')) effectiveSet.add('module_marketing');
    if (effectiveSet.has('module_crm')) effectiveSet.add('core_clients');

    return PERMISSION_GROUPS.filter(
        group => !group.moduleKey || effectiveSet.has(group.moduleKey)
    );
}

