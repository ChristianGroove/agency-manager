import { MarketingDashboard } from "@/modules/features/broadcasts/components/marketing-dashboard"
import { getCampaign } from "@/modules/features/broadcasts/marketing-actions"
import { notFound } from "next/navigation"

export default async function CampaignBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getCampaign(id)
    const campaign = result.success ? result.campaign : null

    if (!campaign) {
        notFound()
    }

    return (
        <MarketingDashboard initialCampaign={{ id, name: campaign.name }} />
    )
}
