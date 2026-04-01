import { SupabaseClient } from '@supabase/supabase-js'

export class TagsRepository {
    constructor(private supabase: SupabaseClient) {}

    async findAll(orgId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .select('*')
            .eq('organization_id', orgId)
            .order('name')

        if (error) throw error
        return data || []
    }

    async findById(tagId: string, orgId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .select('*')
            .eq('id', tagId)
            .eq('organization_id', orgId)
            .single()

        if (error) throw error
        return data
    }

    async findByName(name: string, orgId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .select('*')
            .eq('organization_id', orgId)
            .eq('name', name)
            .maybeSingle()

        if (error) throw error
        return data
    }

    async insert(payload: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async update(tagId: string, orgId: string, updates: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .update(updates)
            .eq('id', tagId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async delete(tagId: string, orgId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_tags')
            .delete()
            .eq('id', tagId)
            .eq('organization_id', orgId)

        if (error) throw error
    }

    async getLeadTags(leadId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('crm_lead_tags')
            .select(`
                created_at,
                tag:crm_tags (*)
            `)
            .eq('lead_id', leadId)

        if (error) throw error
        return data || []
    }

    async linkTag(leadId: string, tagId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_lead_tags')
            .insert({ lead_id: leadId, tag_id: tagId })
            .maybeSingle()

        if (error && error.code !== '23505') throw error
    }

    async unlinkTag(leadId: string, tagId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_lead_tags')
            .delete()
            .eq('lead_id', leadId)
            .eq('tag_id', tagId)

        if (error) throw error
    }

    async clearLeadTags(leadId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_lead_tags')
            .delete()
            .eq('lead_id', leadId)

        if (error) throw error
    }
}
