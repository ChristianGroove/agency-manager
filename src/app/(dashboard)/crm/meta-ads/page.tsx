import { MetaAdsCenter } from "@/modules/features/marketing/components/meta-ads-center"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Meta Ads Monitor | Pixy",
    description: "Monitorea el rendimiento de tus anuncios de Meta y leads en tiempo real."
}

export default async function MetaAdsPage() {
    if (!await hasPermission(PERMISSIONS.MARKETING.MANAGE_ADS)) {
        redirect("/dashboard?error=unauthorized")
    }

    return <MetaAdsCenter />
}
