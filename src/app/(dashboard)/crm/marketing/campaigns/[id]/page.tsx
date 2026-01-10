import { CampaignBuilder } from "@/modules/core/broadcasts/components/campaign-builder"
import { createClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"

export default async function CampaignBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Validate campaign exists and get name
    const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('name')
        .eq('id', id)
        .single()

    if (!campaign) {
        notFound()
    }

    return (
        <CampaignBuilder campaignId={id} campaignName={campaign.name} />
    )
}
