import { Suspense } from "react"
import { getChannels } from "@/modules/core/channels/actions"
import { ChannelsList } from "@/modules/core/channels/components/channels-list"
import { getDictionary } from "@/lib/i18n/get-dictionary"

export async function generateMetadata() {
    const dict = await getDictionary()
    return {
        title: dict.crm.meta.channels_title,
        description: dict.crm.meta.channels_desc,
    }
}

import { getPipelineStages } from "@/modules/core/crm/pipeline-actions"
import { getOrganizationMembers } from "@/modules/core/settings/actions/team-actions"

export default async function ChannelsPage() {
    const [channels, pipelineStages, agents] = await Promise.all([
        getChannels(),
        getPipelineStages(),
        getOrganizationMembers()
    ])

    return (
        <Suspense fallback={<div>Loading channels...</div>}>
            <ChannelsList channels={channels} pipelineStages={pipelineStages} agents={agents} />
        </Suspense>
    )
}
