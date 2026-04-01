import { SupabaseClient } from '@supabase/supabase-js'
import { Lead } from '@/types'

export type CreateLeadRepositoryInput = {
    name: string
    company_name?: string
    email?: string
    phone?: string
    user_id?: string
    organization_id: string
    status?: string
    source?: string
}

export class LeadsRepository {
    constructor(private supabase: SupabaseClient) {}

    async create(input: CreateLeadRepositoryInput): Promise<Lead> {
        const { data, error } = await this.supabase
            .from('leads')
            .insert(input)
            .select()
            .single()

        if (error) throw error
        return data as Lead
    }

    async findById(id: string, organizationId?: string): Promise<Lead> {
        let query = this.supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            
        if (organizationId) {
            query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query.maybeSingle()
        if (error) throw error
        if (!data) throw new Error("Lead not found or access denied")
        return data as Lead
    }

    async update(id: string, updates: Record<string, any>, organizationId?: string): Promise<Lead> {
        let query = this.supabase
            .from('leads')
            .update(updates)
            .eq('id', id)
            
        if (organizationId) {
            query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query.select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error("Could not update lead")
        return data as Lead
    }

    async getPaginated(params: {
        orgId: string,
        page: number,
        pageSize: number,
        search: string,
        stageId: string,
        connectionId?: string,
        dateFrom?: string,
        dateTo?: string
    }): Promise<any> {
        const { data, error } = await this.supabase.rpc('get_paginated_leads', {
            p_org_id: params.orgId,
            p_search: params.search,
            p_stage_id: params.stageId,
            p_connection_id: params.connectionId,
            p_page: params.page,
            p_page_size: params.pageSize,
            p_date_from: params.dateFrom,
            p_date_to: params.dateTo
        })

        if (error) throw error
        return data
    }

    async getAllIdsForOrganization(orgId: string): Promise<string[]> {
        const { data, error } = await this.supabase
            .from('leads')
            .select('id')
            .eq('organization_id', orgId)

        if (error) throw error
        return (data || []).map(d => d.id)
    }

    async getExportData(orgId: string, limit: number = 10000): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('leads')
            .select('name, phone')
            .eq('organization_id', orgId)
            .order('name', { ascending: true })
            .limit(limit)

        if (error) throw error
        return data || []
    }

    async purgeInactive(orgId: string, thresholdIsoDate: string, minScore?: number): Promise<number> {
        let query = this.supabase
            .from('leads')
            .delete({ count: 'exact' })
            .eq('organization_id', orgId)
            .lt('updated_at', thresholdIsoDate)
            .not('status', 'in', '("converted","customer","active_deal")')

        if (minScore !== undefined) {
            query = query.lt('score', minScore)
        }

        const { count, error } = await query
        if (error) throw error
        return count || 0
    }
}
