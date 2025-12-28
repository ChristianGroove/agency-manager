/**
 * Module Configuration
 * Central mapping of modules to routes and metadata
 */

import { LucideIcon, Users, Server, FileText, CreditCard, Briefcase, Settings, LayoutDashboard } from 'lucide-react'

export interface ModuleRoute {
    key: string           // Module key from system_modules
    label: string         // Display name
    href: string          // Route path
    icon: LucideIcon      // Icon component
    isCore?: boolean      // If true, always visible (bypasses subscription check)
    category?: string     // Optional grouping
}

/**
 * Complete module-to-route mapping
 * Used by Sidebar to filter navigation
 */
export const MODULE_ROUTES: ModuleRoute[] = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        isCore: true, // Always visible
    },
    {
        key: 'core_clients',
        label: 'Clientes',
        href: '/clients',
        icon: Users,
        isCore: true, // Core module, always visible
        category: 'core'
    },
    {
        key: 'core_hosting',
        label: 'Contratos',
        href: '/hosting',
        icon: Server,
        category: 'core'
    },
    {
        key: 'module_invoicing',
        label: 'Documentos de Cobro',
        href: '/invoices',
        icon: FileText,
        category: 'billing'
    },
    {
        key: 'module_quotes',
        label: 'Cotizaciones',
        href: '/quotes',
        icon: FileText,
        category: 'sales'
    },
    {
        key: 'module_briefings',
        label: 'Briefings',
        href: '/briefings',
        icon: FileText,
        category: 'projects'
    },
    {
        key: 'module_catalog',
        label: 'Catálogo',
        href: '/portfolio',
        icon: Briefcase,
        category: 'products'
    },
    {
        key: 'module_payments',
        label: 'Pagos',
        href: '/payments',
        icon: CreditCard,
        category: 'billing'
    },
    {
        key: 'core_settings',
        label: 'Configuración',
        href: '/settings',
        icon: Settings,
        category: 'core'
    },
    {
        key: 'module_workforce',
        label: 'Fuerza Laboral',
        href: '/workforce',
        icon: Users,
        category: 'operations'
    },
    {
        key: 'module_field_ops',
        label: 'Operaciones',
        href: '/ops',
        icon: LayoutDashboard, // Or Calendar/Map icon if available
        category: 'operations'
    }
]

/**
 * Core modules that should ALWAYS be accessible
 * Even if organization has no active subscription
 */
export const CORE_MODULES = [
    'core_clients',
    'core_settings'
]

/**
 * Helper to filter routes based on active modules
 */
export function filterRoutesByModules(activeModules: string[]): ModuleRoute[] {
    return MODULE_ROUTES.filter(route => {
        // Always show dashboard
        if (route.key === 'dashboard') return true

        // Always show core modules
        if (route.isCore) return true

        // Check if module is active
        return activeModules.includes(route.key)
    })
}

/**
 * Get route for a specific module
 */
export function getModuleRoute(moduleKey: string): ModuleRoute | undefined {
    return MODULE_ROUTES.find(r => r.key === moduleKey)
}

/**
 * Check if a route requires module subscription
 */
export function isProtectedRoute(pathname: string): boolean {
    const route = MODULE_ROUTES.find(r => pathname.startsWith(r.href))
    return route ? !route.isCore && route.key !== 'dashboard' : false
}
