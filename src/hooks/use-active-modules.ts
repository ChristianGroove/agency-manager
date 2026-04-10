'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getActiveModules } from '@/modules/core/saas/saas-actions'
import { getCurrentUserPermissions } from '@/modules/core/settings/settings-actions'

interface UseActiveModulesReturn {
    modules: string[]
    isLoading: boolean
    error: Error | null
    hasModule: (moduleKey: string) => boolean
    refresh: () => Promise<void>
    userRole: string | null
    organizationType?: 'platform' | 'reseller' | 'client'
    vertical?: string
    capabilities: Record<string, boolean>
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
    const [capabilities, setCapabilities] = useState<Record<string, boolean>>({})

    // Use a ref to track the last fetched organization ID to avoid redundant fetches
    const lastOrgIdRef = React.useRef<string | null>(null)

    const fetchModules = useCallback(async () => {
        // Simple check: cookies are readable on client
        const cookies = document.cookie.split(';')
        const orgCookie = cookies.find(c => c.trim().startsWith('pixy_org_id='))
        const currentOrgId = orgCookie?.split('=')[1] || null

        // Deduplication: If we already fetched for this ID (and not explicitly refreshing), skip
        // BUT for initial load we might need to run even if ID is same if state is empty?
        // Actually the hook is mounted once per layout usually.
        // Let's rely on standard useEffect deps.

        setIsLoading(true)
        setError(null)

        try {
            // Import dynamically to ensure we get the server action
            const { getSidebarContext } = await import('@/modules/core/saas/saas-actions')

            // Single aggregated network call
            const data = await getSidebarContext()

            setUserRole(data.userRole)
            setOrganizationType(data.organizationType)
            setVertical(data.vertical)
            setCapabilities(data.capabilities)

            // Permissions filtering Logic
            const rawModules = data.modules
            const permissions = data.userPermissions as Record<string, any> | null
            
            // Merge IAM permissions into capabilities to support Sidebar checks (all: true, crm.leads.view, etc.)
            const mergedCapabilities = {
                ...data.capabilities,
                ...permissions
            }
            setCapabilities(mergedCapabilities)

            if (permissions?.all === true) {
                // Wildcard access: no filtering needed
                setModules(rawModules)
            } else if (permissions?.modules) {
                const filteredModules = rawModules.filter(orgModule => {
                    const permKey = MODULE_PERMISSION_MAP[orgModule]
                    if (!permKey) return true
                    const hasAccess = permissions.modules[permKey]
                    return hasAccess !== false
                })
                setModules(filteredModules)
            } else {
                setModules(rawModules)
            }

            // Update ref
            lastOrgIdRef.current = currentOrgId

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
        // Removed polling setInterval to improve performance
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
        vertical,
        capabilities
    }
}
