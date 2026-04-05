import { SupabaseClient } from '@supabase/supabase-js'
import { PipelineRepository } from '../repositories/pipeline.repository'
import { unstable_cache } from 'next/cache'

export class PipelineService {
    private repo: PipelineRepository

    constructor(private supabase: SupabaseClient, private orgId: string) {
        this.repo = new PipelineRepository(supabase)
    }

    async getStages(): Promise<any[]> {
        return this.repo.getStages(this.orgId)
    }

    async getCachedStages(): Promise<any[]> {
        // Use unstable_cache for high-performance frontend data
        return unstable_cache(
            async () => this.repo.getStages(this.orgId),
            ['pipeline-stages', this.orgId],
            { revalidate: 3600 }
        )()
    }

    async createStage(input: any): Promise<any> {
        // Find default pipeline if not provided
        let pipelineId = input.pipeline_id
        if (!pipelineId) {
            const pipeline = await this.repo.getDefaultPipeline(this.orgId)
            pipelineId = pipeline?.id
        }

        return this.repo.insertStage({
            organization_id: this.orgId,
            pipeline_id: pipelineId,
            ...input
        })
    }

    async updateStage(stageId: string, updates: any): Promise<any> {
        return this.repo.updateStage(stageId, this.orgId, updates)
    }

    async deleteStage(stageId: string): Promise<void> {
        // Soft delete
        await this.repo.updateStage(stageId, this.orgId, { is_active: false })
    }

    async reorderStages(stageIds: string[]): Promise<void> {
        await this.repo.bulkUpdateStageOrder(stageIds, this.orgId)
    }

    async getDefaultPipeline(): Promise<any> {
        return this.repo.getDefaultPipeline(this.orgId)
    }

    async toggleStrictMode(pipelineId: string, enabled: boolean): Promise<any> {
        return this.repo.updatePipeline(pipelineId, this.orgId, { process_enabled: enabled })
    }

    async getPipelineViewData(connectionId?: string | null, userId?: string): Promise<any> {
        // Aggregated data for Kanban
        const { getLeads } = await import('../leads-actions')
        const { getEmitters } = await import('@/modules/core/settings/emitters-actions')
        const { getLeadsCount } = await import('../lead-management-actions')
        const { getCurrentUserPermissions } = await import('@/modules/core/settings/actions/team-actions')

        const perms = await getCurrentUserPermissions()
        let allowedChannels: string[] | undefined = undefined
        const role = perms?.role?.toLowerCase()
        const isGlobalRole = role === 'owner' || role === 'dueño' || role === 'admin' || role === 'administrador'
        const hasGlobalView = isGlobalRole || perms?.permissions?.all === true || 
                             perms?.permissions?.['inbox.conversations.view_all'] === true

        if (!hasGlobalView) {
            allowedChannels = perms?.permissions?.inbox_access || []
        }

        const [stages, leadsResponse, emitters] = await Promise.all([
            this.getCachedStages(),
            getLeads(100, connectionId, allowedChannels, userId),
            getEmitters()
        ])

        return {
            stages,
            leads: Array.isArray(leadsResponse.leads) ? [...leadsResponse.leads] : [],
            emitters: emitters || [],
            totalCount: leadsResponse.totalCount || 0
        }
    }
}
