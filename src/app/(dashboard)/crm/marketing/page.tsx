import { MarketingDashboard } from "@/modules/features/broadcasts/components/marketing-dashboard"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"

export default async function MarketingPage() {
    if (!await hasPermission(PERMISSIONS.MARKETING.VIEW)) {
        redirect("/dashboard?error=unauthorized")
    }

    return (
        <MarketingDashboard />
    )
}
