import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getAttendanceLogs, getStaff, getAttendanceShifts } from "@/modules/features/attendance/actions"
import { getLocations } from "@/modules/features/locations/actions"
import { AttendanceDashboard } from "@/modules/features/attendance/components/admin/attendance-dashboard"
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
    const [logsRes, staffRes, locationsRes, shiftsRes] = await Promise.all([
        getAttendanceLogs(orgId),
        getStaff(),
        getLocations(),
        getAttendanceShifts(orgId)
    ])

    return (
        <Suspense fallback={<GlobalLoader />}>
            <div className="flex-1">
                <AttendanceDashboard
                    logs={logsRes.data || []}
                    staff={staffRes.data || []}
                    locations={locationsRes.data || []}
                    shifts={shiftsRes.data || []}
                />
            </div>
        </Suspense>
    )
}


