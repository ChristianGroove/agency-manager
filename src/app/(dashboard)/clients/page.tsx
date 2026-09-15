import { getPaginatedClients } from "@/modules/features/crm/services/logic/actions"
import { getSettings } from "@/modules/core/settings/actions/crud"
import { getClientCategories } from "@/modules/features/crm/services/logic/categories-actions"
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers"
import ClientsView from "@/modules/features/crm/components/clients-view"
import { GrowthEcosystemShell } from "@/modules/core/layout/growth-ecosystem-shell"
import { Suspense } from "react"

export const metadata = {
    title: "Clientes",
    description: "Gestión de cartera de clientes",
}

export default async function ClientsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams
    const page = typeof resolvedParams?.page === 'string' ? parseInt(resolvedParams.page) : 1
    const search = typeof resolvedParams?.search === 'string' ? resolvedParams.search : ''
    const filter = typeof resolvedParams?.filter === 'string' ? resolvedParams.filter : 'all'

    // Parallel data fetching for maximum performance
    const [paginatedData, settings, categoriesRes, spaceType] = await Promise.all([
        getPaginatedClients(page, 50, search, filter),
        getSettings(),
        getClientCategories(),
        getOrgSpaceCategory()
    ])

    const allCategories = categoriesRes.success ? (categoriesRes.data || []) : []

    return (
        <GrowthEcosystemShell>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando clientes...</div>}>
                <ClientsView
                    initialData={paginatedData}
                    initialSettings={settings}
                    allCategories={allCategories}
                    currentPage={page}
                    searchQuery={search}
                    filter={filter}
                    spaceType={spaceType}
                />
            </Suspense>
        </GrowthEcosystemShell>
    )
}
