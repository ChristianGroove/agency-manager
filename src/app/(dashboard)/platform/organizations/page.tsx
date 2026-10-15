import { parseTablePage, parseTablePageSize } from "@/components/ui/table-pagination"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getOrganizationsPaginated } from "@/modules/core/organizations/organization-actions"
import { OrganizationsClientView } from "./organizations-client-view"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = 'force-dynamic'

export default async function PlatformOrganizationsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string, pageSize?: string, search?: string, type?: string }>
}) {
    // Parse params
    const params = await searchParams
    const page = parseTablePage(params?.page)
    const limit = parseTablePageSize(params?.pageSize)
    const search = params?.search || ""
    const type = params?.type || 'all'

    // Fetch Data on Server
    const { data: orgs, count, error } = await getOrganizationsPaginated({
        page,
        limit,
        search,
        type
    })

    const lastPage = Math.max(1, Math.ceil((count || 0) / limit))
    if (!error && page > lastPage) {
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value)
        query.set("page", String(lastPage))
        redirect("/platform/organizations?" + query.toString())
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Error cargando organizaciones: {error}
            </div>
        )
    }

    return (
        <Suspense fallback={<OrganizationsLoadingSkeleton />}>
            <OrganizationsClientView
                data={orgs || []}
                count={count || 0}
                page={page}
                limit={limit}
                searchParams={{ search, type }}
            />
        </Suspense>
    )
}

function OrganizationsLoadingSkeleton() {
    return (
        <div className="space-y-6 p-8">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-12 w-full" />
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        </div>
    )
}

