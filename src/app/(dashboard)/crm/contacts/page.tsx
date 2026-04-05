import { getClientsAction, getSettingsAction, getCategoriesAction } from "@/modules/features/crm/crm-actions"
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers"
import ClientsView from "@/modules/features/crm/components/clients-view"
import { Suspense } from "react"
import { VerticalType } from "@/modules/core/organizations/vertical-registry"

export const metadata = {
    title: "Contactos | CRM",
    description: "Gestión de cartera de clientes",
}

export default async function CRMContactsPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
    const search = typeof searchParams.search === 'string' ? searchParams.search : ''
    const filter = typeof searchParams.filter === 'string' ? searchParams.filter : 'all'

    // Use unified CRM Actions
    const [clientsRes, settingsRes, spaceType, categoriesRes] = await Promise.all([
        getClientsAction({ page, search, filter }),
        getSettingsAction(),
        getOrgSpaceCategory(),
        getCategoriesAction()
    ])

    const paginatedData = clientsRes.success ? clientsRes.data : { results: [], count: 0 }
    const settings = settingsRes.success ? settingsRes.data : null
    const allCategories = categoriesRes.success ? (categoriesRes.data || []) : []

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando contactos...</div>}>
            <ClientsView
                initialData={paginatedData}
                initialSettings={settings}
                allCategories={allCategories}
                currentPage={page}
                searchQuery={search}
                filter={filter}
                spaceType={spaceType as VerticalType}
            />
        </Suspense>
    )
}
