/**
 * Module Configuration
 * Central mapping of modules to routes and metadata
 */

import {
    LayoutDashboard,
    Users,
    Calendar,
    Target,
    Bot,
    Workflow,
    Briefcase,
    Store,
    Link2,
    FileText,
    CreditCard,
    Settings,
    Grid,
    Server,
    Sparkles,
    Megaphone,
    MessageSquare,
    Kanban,
    Inbox,
    UserSquare,
    BrainCircuit,
    BarChart3,
    ScanFace,
    Mail,
    Utensils,
    ClipboardList,
    Wrench,
    Building2,
    KeyRound
} from 'lucide-react'

export type ModuleCategory = 'core' | 'crm' | 'operations' | 'tools' | 'finance' | 'config';

export interface ModuleRoute {
    key: string
    label: string
    href: string
    icon: any
    isCore?: boolean
    category: ModuleCategory
    description?: string
    access?: {
        allowedRoles?: string[] // e.g. ['owner', 'admin']
        excludedRoles?: string[]
        allowedOrgTypes?: ('platform' | 'reseller' | 'client')[]
        excludedOrgTypes?: ('platform' | 'reseller' | 'client')[]
        allowedSpaces?: string[] // e.g. ['agency', 'medical']
        excludedSpaces?: string[]
        requiredCapabilities?: string[] // New: e.g. ['CAN_MANAGE_CLIENTS']
        requiredPermission?: string // NEW: IAM V2 granular permission string (e.g. 'crm.leads.view')
    }
    parentModule?: string // NEW: Maps this UI route to the actual System Module key in Database (e.g. 'core_crm', 'module_messaging')
}

/**
 * Complete module-to-route mapping
 * CRM ecosystem consolidated under /crm/*
 */
