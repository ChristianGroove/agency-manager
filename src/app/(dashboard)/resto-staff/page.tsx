import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getZonesAndTables } from "@/modules/features/resto/tables/actions"
import { RestoStaffPageContainer } from "@/modules/features/resto-orders/components/resto-staff-page-container"
import { GlobalLoader } from "@/components/ui/global-loader"

export const metadata: Metadata = {
    title: "Meseros | Pixy",
    description: "Gestión de equipo de meseros, asignación de zonas y enlaces de acceso a portales.",
}

export default async function RestoStaffPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const orgId = await getCurrentOrganizationId()
    if (!orgId) redirect("/setup/wizard")

    const { zones } = await getZonesAndTables(orgId)

    return (
        <Suspense fallback={<GlobalLoader />}>
            <RestoStaffPageContainer orgId={orgId} zones={zones || []} />
        </Suspense>
    )
}
