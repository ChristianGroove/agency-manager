'use client'

import { ReactNode } from 'react'
import { useActiveModules } from '@/hooks/use-active-modules'

interface ModuleGuardProps {
    /**
     * The module key to check access for
     * e.g., 'module_invoicing', 'core_clients'
     */
    module: string

    /**
     * Content to render if user has access to the module
     */
    children: ReactNode

    /**
     * Optional fallback content to render if access is denied
     * If not provided, nothing is rendered
     */
    fallback?: ReactNode

    /**
     * If true, shows loading state while checking access
     * Default: false (renders children immediately, hides if no access)
     */
    showLoadingState?: boolean
}

/**
 * Guard component that conditionally renders content based on module access
 * 
 * Usage:
 * ```tsx
 * <ModuleGuard module="module_invoicing">
 *   <InvoiceWidget />
 * </ModuleGuard>
 * 
 * <ModuleGuard module="module_briefings" fallback={<UpgradePrompt />}>
 *   <BriefingList />
 * </ModuleGuard>
 * ```
 */
export function ModuleGuard({
    module,
    children,
    fallback = null,
    showLoadingState = false
}: ModuleGuardProps) {
    const { hasModule, isLoading } = useActiveModules()

    // Show loading state if requested
    if (isLoading && showLoadingState) {
        return <div className="animate-pulse bg-gray-100 rounded-lg h-20" />
    }

    // Check access
    const hasAccess = hasModule(module)

    if (!hasAccess) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

/**
 * Utility component for module-specific routes
 * Redirects to dashboard if no access
 */
export function ModuleRoute({
    module,
    children
}: {
    module: string
    children: ReactNode
}) {
    const { hasModule, isLoading } = useActiveModules()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-cyan" />
            </div>
        )
    }

    if (!hasModule(module)) {
        // Could redirect to upgrade page or dashboard
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Módulo No Disponible
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Este módulo no está incluido en tu plan actual.
                    </p>
                    <a
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-brand-cyan text-white rounded-lg hover:bg-brand-cyan/90 transition-colors"
                    >
                        Volver al Dashboard
                    </a>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
