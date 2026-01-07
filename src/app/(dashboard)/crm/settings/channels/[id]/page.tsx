import { Suspense } from "react"
import { getChannel } from "@/modules/core/channels/actions"
import { getPipelineStages } from "@/modules/core/crm/pipeline-actions"
import { ChannelDetail } from "@/modules/core/channels/components/channel-detail"
import { notFound } from "next/navigation"

import { getChannelAssignmentRule } from "@/modules/core/messaging/assignment-actions"
import { getOrganizationMembers } from "@/modules/core/settings/actions/team-actions"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ChannelDetailPage({ params }: PageProps) {
    const { id } = await params

    // Parallel fetch for specific channel data
    const [channel, pipelineStages, assignmentRule, members] = await Promise.all([
        getChannel(id),
        getPipelineStages(),
        getChannelAssignmentRule(id),
        getOrganizationMembers()
    ])

    if (!channel) {
        notFound()
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChannelDetail
                channel={channel}
                pipelineStages={pipelineStages}
                initialRule={assignmentRule}
                agents={members}
            />
        </Suspense>
    )
}
