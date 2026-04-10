import { redirect } from "next/navigation"
import { hasModuleAccess, ModuleKey } from "./module-guard"

/**
 * WITH MODULE GUARD
 * 
 * Higher-Order Component for protecting Server Components
 * based on module activation status.
 * 
 * Usage:
 *   // In your page.tsx
 *   export default withModuleGuard('module_briefings')(BriefingsPage)
 * 
 *   // Or with custom redirect:
 *   export default withModuleGuard('module_invoicing', '/dashboard')(InvoicesPage)
 */

interface WithModuleGuardOptions {
    redirectTo?: string
    fallback?: React.ReactNode
}

/**
 * HOC that wraps a Server Component with module access check.
 * Redirects to dashboard if module is not active.
 * 
 * @param moduleKey - The module key to require
 * @param options - Optional configuration
 */
export function withModuleGuard<P extends object>(
    moduleKey: ModuleKey | string,
    options: WithModuleGuardOptions = {}
) {
    const { redirectTo = '/dashboard', fallback } = options

    return function guardFactory(
        WrappedComponent: React.ComponentType<P>
    ): React.FC<P> {
        // Return an async Server Component
        return async function GuardedComponent(props: P) {
            const hasAccess = await hasModuleAccess(moduleKey)

            if (!hasAccess) {
                if (fallback) {
                    return <>{fallback}</>
                }
                redirect(redirectTo)
            }

            // @ts-ignore - Server Component typing
            return <WrappedComponent {...props} />
        }
    }
}

/**
 * Alternative: Inline guard for use directly in pages
 * 
 * Usage in page.tsx:
 *   export default async function BriefingsPage() {
 *       await guardModule('module_briefings')
 *       return <BriefingsContent />
 *   }
 */
export async function guardModule(
    moduleKey: ModuleKey | string,
    redirectTo: string = '/dashboard'
): Promise<void> {
    const hasAccess = await hasModuleAccess(moduleKey)

    if (!hasAccess) {
        redirect(redirectTo)
    }
}
