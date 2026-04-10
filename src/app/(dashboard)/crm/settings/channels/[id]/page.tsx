import { Suspense } from "react"
import { getChannel } from "@/modules/features/channels/actions"
import { getPipelineStages } from "@/modules/features/crm/services/logic/pipeline-actions"
import { ChannelDetail } from "@/modules/features/channels/components/channel-detail"
import { notFound } from "next/navigation"

import { getChannelAssignmentRule } from "@/modules/features/messaging/assignment-actions"
import { getOrganizationMembers } from "@/modules/core/settings/actions/team"

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
