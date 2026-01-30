'use client'

import { useEffect, useState, useCallback } from 'react'
import { getActiveModules } from '@/modules/core/saas/actions'
import { getCurrentUserPermissions } from '@/modules/core/settings/actions/team-actions'

interface UseActiveModulesReturn {
    modules: string[]
    isLoading: boolean
    error: Error | null
    hasModule: (moduleKey: string) => boolean
    refresh: () => Promise<void>
    userRole: string | null
    organizationType?: 'platform' | 'reseller' | 'client'
    vertical?: string
}

// Map between module_config keys and permission module keys
// IMPORTANT: All org modules must be mapped here to enable permission filtering
const MODULE_PERMISSION_MAP: Record<string, string> = {
    // Core modules (typically always allowed, but can be restricted)
    'core_clients': 'crm',          // Core clients maps to CRM permission
    'core_settings': 'settings',    // Settings access

    // Standard modules
    'module_crm': 'crm',
    'module_invoicing': 'invoicing',
    'module_projects': 'projects',
    'module_support': 'support',
    'module_communications': 'communications',
    'module_payments': 'payments',
    'module_reports': 'reports',

    // Agency vertical modules
    'module_briefings': 'projects',       // Briefings are part of projects
    'module_catalog': 'crm',              // Catalog is client-facing (CRM)
    'module_messaging': 'communications', // Messaging is communications
    'module_whitelabel': 'settings',      // Whitelabel is settings/branding
    'module_contracts': 'invoicing',      // Contracts relate to invoicing
    'module_hosting': 'projects',         // Hosting relates to projects
    'module_automation': 'communications', // Automation is communications

    // Cleaning vertical modules
    'module_appointments': 'appointments',
    'module_staff': 'staff',
    'module_payroll': 'payroll',
}

/**
 * Client hook to fetch and cache active modules for current organization
 * Also checks user's module permissions and filters accordingly
 */
export function useActiveModules(): UseActiveModulesReturn {
    const [modules, setModules] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [organizationType, setOrganizationType] = useState<'platform' | 'reseller' | 'client'>('client')
    const [vertical, setVertical] = useState<string | undefined>()

    const fetchModules = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Fetch org modules, user permissions, AND org details in parallel
            // We import getCurrentOrgDetails dynamically to avoid cycles if any
            const { getCurrentOrgDetails } = await import('@/modules/core/organizations/actions')

            const [orgModules, userPerms, orgDetails] = await Promise.all([
                getActiveModules(),
                getCurrentUserPermissions(),
                getCurrentOrgDetails()
            ])

            setUserRole(userPerms?.role || null)
            if (orgDetails?.organization_type) {
                setOrganizationType(orgDetails.organization_type as any)
            }
            if (orgDetails?.vertical_key) {
                setVertical(orgDetails.vertical_key)
            }

            // If user has permissions, filter org modules by their access
            if (userPerms?.permissions?.modules) {
                const filteredModules = orgModules.filter(orgModule => {
                    const permKey = MODULE_PERMISSION_MAP[orgModule]
                    if (!permKey) return true
                    const modules = userPerms.permissions.modules as Record<string, boolean> | undefined
                    const hasAccess = modules?.[permKey]
                    return hasAccess !== false
                })
                setModules(filteredModules)
            } else {
                setModules(orgModules)
            }
        } catch (err) {
            console.error('Error fetching modules:', err)
            setError(err as Error)
            setModules(['core_clients', 'core_settings'])
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchModules()

        // Listen for organization changes via cookie
        const checkOrgChange = () => {
            const cookies = document.cookie.split(';')
            const orgCookie = cookies.find(c => c.trim().startsWith('pixy_org_id='))
            return orgCookie?.split('=')[1] || null
        }

        let lastOrgId = checkOrgChange()

        const interval = setInterval(() => {
            const currentOrgId = checkOrgChange()
            if (currentOrgId !== lastOrgId) {
                lastOrgId = currentOrgId
                fetchModules()
            }
        }, 1000) // Check every second

        return () => clearInterval(interval)
    }, [fetchModules])

    const hasModule = useCallback((moduleKey: string): boolean => {
        return modules.includes(moduleKey)
    }, [modules])

    const refresh = useCallback(async () => {
        await fetchModules()
    }, [fetchModules])

    return {
        modules,
        isLoading,
        error,
        hasModule,
        refresh,
        userRole,
        organizationType,
        vertical
    }
}
