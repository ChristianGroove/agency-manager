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
    BarChart3
} from 'lucide-react'

export type ModuleCategory = 'core' | 'crm' | 'operations' | 'finance' | 'config';

export interface ModuleRoute {
    key: string
    label: string
    href: string
    icon: any
    isCore?: boolean
    category: ModuleCategory
    description?: string
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
    {
        key: 'crm_quote_settings',
        label: 'Quote Designer 🎨',
        href: '/settings/quotes',
        icon: Sparkles,
        isCore: true,   // Always visible for now
        category: 'crm'
    },


    // --- OPERACIONES / PROYECTOS ---

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
        category: 'operations'
    },
    {
        key: 'module_catalog',
        label: 'Catálogo',
        href: '/portfolio',
        icon: Store,
        category: 'operations'
    },
    {
        key: 'module_contracts',
        label: 'Contratos',
        href: '/hosting',
        icon: FileText,
        category: 'operations'
    },
    {
        key: 'module_hosting',
        label: 'Hosting Web',
        href: '/platform/hosting-accounts',
        icon: Server,
        category: 'operations'
    },
    {
        key: 'module_cleaning',
        label: 'Limpieza (Ops)',
        href: '/cleaning',
        icon: Sparkles,
        category: 'operations'
    },
    {
        key: 'core_knowledge',
        label: 'Base de Conocimiento',
        href: '/platform/knowledge',
        icon: BrainCircuit,
        isCore: true,
        category: 'config'
    },
    {
        key: 'core_integrations',
        label: 'Integraciones',
        href: '/platform/integrations',
        icon: Link2,
        isCore: true,
        category: 'config'
    },

    // --- FINANZAS ---
    {
        key: 'module_invoicing',
        label: 'Centro de Facturación',
        href: '/invoices',
        icon: FileText,
        category: 'finance'
    },
    {
        key: 'module_payments',
        label: 'Pagos',
        href: '/payments',
        icon: CreditCard,
        category: 'finance'
    },

    // --- CONFIGURACIÓN ---
    {
        key: 'core_apps',
        label: 'Store',
        href: '/platform/apps',
        icon: Grid,
        isCore: true,
        category: 'config'
    },
    {
        key: 'core_settings',
        label: 'Configuración',
        href: '/platform/settings',
        icon: Settings,
        isCore: true,
        category: 'config'
    },
    // --- RESELLER MANAGEMENT ---
    // Invisible for normal clients, visible for Resellers via sidebar logic
    {
        key: 'reseller_tenants',
        label: 'Organizaciones',
        href: '/platform/organizations',
        icon: Users, // Using Users icon
        category: 'core', // Put in core to appear at top
        isCore: false // Not core for everyone, logic will handle visibility
    }
]

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
    core: 'Principal',
    crm: 'CRM',
    operations: 'Operaciones',
    finance: 'Finanzas',
    config: 'Plataforma'
};

export const CATEGORY_ICONS: Record<ModuleCategory, any> = {
    core: LayoutDashboard,
    crm: Users,
    operations: Briefcase,
    finance: CreditCard,
    config: Settings
};

/**
 * Filter routes based on active modules
 */
export function filterRoutesByModules(activeModules: string[]): ModuleRoute[] {
    return MODULE_ROUTES.filter(route => {
        if (route.isCore) return true
        // If activeModules is empty/null, maybe default to showing everything? 
        // Or respect the strict check. For now strict.
        return activeModules.includes(route.key)
    })
}

/**
 * Get route for a specific module
 */
export function getModuleRoute(moduleKey: string): ModuleRoute | undefined {
    return MODULE_ROUTES.find(r => r.key === moduleKey)
}
