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
    Building2
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
            requiredPermission: 'crm.leads.edit'
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
            allowedRoles: ['owner', 'admin'],
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
            allowedRoles: ['owner', 'admin'],
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
            allowedRoles: ['owner', 'admin'],
            requiredPermission: 'operations.resto_staff.view'
        }
    },
    {
        key: 'pixy_flows',
        label: 'Pixy Flows',
        href: '/flows',
        icon: BrainCircuit,
        category: 'operations',
        parentModule: 'module_automation',
        access: {
            allowedRoles: ['owner', 'admin']
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
            allowedRoles: ['owner', 'admin'],
            requiredCapabilities: ['crm.quotes']
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
            allowedRoles: ['owner', 'admin'],
            requiredCapabilities: ['billing.management']
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
            allowedRoles: ['owner', 'admin']
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
            allowedRoles: ['owner', 'admin']
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
            allowedRoles: ['owner', 'admin']
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
    const normalizedRole = userRole?.toLowerCase()
    
    // Resolve capability check function
    const hasCap = (cap: string) => {
        if (Array.isArray(capabilities)) return capabilities.includes(cap);
        return capabilities[cap] === true || capabilities['all'] === true;
    }

    const isOwner = normalizedRole === 'owner' || 
                   normalizedRole === 'dueño' || 
                   hasCap('all');

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
        // Core modules and dashboard are infrastructure and should be visible if access allows
        if (isCore || key === 'dashboard') {
            if (!access) return true
            if (isOwner) return true

            // Role check for non-owners
            if (access.allowedRoles && normalizedRole) {
                const allowedNormalized = access.allowedRoles.map(r => r.toLowerCase())
                if (allowedNormalized.includes(normalizedRole)) return true
            }
            
            // Permission check (IAM V2)
            if (access.requiredPermission && hasCap(access.requiredPermission)) {
                return true
            }

            // If it's core but we have a role/perm restriction and we didn't pass, hide it
            if (access.allowedRoles || access.requiredPermission) return false
            
            return true
        }

        // 4. VERTICAL MODULES LOGIC (Requires subscription)
        const checkKey = parentModule || key
        const isSubscribed = activeModules.includes(checkKey)
        
        // If not subscribed, it's hidden regardless of who you are
        if (!isSubscribed) return false

        // If subscribed, check if we have access
        if (!access) return true
        if (isOwner) return true

        // Role check for non-owners
        if (access.allowedRoles && normalizedRole) {
            const allowedNormalized = access.allowedRoles.map(r => r.toLowerCase())
            if (allowedNormalized.includes(normalizedRole)) return true
        }

        // Permission check (IAM V2)
        if (access.requiredPermission && hasCap(access.requiredPermission)) {
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
