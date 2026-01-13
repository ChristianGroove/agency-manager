"use server"

/**
 * MODULE GUARD
 * 
 * Security layer that ensures organizations have the required modules
 * active before accessing protected resources.
 * 
 * Usage in API routes:
 *   await requireModule('module_invoicing')
 * 
 * Usage in Server Components:
 *   await requireModule('module_briefings')
 */

import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getOrganizationActiveModules } from "@/modules/core/saas/module-management-actions"
import { redirect } from "next/navigation"

// ============================================
// ERROR CLASSES
// ============================================

export class ModuleNotActiveError extends Error {
    public readonly moduleKey: string
    public readonly statusCode = 403

    constructor(moduleKey: string) {
        super(`Module '${moduleKey}' is not active for this organization`)
        this.name = 'ModuleNotActiveError'
        this.moduleKey = moduleKey
    }
}

export class OrganizationNotFoundError extends Error {
    public readonly statusCode = 401

    constructor() {
        super('No organization context found')
        this.name = 'OrganizationNotFoundError'
    }
}

// ============================================
// CORE GUARD FUNCTIONS
// ============================================

/**
 * Require a module to be active for the current organization.
 * Throws ModuleNotActiveError if not active.
 * 
 * @param moduleKey - The module key to check (e.g., 'module_invoicing')
 * @throws ModuleNotActiveError if module is not active
 * @throws OrganizationNotFoundError if no organization context
 */
export async function requireModule(moduleKey: string): Promise<void> {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new OrganizationNotFoundError()
    }

    const activeModules = await getOrganizationActiveModules(orgId)

    if (!activeModules.includes(moduleKey)) {
        throw new ModuleNotActiveError(moduleKey)
    }
}

/**
 * Require multiple modules to be active.
 * Throws on first missing module.
 * 
 * @param moduleKeys - Array of module keys to check
 */
export async function requireModules(moduleKeys: string[]): Promise<void> {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new OrganizationNotFoundError()
    }

    const activeModules = await getOrganizationActiveModules(orgId)

    for (const key of moduleKeys) {
        if (!activeModules.includes(key)) {
            throw new ModuleNotActiveError(key)
        }
    }
}

/**
 * Check if a module is active without throwing.
 * Useful for conditional rendering.
 * 
 * @param moduleKey - The module key to check
 * @returns true if active, false otherwise
 */
export async function hasModuleAccess(moduleKey: string): Promise<boolean> {
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return false

        const activeModules = await getOrganizationActiveModules(orgId)
        return activeModules.includes(moduleKey)
    } catch {
        return false
    }
}

/**
 * Require module or redirect to dashboard.
 * Use in Server Components that should gracefully redirect.
 * 
 * @param moduleKey - The module key to check
 * @param redirectTo - Where to redirect if module not active (default: /dashboard)
 */
export async function requireModuleOrRedirect(
    moduleKey: string,
    redirectTo: string = '/dashboard'
): Promise<void> {
    const hasAccess = await hasModuleAccess(moduleKey)

    if (!hasAccess) {
        redirect(redirectTo)
    }
}

// ============================================
// MODULE KEY CONSTANTS
// ============================================

/**
 * Standard module keys for type-safety.
 * These should match the keys in system_modules table.
 */
export const MODULES = {
    // Core (always active)
    DASHBOARD: 'dashboard',
    SETTINGS: 'core_settings',
    CLIENTS: 'core_clients',
    INTEGRATIONS: 'core_integrations',

    // CRM
    CRM_INBOX: 'crm_inbox',
    CRM_PIPELINE: 'crm_pipeline',
    CRM_CONTACTS: 'crm_clients',
    CRM_MARKETING: 'crm_broadcasts',
    CRM_AUTOMATIONS: 'crm_automations',
    CRM_REPORTS: 'crm_reports',

    // Operations
    QUOTES: 'module_quotes',
    BRIEFINGS: 'module_briefings',
    CATALOG: 'module_catalog',
    CONTRACTS: 'module_contracts',
    HOSTING: 'module_hosting',

    // Finance
    INVOICING: 'module_invoicing',
    PAYMENTS: 'module_payments',

    // AI & Premium
    AI_AGENT: 'module_ai',
    MARKETING: 'module_marketing',
} as const

export type ModuleKey = typeof MODULES[keyof typeof MODULES]
