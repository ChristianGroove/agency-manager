import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getLocations, getStaffTrackers } from "@/modules/features/locations/actions"
import { getStaff } from "@/modules/features/attendance/actions"
import { LocationsView } from "@/modules/features/locations/components/locations-view"
import { GlobalLoader } from "@/components/ui/global-loader"

export const metadata: Metadata = {
    title: "Gestión de Sedes | Pixy",
    description: "Administra las sedes, sucursales y puntos de atención de tu negocio.",
}

export default async function LocationsAdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const orgId = await getCurrentOrganizationId()
    if (!orgId) redirect("/setup/wizard")

    // Parallel fetch for locations, staff and live trackers
    const [
        { data: locations },
        { data: staff },
        { data: trackers }
    ] = await Promise.all([
        getLocations(),
        getStaff(),
        getStaffTrackers()
    ])

    return (
        <Suspense fallback={<GlobalLoader />}>
            <div className="flex-1">
                <LocationsView
                    initialLocations={locations || []}
                    staffList={staff || []}
                    initialTrackers={trackers || []}
                />
            </div>
        </Suspense>
    )
}

