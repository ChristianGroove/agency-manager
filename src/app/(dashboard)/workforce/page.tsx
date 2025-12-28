import { getCurrentOrganizationId } from "@/lib/actions/organizations"
import { getStaffProfiles } from "@/app/actions/workforce-actions"
import { StaffList } from "./_components/staff-list"
import { requireModule } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Gestión de Personal | Field Services",
    description: "Administra tu fuerza laboral y tarifas",
}

export default async function WorkforcePage() {
    const orgId = await getCurrentOrganizationId()

    // Safety check - though middleware should handle this, good practice
    if (!orgId) {
        redirect("/dashboard")
    }

    // Optional: Check permissions or module activation here if strict enforcement needed
    // await requireModule("module_workforce")

    const profiles = await getStaffProfiles(orgId)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Fuerza Laboral</h2>
            </div>

            <StaffList profiles={profiles} orgId={orgId} />
        </div>
    )
}