export const MODULE_ROUTES: ModuleRoute[] = [
    // --- CORE (Siempre visible) ---
    {
        key: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        isCore: true,
        category: 'core'
    },

    // --- CRM ECOSYSTEM (Individual Routes) ---
    {
        key: 'crm_inbox',
        label: 'Inbox',
        href: '/crm/inbox',
        icon: Inbox,
        category: 'crm',
        parentModule: 'module_messaging'
    },
    {
        key: 'crm_clients',
        label: 'Contactos',
        href: '/crm/contacts',
        icon: UserSquare,
        category: 'crm',
        parentModule: 'core_clients',
        access: {
            requiredPermission: 'crm.leads.view'
        }
    },
    {
        key: 'crm_pipeline',
        label: 'Pipeline',
        href: '/crm/pipeline',
        icon: Kanban,
        category: 'crm',
        parentModule: 'core_crm',
        access: {
            requiredPermission: 'crm.leads.view'
        }
    },
    {
        key: 'crm_broadcasts',
        label: 'Marketing',
        href: '/crm/marketing',
        icon: Megaphone,
        category: 'crm',
        parentModule: 'core_crm',
        access: {
            requiredPermission: 'marketing.campaigns.view'
        }
    },
    {
        key: 'meta_ads_monitor',
        label: 'Meta Ads',
        href: '/crm/meta-ads',
        icon: BarChart3,
        category: 'crm',
        parentModule: 'module_meta_ads',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    {
        key: 'crm_automations',
        label: 'Automatizaciones',
        href: '/crm/automations',
        icon: Workflow,
        category: 'crm',
        parentModule: 'module_automation',
        access: {
            requiredPermission: 'automation.workflows.view'
        }
    },
    {
        key: 'crm_reports',
        label: 'Reportes',
        href: '/crm/reports',
        icon: BarChart3,
        category: 'crm',
        parentModule: 'module_crm_reports',
        access: {
            allowedRoles: ['owner']
        }
    },
    // Quote Designer moved to Inbox Sidebar per user request
    {
        key: 'crm_settings',
        label: 'CRM Settings',
        href: '/crm/settings',
        icon: Settings,
        category: 'crm',
        parentModule: 'core_crm',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },


    // --- OPERACIONES / PROYECTOS ---
    {
        key: 'core_locations',
        label: 'Sedes',
        href: '/platform/locations',
        icon: Store,
        category: 'operations',
        parentModule: 'core_locations',
        access: {
            requiredPermission: 'operations.locations.view'
        }
    },
    {
        key: 'module_attendance',
        label: 'Asistencia',
        href: '/attendance',
        icon: ScanFace,
        category: 'operations',
        parentModule: 'module_attendance',
        access: {
            requiredPermission: 'operations.attendance.view'
        }
    },

    {
        key: 'module_resto_orders',
        label: 'Gestor de Pedidos',
        href: '/resto-orders',
        icon: ClipboardList,
        category: 'operations',
        parentModule: 'module_resto_orders',
        access: {
            requiredPermission: 'operations.resto_orders.view'
        }
    },
    {
        key: 'module_resto_menu',
        label: 'Menú Digital',
        href: '/menu',
        icon: Utensils,
        category: 'operations',
        parentModule: 'module_resto_menu',
        access: {
            requiredPermission: 'operations.resto_menu.view'
        }
    },
    {
        key: 'module_resto_staff',
        label: 'Personal Operativo',
        href: '/resto-staff',
        icon: Users,
        category: 'operations',
        parentModule: 'module_resto_orders',
        access: {
            requiredPermission: 'operations.resto_staff.view'
        }
    },
    {
        key: 'module_tasks',
        label: 'Tareas',
        href: '/operations/tasks',
        icon: Kanban,
        category: 'operations',
        parentModule: 'module_tasks',
        description: 'Gestión ágil de proyectos, tareas y portales de colaboradores',
        access: {
            requiredPermission: 'operations.tasks.view'
        }
    },
    {
        key: 'module_whitelabel',
        label: 'Marca Blanca',
        href: '/platform/branding',
        icon: Sparkles,
        category: 'config',
        parentModule: 'module_whitelabel',
        access: {
            allowedRoles: ['owner', 'admin'],
            allowedOrgTypes: ['platform', 'reseller']
        }
    },

    {
        key: 'module_quotes',
        label: 'Cotizaciones',
        href: '/quotes',
        icon: FileText,
        category: 'operations',
        parentModule: 'module_quotes',
        access: {
            requiredPermission: 'quotes.view'
        }
    },
    {
        key: 'module_briefings',
        label: 'Briefings',
        href: '/briefings',
        icon: Briefcase,
        category: 'operations',
        parentModule: 'module_briefings',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    {
        key: 'module_catalog',
        label: 'Catálogo',
        href: '/portfolio',
        icon: Store,
        category: 'operations',
        parentModule: 'module_catalog'
    },
    {
        key: 'module_rentals',
        label: 'Gestión de Arriendos',
        href: '/rentals',
        icon: KeyRound,
        category: 'operations',
        parentModule: 'module_rentals',
        access: {
            allowedSpaces: ['real_estate'],
            requiredPermission: 'rentals.view'
        }
    },
    // HIDDEN FOR REGULAR USERS
    {
        key: 'module_contracts',
        label: 'Contratos',
        href: '/hosting',
        icon: FileText,
        category: 'operations',
        parentModule: 'module_contracts',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // HIDDEN FOR REGULAR USERS
    {
        key: 'module_hosting',
        label: 'Hosting Web',
        href: '/platform/hosting-accounts',
        icon: Server,
        category: 'operations',
        parentModule: 'module_hosting',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // EXCLUDED FROM AGENCY SPACE (Legacy - Now managed purely by DB Space config)
    {
        key: 'module_cleaning',
        label: 'Limpieza (Ops)',
        href: '/cleaning',
        icon: Sparkles,
        category: 'operations',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    {
        key: 'module_work_orders',
        label: 'Órdenes de Trabajo',
        href: '/operations/work-orders',
        icon: Wrench,
        category: 'operations',
        parentModule: 'module_cleaning',
        description: 'Gestión y asignación de órdenes de trabajo de campo',
        access: {
            requiredPermission: 'work_orders.view'
        }
    },
    // CUSTOM: MANIFIESTOS IMEI (Activated via Manual Override)
    {
        key: 'module_manifests',
        label: 'Manifiestos',
        href: '/manifests',
        icon: FileText,
        category: 'tools', // Changed to 'tools' (Herramientas)
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // HIDDEN FOR REGULAR USERS
    {
        key: 'core_knowledge',
        label: 'Base de Conocimiento',
        href: '/platform/knowledge',
        icon: BrainCircuit,
        isCore: true,
        category: 'config',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // HIDDEN FOR REGULAR USERS
    {
        key: 'core_integrations',
        label: 'Integraciones',
        href: '/platform/integrations',
        icon: Link2,
        isCore: true,
        category: 'config',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },

    // --- HERRAMIENTAS ---
    {
        key: 'module_contract_generator',
        label: 'Generador de Contratos',
        href: '/tools/contract-generator',
        icon: Sparkles, // Or custom icon
        category: 'tools',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    {
        key: 'tool_email_engine',
        label: 'Motor de Correos',
        href: '/tools/email-engine',
        icon: Mail,
        category: 'tools',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // --- FINANZAS ---
    {
        key: 'module_invoicing',
        label: 'Centro de Facturación',
        href: '/invoices',
        icon: FileText,
        category: 'finance',
        parentModule: 'module_invoicing',
        access: {
            requiredPermission: 'invoicing.view'
        }
    },
    {
        key: 'module_payments',
        label: 'Pagos',
        href: '/payments',
        icon: CreditCard,
        category: 'finance',
        parentModule: 'module_payments',
        access: {
            requiredPermission: 'invoicing.view'
        }
    },

    // --- CONFIGURACIÓN ---
    // HIDDEN FOR REGULAR USERS
    {
        key: 'core_adn',
        label: 'ADN del Negocio',
        href: '/platform/adn',
        icon: ScanFace,
        isCore: true,
        category: 'config',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // HIDDEN FOR REGULAR USERS
    {
        key: 'core_settings',
        label: 'Configuración',
        href: '/platform/settings',
        icon: Settings,
        isCore: true,
        category: 'config',
        access: {
            allowedRoles: ['owner', 'dueño', 'admin', 'administrador'],
            requiredPermission: 'org.settings.manage'
        }
    },
    // --- RESELLER MANAGEMENT ---
    // Invisible for normal clients, visible for Resellers via sidebar logic
    {
        key: 'reseller_tenants',
        label: 'Organizaciones',
        href: '/platform/organizations',
        icon: Building2,
        category: 'core', // Put in core to appear at top
        isCore: true, // Fix: Always core, but protected by access rules (excluded for clients)
        access: {
            excludedOrgTypes: ['client'],
            allowedRoles: ['owner', 'dueño', 'admin', 'administrador']
        }
    }
]

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
    core: 'Principal',
    crm: 'CRM',
    operations: 'Operaciones',
    tools: 'Herramientas',
    finance: 'Finanzas',
    config: 'Plataforma'
};

export const CATEGORY_ICONS: Record<ModuleCategory, any> = {
    core: LayoutDashboard,
    crm: Users,
    operations: Briefcase,
    tools: Wrench,
    finance: CreditCard,
    config: Settings
};

/**
 * Filter routes based on active modules and capabilities
 */
export function filterRoutesByModules(
    activeModules: string[],
    userRole?: string | null,
    orgType?: 'platform' | 'reseller' | 'client',
    vertical?: string,
    capabilities: Record<string, boolean> | string[] = {}
): ModuleRoute[] {
    const rawRole = userRole?.toLowerCase()?.trim()
    const normalizedRole = rawRole === 'administrador' ? 'admin'
                         : rawRole === 'dueño' ? 'owner'
                         : rawRole
    
    // Resolve capability check function
    const hasCap = (cap: string) => {
        if (Array.isArray(capabilities)) return capabilities.includes(cap);
        return capabilities[cap] === true || capabilities['all'] === true;
    }

    const isOwner = normalizedRole === 'owner' || 
                   rawRole === 'dueño' || 
                   hasCap('all');

    const matchesAllowedRole = (allowedRoles?: string[]) => {
        if (!allowedRoles || !rawRole) return false
        const allowedNormalized = allowedRoles.map(r => r.toLowerCase())
        return allowedNormalized.includes(rawRole) || (normalizedRole ? allowedNormalized.includes(normalizedRole) : false)
    }

    return MODULE_ROUTES.filter(route => {
        const { access, isCore, key, parentModule } = route

        // 1. NUCLEAR BLOCKERS (Org Type & Space restrictions)
        if (orgType && access?.excludedOrgTypes?.includes(orgType)) return false
        if (orgType && access?.allowedOrgTypes && !access.allowedOrgTypes.includes(orgType)) return false
        if (vertical && access?.excludedSpaces?.includes(vertical)) return false
        if (vertical && access?.allowedSpaces && !access.allowedSpaces.includes(vertical)) return false
        if (key === 'reseller_tenants' && orgType === 'client') return false

        // 2. CAPABILITY CHECK (New)
        if (access?.requiredCapabilities) {
            const hasRequired = access.requiredCapabilities.every(cap => hasCap(cap));
            if (!hasRequired) return false;
        }

        // 3. CORE & DASHBOARD LOGIC
        // 3. CORE & DASHBOARD LOGIC
        // Core modules and dashboard are infrastructure and should be visible if access allows
        if (isCore || key === 'dashboard') {
            if (!access) return true
            if (isOwner) return true

            // IAM V2: Granular permission check takes absolute priority for non-owners
            if (access.requiredPermission) {
                return hasCap(access.requiredPermission)
            }

            // Fallback: Role check for non-owners if no granular permission is defined
            if (matchesAllowedRole(access.allowedRoles)) {
                return true
            }
            
            return false
        }

        // 4. VERTICAL MODULES LOGIC (Requires subscription)
        const checkKey = parentModule || key
        const isSubscribed = activeModules.includes(checkKey)
        
        // If not subscribed, it's hidden regardless of who you are
        if (!isSubscribed) return false

        // If subscribed, check if we have access
        if (!access) return true
        if (isOwner) return true

        // IAM V2: Granular permission check takes absolute priority for non-owners
        if (access.requiredPermission) {
            return hasCap(access.requiredPermission)
        }

        // Fallback: Role check for non-owners if no granular permission is defined
        if (matchesAllowedRole(access.allowedRoles)) {
            return true
        }

        return false
    })
}

/**
 * Get route for a specific module
 */
export function getModuleRoute(moduleKey: string): ModuleRoute | undefined {
    return MODULE_ROUTES.find(r => r.key === moduleKey)
}

/**
 * All module routes alias
 */
export const ALL_MODULE_ROUTES = MODULE_ROUTES;

/**
 * Module metadata registry
 */
export interface ModuleMetadata {
    key: string;
    name: string;
    description: string;
    category: ModuleCategory;
    icon?: any;
    allowedSpaces?: string[];
}

export const MODULE_METADATA: Record<string, ModuleMetadata> = {
    core_crm: {
        key: 'core_crm',
        name: 'CRM Core',
        description: 'Gestión centralizada de contactos, embudos y tratos comerciales',
        category: 'crm',
        icon: Kanban
    },
    core_clients: {
        key: 'core_clients',
        name: 'Contactos & Clientes',
        description: 'Directorio centralizado de clientes y prospectos',
        category: 'crm',
        icon: UserSquare
    },
    module_messaging: {
        key: 'module_messaging',
        name: 'Mensajería & WhatsApp',
        description: 'Bandeja omnicanal e integraciones de mensajería',
        category: 'crm',
        icon: Inbox
    },
    module_meta_ads: {
        key: 'module_meta_ads',
        name: 'Meta Ads Monitor',
        description: 'Monitoreo de campañas publicitarias y métricas de Meta Ads',
        category: 'crm',
        icon: BarChart3
    },
    module_crm_reports: {
        key: 'module_crm_reports',
        name: 'Reportes CRM',
        description: 'Analítica comercial, tasas de conversión y reportes de ventas',
        category: 'crm',
        icon: BarChart3
    },
    module_quotes: {
        key: 'module_quotes',
        name: 'Cotizaciones',
        description: 'Generación, edición y conversión de propuestas comerciales',
        category: 'operations',
        icon: FileText
    },
    module_catalog: {
        key: 'module_catalog',
        name: 'Catálogo de Servicios / Inmuebles',
        description: 'Gestión de inventario de productos, servicios e inmuebles',
        category: 'operations',
        icon: Store
    },
    module_automation: {
        key: 'module_automation',
        name: 'Automatizaciones & Flujos',
        description: 'Workflows automáticos y triggers basados en eventos',
        category: 'operations',
        icon: Workflow
    },
    core_locations: {
        key: 'core_locations',
        name: 'Sedes & Ubicaciones',
        description: 'Gestión de sucursales y ubicaciones físicas',
        category: 'operations',
        icon: Store
    },
    module_attendance: {
        key: 'module_attendance',
        name: 'Control de Asistencia',
        description: 'Monitoreo de entradas, salidas y turnos de colaboradores',
        category: 'operations',
        icon: ScanFace
    },
    module_resto_orders: {
        key: 'module_resto_orders',
        name: 'Gestor de Pedidos (KDS)',
        description: 'Sistema de comandas, cocina y pedidos para restaurantes',
        category: 'operations',
        icon: ClipboardList,
        allowedSpaces: ['resto']
    },
    module_resto_menu: {
        key: 'module_resto_menu',
        name: 'Menú Digital',
        description: 'Edición de carta digital, platos, categorías y modificadores',
        category: 'operations',
        icon: Utensils,
        allowedSpaces: ['resto']
    },
    module_tasks: {
        key: 'module_tasks',
        name: 'Proyectos & Tareas (TaskFlow)',
        description: 'Gestión ágil de proyectos, tableros Kanban y tareas de equipo',
        category: 'operations',
        icon: Kanban
    },
    module_whitelabel: {
        key: 'module_whitelabel',
        name: 'Marca Blanca',
        description: 'Personalización de logotipos, colores corporativos y dominios',
        category: 'config',
        icon: Sparkles
    },
    module_briefings: {
        key: 'module_briefings',
        name: 'Formularios & Briefings',
        description: 'Formularios dinámicos y recopilación estructurada de datos',
        category: 'operations',
        icon: Briefcase
    },
    module_rentals: {
        key: 'module_rentals',
        name: 'Gestión de Arriendos',
        description: 'Administración de propiedades, contratos de arrendamiento y liquidaciones',
        category: 'operations',
        icon: KeyRound,
        allowedSpaces: ['real_estate']
    },
    module_contracts: {
        key: 'module_contracts',
        name: 'Contratos',
        description: 'Gestión y seguimiento de contratos comerciales',
        category: 'operations',
        icon: FileText
    },
    module_hosting: {
        key: 'module_hosting',
        name: 'Hosting Web',
        description: 'Administración de servidores, cuentas de hosting y DNS',
        category: 'operations',
        icon: Server
    },
    module_cleaning: {
        key: 'module_cleaning',
        name: 'Limpieza & Servicios Operativos',
        description: 'Gestión de cuadrillas y servicios de limpieza o mantenimiento',
        category: 'operations',
        icon: Sparkles,
        allowedSpaces: ['cleaning']
    },
    module_work_orders: {
        key: 'module_work_orders',
        name: 'Órdenes de Trabajo',
        description: 'Creación, programación, despacho y seguimiento de órdenes operativas',
        category: 'operations',
        icon: Wrench
    },
    module_manifests: {
        key: 'module_manifests',
        name: 'Manifiestos IMEI',
        description: 'Registro de manifiestos aduaneros y validación masiva de terminales',
        category: 'tools',
        icon: FileText
    },
    core_knowledge: {
        key: 'core_knowledge',
        name: 'Base de Conocimiento',
        description: 'Repositorio central de guías, artículos y preguntas frecuentes',
        category: 'config',
        icon: BrainCircuit
    },
    core_integrations: {
        key: 'core_integrations',
        name: 'Integraciones',
        description: 'Conectores con pasarelas, plataformas cloud y webhooks',
        category: 'config',
        icon: Link2
    },
    module_contract_generator: {
        key: 'module_contract_generator',
        name: 'Generador de Contratos',
        description: 'Generación automatizada y cifrado de contratos en formato PDF',
        category: 'tools',
        icon: Sparkles
    },
    tool_email_engine: {
        key: 'tool_email_engine',
        name: 'Motor de Correos',
        description: 'Servicio de entrega SMTP y gestión de plantillas de correo',
        category: 'tools',
        icon: Mail
    },
    module_invoicing: {
        key: 'module_invoicing',
        name: 'Centro de Facturación',
        description: 'Emisión de facturas, recibos y cobros electrónicos',
        category: 'finance',
        icon: FileText
    },
    module_payments: {
        key: 'module_payments',
        name: 'Pagos & Pasarelas',
        description: 'Pasarelas de cobro, transacciones y conciliación financiera',
        category: 'finance',
        icon: CreditCard
    },
    module_payroll: {
        key: 'module_payroll',
        name: 'Nómina y Liquidaciones',
        description: 'Liquidación periódica de sueldos, comisiones y dispersión de pagos',
        category: 'finance',
        icon: CreditCard
    },
    core_adn: {
        key: 'core_adn',
        name: 'ADN del Negocio',
        description: 'Definición de directrices, tono y lineamientos estratégicos del negocio',
        category: 'config',
        icon: ScanFace
    },
    core_settings: {
        key: 'core_settings',
        name: 'Configuración de Empresa',
        description: 'Control de organización, miembros, suscripción y ajustes globales',
        category: 'config',
        icon: Settings
    },
    reseller_tenants: {
        key: 'reseller_tenants',
        name: 'Organizaciones Revendedor',
        description: 'Panel de control de cuentas y organizaciones para revendedores',
        category: 'core',
        icon: Building2
    },
    data_vault: {
        key: 'data_vault',
        name: 'Bóveda de Datos (Backups)',
        description: 'Copias de seguridad automáticas, cifrado y restauración de snapshots',
        category: 'config',
        icon: Settings
    }
};

