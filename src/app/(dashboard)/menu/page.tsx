import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getMenuItems, getMenuCategories } from "@/modules/features/menu/actions"
import { getModifierGroups } from "@/modules/features/menu/modifiers-actions"
import { getPortalThemeConfig } from "@/modules/features/menu/actions/theme-actions"
import { MenuSheetTrigger } from "@/modules/features/menu/components/menu-sheet-trigger"
import { MenuWorkspace } from "@/modules/features/menu/components/menu-workspace"
import { getSidebarContext } from "@/modules/core/saas/saas-actions"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { SectionHeader } from "@/components/layout/section-header"
import { Plus, UtensilsCrossed } from "lucide-react"
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

    // IAM V2: Granular permission check (supports custom roles)
    const canView = await hasPermission(PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW)
    if (!canView) {
        redirect('/dashboard?error=unauthorized_role')
    }

    const [items, categories, modifierGroups, themeConfig] = await Promise.all([
        getMenuItems(),
        getMenuCategories(),
        getModifierGroups(),
        getPortalThemeConfig()
    ])

    return (
        <div className="w-full h-full flex flex-col space-y-6 min-h-screen pb-20">
            {/* Standardized Section Header */}
            <SectionHeader
                title="Menú de Restaurante"
                subtitle="Gestiona tu oferta gastronómica, categorías y modificadores de forma rápida."
                icon={UtensilsCrossed}
                action={
                    <MenuSheetTrigger orgId={orgId}>
                        <button className="bg-brand-pink hover:bg-brand-pink/90 text-white font-semibold text-xs rounded-xl h-10 px-4 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                            <Plus className="h-4 w-4" />
                            Nuevo Plato
                        </button>
                    </MenuSheetTrigger>
                }
            />

            {/* Content Split */}
            <MenuWorkspace 
                items={items} 
                categories={categories} 
                modifierGroups={modifierGroups} 
                initialThemeConfig={themeConfig}
                orgId={orgId} 
            />
        </div>
    )
}
