import { getCurrentOrganizationId, getOrganizationModules } from "@/lib/actions/organizations"
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
