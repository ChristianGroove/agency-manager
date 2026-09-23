import { Suspense } from "react"
import { getChannels } from "@/modules/features/channels/actions"
import { ChannelsList } from "@/modules/features/channels/components/channels-list"
import { getDictionary } from "@/modules/core/i18n/get-dictionary"

export async function generateMetadata() {
    const dict = await getDictionary()
    return {
        title: dict.crm.meta.channels_title,
        description: dict.crm.meta.channels_desc,
    }
}

import { getPipelineStages } from "@/modules/features/crm/services/logic/pipeline-actions"
import { getOrganizationMembers } from "@/modules/core/settings/actions/team"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getActiveModules } from "@/modules/core/saas/saas-actions"
import { hasRole } from '@/modules/core/iam/services/org-roles'

export default async function ChannelsPage() {
    const organizationId = await getCurrentOrganizationId()
    
    const [channels, pipelineStages, agents, activeModules, canManageChannels] = await Promise.all([
        getChannels(),
        getPipelineStages(),
        getOrganizationMembers(),
        getActiveModules(organizationId || undefined),
        hasRole('admin')
    ])

    const isMetaAdsEnabled = activeModules.includes('module_meta_ads')

    return (
        <Suspense fallback={<div>Loading channels...</div>}>
            <ChannelsList
                channels={channels}
                pipelineStages={pipelineStages}
                agents={agents}
                organizationId={organizationId}
                isMetaAdsEnabled={isMetaAdsEnabled}
                canManageChannels={canManageChannels}
            />
        </Suspense>
    )
}

