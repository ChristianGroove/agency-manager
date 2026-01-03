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
    FileText,
    CreditCard,
    Settings,
    Grid,
    Server,
    Sparkles,
    Megaphone
} from 'lucide-react'

export type ModuleCategory = 'core' | 'operations' | 'automation' | 'finance' | 'config';

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
 * Restored to match EXISTING file structure to prevent 404s
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
    {
        key: 'core_clients',
        label: 'Clientes',
        href: '/clients',
        icon: Users,
        isCore: true, // Always visible
        category: 'core'
    },
    // Calendar placeholder (Point to dashboard or remove if not ready, strictly keeping what works)
    // Removed core_calendar as no route exists yet. User requested "no ocultar nada" (existing) not "invent new".

    // --- VENTAS / SALES ---
    {
        key: 'core_crm', // Key used in database usually
        label: 'CRM / Leads',
        href: '/crm',
        icon: Users,
        isCore: false, // Can be disabled
        category: 'operations' // Using Operations/Sales concept
    },
    {
        key: 'module_quotes',
        label: 'Cotizaciones',
        href: '/quotes',
        icon: FileText,
        category: 'operations'
    },

    // --- AUTOMATIZACIÓN ---
    {
        key: 'module_automation',
        label: 'Automatización',
        href: '/automations',
        icon: Bot,
        isCore: true, // Currently core for MVP
        category: 'automation'
    },
    // Campaigns removed as no route exists yet

    // --- OPERACIONES / PROYECTOS ---
    {
        key: 'module_briefings',
        label: 'Briefings', // Kept original name to match route
        href: '/briefings', // RESTORED VALID PATH
        icon: Briefcase,
        category: 'operations'
    },
    {
        key: 'module_catalog',
        label: 'Catálogo',
        href: '/portfolio', // RESTORED VALID PATH
        icon: Store,
        category: 'operations'
    },
    {
        key: 'core_hosting',
        label: 'Contratos / Hosting',
        href: '/hosting',
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

    // --- FINANZAS ---
    {
        key: 'module_invoicing',
        label: 'Documentos de Cobro',
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
        label: 'App Store',
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
    }
]

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
    core: 'Principal',
    operations: 'Operaciones',
    automation: 'Automatización',
    finance: 'Finanzas',
    config: 'Plataforma'
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
