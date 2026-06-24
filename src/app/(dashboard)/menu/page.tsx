import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getMenuItems, getMenuCategories } from "@/modules/features/menu/actions"
import { getModifierGroups } from "@/modules/features/menu/modifiers-actions"
import { MenuSheetTrigger } from "@/modules/features/menu/components/menu-sheet-trigger"
import { MenuWorkspace } from "@/modules/features/menu/components/menu-workspace"
import { getSidebarContext } from "@/modules/core/saas/saas-actions"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"

export default async function MenuPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return <div>Unauthorized</div>

    const { modules: activeModules, organizationType, userRole, capabilities } = await getSidebarContext(orgId)
    
    const normalizedRole = userRole?.toLowerCase()
    const isOwner = normalizedRole === 'owner' || normalizedRole === 'dueño' || capabilities?.all === true
    const isOwnerBypass = isOwner && organizationType === 'platform'

    if (!activeModules.includes('module_resto_menu') && !isOwnerBypass) {
        redirect('/dashboard?error=unauthorized_module')
    }

    const [items, categories, modifierGroups] = await Promise.all([
        getMenuItems(),
        getMenuCategories(),
        getModifierGroups()
    ])

    return (
        <div className="w-full h-full flex flex-col space-y-6 min-h-screen pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Menú de Restaurante</h1>
                    <p className="text-gray-500 mt-1">Gestiona tu oferta gastronómica, categorías y modificadores de forma rápida.</p>
                </div>
                
                <MenuSheetTrigger orgId={orgId}>
                    <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap">
                        <Plus className="w-5 h-5" />
                        Nuevo Plato
                    </button>
                </MenuSheetTrigger>
            </div>

            {/* Content Split */}
            <MenuWorkspace items={items} categories={categories} modifierGroups={modifierGroups} orgId={orgId} />
        </div>
    )
}
