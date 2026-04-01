import { SupabaseClient } from '@supabase/supabase-js'

export class PipelineRepository {
    constructor(private supabase: SupabaseClient) {}

    async getStages(orgId: string, onlyActive: boolean = true): Promise<any[]> {
        let query = this.supabase
            .from('pipeline_stages')
            .select('*')
            .eq('organization_id', orgId)

        if (onlyActive) {
            query = query.eq('is_active', true)
        }

        const { data, error } = await query.order('display_order', { ascending: true })
        if (error) throw error
        return data || []
    }

    async getDefaultPipeline(orgId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('pipelines')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_default', true)
            .maybeSingle()

        if (error) throw error
        return data
    }

    async insertStage(payload: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('pipeline_stages')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updateStage(stageId: string, orgId: string, updates: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('pipeline_stages')
            .update(updates)
            .eq('id', stageId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updatePipeline(pipelineId: string, orgId: string, updates: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('pipelines')
            .update(updates)
            .eq('id', pipelineId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async bulkUpdateStageOrder(stageIds: string[], orgId: string): Promise<void> {
        const updates = stageIds.map((stageId, index) =>
            this.supabase
                .from('pipeline_stages')
                .update({ display_order: index + 1 })
                .eq('id', stageId)
                .eq('organization_id', orgId)
        )

        const results = await Promise.all(updates)
        const errors = results.filter(r => r.error).map(r => r.error)
        if (errors.length > 0) throw new Error("Bulk update failed")
    }
}
