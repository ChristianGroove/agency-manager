'use client'

import { useEffect, useState, useCallback } from 'react'
import { getActiveModules } from '@/modules/core/saas/actions'

interface UseActiveModulesReturn {
    modules: string[]
    isLoading: boolean
    error: Error | null
    hasModule: (moduleKey: string) => boolean
    refresh: () => Promise<void>
}

/**
 * Client hook to fetch and cache active modules for current organization
 * Automatically refetches when organization context changes
 */
export function useActiveModules(): UseActiveModulesReturn {
    const [modules, setModules] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchModules = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const activeModules = await getActiveModules()
            setModules(activeModules)
        } catch (err) {
            console.error('Error fetching modules:', err)
            setError(err as Error)
            // Fallback to core modules
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
        refresh
    }
}
