import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getAttendanceLogs, getStaff } from "@/modules/core/attendance/actions"
import { getLocations } from "@/modules/core/locations/actions"
import { AttendanceDashboard } from "@/modules/core/attendance/components/admin/attendance-dashboard"
import { GlobalLoader } from "@/components/ui/global-loader"

export const metadata: Metadata = {
    title: "Control de Asistencia | Pixy",
    description: "Gestión y auditoría de asistencia de colaboradores.",
}

export default async function AttendanceAdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const orgId = await getCurrentOrganizationId()
    if (!orgId) redirect("/setup/wizard")

    // Parallel fetch for speed
    const [logsRes, staffRes, locationsRes] = await Promise.all([
        getAttendanceLogs(orgId),
        getStaff(),
        getLocations()
    ])

    return (
        <Suspense fallback={<GlobalLoader />}>
            <div className="flex-1">
                <AttendanceDashboard
                    logs={logsRes.data || []}
                    staff={staffRes.data || []}
                    locations={locationsRes.data || []}
                />
            </div>
        </Suspense>
    )
}

