import { getPaginatedClients } from "@/modules/core/clients/actions"
import { getSettings } from "@/modules/core/settings/actions"
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers"
import { ClientsView } from "@/modules/core/clients/components/clients-view"
import { Suspense } from "react"

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

    const [paginatedData, settings, spaceType] = await Promise.all([
        getPaginatedClients(page, 50, search, filter),
        getSettings(),
        getOrgSpaceCategory()
    ])

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando contactos...</div>}>
            <ClientsView
                initialData={paginatedData}
                initialSettings={settings}
                currentPage={page}
                currentSearch={search}
                currentFilter={filter}
                spaceType={spaceType}
            />
        </Suspense>
    )
}
