import { parseTablePage, parseTablePageSize } from "@/components/ui/table-pagination"
import { redirect } from "next/navigation"
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
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const page = parseTablePage(params.page)
    const pageSize = parseTablePageSize(params.pageSize)
    const search = typeof params.search === 'string' ? params.search : ''
    const filter = typeof params.filter === 'string' ? params.filter : 'all'

    // Use unified CRM Actions
    const [clientsRes, settingsRes, spaceType, categoriesRes] = await Promise.all([
        getClientsAction({ page, pageSize, search, filter }),
        getSettingsAction(),
        getOrgSpaceCategory(),
        getCategoriesAction()
    ])

    const paginatedData = clientsRes.success ? clientsRes.data : { results: [], count: 0 }
    const settings = settingsRes.success ? settingsRes.data : null
    const lastPage = Math.max(1, Math.ceil((paginatedData?.totalCount || 0) / pageSize))
    if (page > lastPage) {
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === "string") query.set(key, value)
            else if (Array.isArray(value)) value.forEach(item => query.append(key, item))
        }
        query.set("page", String(lastPage))
        redirect("/crm/contacts?" + query.toString())
    }

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
