import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getOrganizationModules } from "@/modules/core/organizations/actions"
import { redirect } from "next/navigation"

export async function requireModule(moduleKey: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return redirect('/login') // Or some error page

    const modules = await getOrganizationModules(orgId)

    // Core modules always allowed (though this function is likely called for optional ones)
    if (modules.includes("all")) return true

    if (!modules.includes(moduleKey)) {
        redirect('/dashboard?error=module_restricted')
    }

    return true
}

/**
 * Check if the current organization has a specific feature/module enabled.
 * Returns boolean, does NOT redirect. Use for conditional UI rendering.
 */
export async function hasFeature(featureKey: string): Promise<boolean> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return false

    const modules = await getOrganizationModules(orgId)

    // Super-admin or "all" plan bypass
    if (modules.includes("all")) return true

    return modules.includes(featureKey)
}
