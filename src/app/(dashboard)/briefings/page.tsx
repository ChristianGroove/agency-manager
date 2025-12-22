import { getBriefings } from "@/lib/actions/briefings"
import { BriefingsPageHeader } from "@/components/modules/briefings/briefings-page-header"
import { DynamicBriefingList } from "@/components/modules/briefings/dynamic-briefing-list"

export default async function BriefingsPage() {
    const briefings = await getBriefings()

    return (
        <div className="space-y-8">
            <BriefingsPageHeader />

            <DynamicBriefingList briefings={briefings || []} />
        </div>
    )
}

