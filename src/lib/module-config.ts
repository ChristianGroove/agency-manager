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
    Mail
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
    }
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
        isCore: true,
        category: 'crm'
    },
    {
        key: 'crm_clients',
        label: 'Contactos',
        href: '/crm/contacts',
        icon: UserSquare,
        isCore: true,
        category: 'crm'
    },
    {
        key: 'crm_pipeline',
        label: 'Pipeline',
        href: '/crm/pipeline',
        icon: Kanban,
        isCore: true,
        category: 'crm'
    },
    {
        key: 'crm_broadcasts',
        label: 'Marketing',
        href: '/crm/marketing',
        icon: Megaphone,
        isCore: true,
        category: 'crm'
    },
    {
        key: 'crm_automations',
        label: 'Automatizaciones',
        href: '/crm/automations',
        icon: Workflow,
        isCore: true,
        category: 'crm'
    },
    {
        key: 'crm_reports',
        label: 'Reportes',
        href: '/crm/reports',
        icon: BarChart3,
        isCore: true,
        category: 'crm'
    },
    // Quote Designer moved to Inbox Sidebar per user request
    {
        key: 'crm_settings',
        label: 'CRM Settings',
        href: '/crm/settings',
        icon: Settings,
        isCore: true,
        category: 'crm',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },


    // --- OPERACIONES / PROYECTOS ---

    {
        key: 'pixy_flows',
        label: 'Pixy Flows',
        href: '/flows',
        icon: BrainCircuit, // Usando BrainCircuit para denotar "Cerebro/IA"
        category: 'operations',
        isCore: true
    },

    {
        key: 'module_quotes',
        label: 'Cotizaciones',
        href: '/quotes',
        icon: FileText,
        category: 'operations',
        isCore: true
    },
    {
        key: 'module_briefings',
        label: 'Briefings',
        href: '/briefings',
        icon: Briefcase,
        category: 'operations',
        isCore: true
    },
    {
        key: 'module_catalog',
        label: 'CatÃ¡logo',
        href: '/portfolio',
        icon: Store,
        category: 'operations',
        isCore: true
    },
    // HIDDEN FOR REGULAR USERS
    {
        key: 'module_contracts',
        label: 'Contratos',
        href: '/hosting',
        icon: FileText,
        category: 'operations',
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
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    // EXCLUDED FROM AGENCY SPACE
    {
        key: 'module_cleaning',
        label: 'Limpieza (Ops)',
        href: '/cleaning',
        icon: Sparkles,
        category: 'operations',
        access: {
            excludedSpaces: ['agency']
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
    // HIDDEN FOR REGULAR USERS
    {
        key: 'module_contract_generator',
        label: 'Generador de Contratos',
        href: '/tools/contract-generator',
        icon: Sparkles, // Or custom icon
        category: 'tools',
        isCore: true,
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
        isCore: true,
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },

    // --- FINANZAS ---
    {
        key: 'module_invoicing',
        label: 'Centro de FacturaciÃ³n',
        href: '/invoices',
        icon: FileText,
        category: 'finance',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },
    {
        key: 'module_payments',
        label: 'Pagos',
        href: '/payments',
        icon: CreditCard,
        category: 'finance',
        access: {
            allowedRoles: ['owner', 'admin']
        }
    },

    // --- CONFIGURACIÃ“N ---
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
        label: 'ConfiguraciÃ³n',
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
        icon: Users, // Using Users icon
        category: 'core', // Put in core to appear at top
        isCore: false, // Not core for everyone, logic will handle visibility
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
    tools: Sparkles, // Use Wrench if available, Sparkles for now
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
    capabilities: Record<string, boolean> = {}
): ModuleRoute[] {
    return MODULE_ROUTES.filter(route => {
        // 1. Access Control (Role & Org Type & Space & Capabilities)
        if (route.access) {
            // Check Org Type exclusion
            if (orgType && route.access.excludedOrgTypes?.includes(orgType)) return false
            // Check Org Type inclusion (strict)
            if (orgType && route.access.allowedOrgTypes && !route.access.allowedOrgTypes.includes(orgType)) return false

            // Check Space/Limit exclusion (Legacy Vertical Logic)
            if (vertical && route.access.excludedSpaces?.includes(vertical)) return false
            if (vertical && route.access.allowedSpaces && !route.access.allowedSpaces.includes(vertical)) return false

            // Check Required Capabilities (New V2 Logic)
            if (route.access.requiredCapabilities) {
                const hasAllRequired = route.access.requiredCapabilities.every((cap: string) => capabilities[cap] === true)
                if (!hasAllRequired) return false
            }

            // Check User Role (if userRole provided)
            if (route.access.allowedRoles && userRole) {
                if (!route.access.allowedRoles.includes(userRole)) return false
            } else if (route.access.allowedRoles && !userRole) {
                // If role required but unknown, hide it for safety
                return false
            }
        }

        // 2. Vertical-based "Auto-Core" logic (Legacy support)
        if (vertical === 'agency' && route.category === 'operations' && route.key !== 'module_cleaning') return true


        if (route.isCore) return true

        // 4. Module subscription
        // NUCLEAR OPTION: Explicitly block reseller_tenants for clients, bypassing any other logic fallthrough
        if (route.key === 'reseller_tenants' && orgType === 'client') return false

        return activeModules.includes(route.key)
    })
}

/**
 * Get route for a specific module
 */
export function getModuleRoute(moduleKey: string): ModuleRoute | undefined {
    return MODULE_ROUTES.find(r => r.key === moduleKey)
}
