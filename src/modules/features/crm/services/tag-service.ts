import { SupabaseClient } from '@supabase/supabase-js'

export class TagService {
    constructor(private supabase: SupabaseClient, private orgId: string) {}

    async getTags(): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .select('*')
            .eq('organization_id', this.orgId)
            .order('name')

        if (error) throw error
        return data || []
    }

    async createTag(name: string, color: string = '#808080'): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .insert({
                organization_id: this.orgId,
                name,
                color
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updateTag(tagId: string, updates: { name?: string; color?: string }): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .update(updates)
            .eq('id', tagId)
            .eq('organization_id', this.orgId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteTag(tagId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_tags')
            .delete()
            .eq('id', tagId)
            .eq('organization_id', this.orgId)

        if (error) throw error
    }

    async getLeadTags(leadId: string): Promise<any[]> {
        await this.ensureLeadInOrganization(leadId)

        const { data, error } = await this.supabase
            .from('crm_lead_tags')
            .select(`
                created_at,
                tag:crm_tags (*)
            `)
            .eq('lead_id', leadId)

        if (error) throw error
        
        // Flatten the structure for the UI
        return (data || []).map((item: any) => ({
            ...item.tag,
            linked_at: item.created_at
        }))
    }

    async toggleLeadTag(leadId: string, tagId: string): Promise<{ action: 'added' | 'removed' }> {
        await this.ensureLeadInOrganization(leadId)
        await this.ensureTagInOrganization(tagId)

        // Check if exists
        const { data: existing } = await this.supabase
            .from('crm_lead_tags')
            .select('*')
            .eq('lead_id', leadId)
            .eq('tag_id', tagId)
            .maybeSingle()

        if (existing) {
            await this.supabase
                .from('crm_lead_tags')
                .delete()
                .eq('lead_id', leadId)
                .eq('tag_id', tagId)
            return { action: 'removed' }
        } else {
            await this.supabase
                .from('crm_lead_tags')
                .insert({ lead_id: leadId, tag_id: tagId })
            return { action: 'added' }
        }
    }

    // --- SYSTEM HELPERS ---

    async addTagByName(leadId: string, tagName: string): Promise<void> {
        await this.ensureLeadInOrganization(leadId)

        // Find or create tag
        let { data: tag } = await this.supabase
            .from('crm_tags')
            .select('id')
            .eq('organization_id', this.orgId)
            .eq('name', tagName)
            .maybeSingle()

        if (!tag) {
            tag = await this.createTag(tagName)
        }

        // Link
        if (tag?.id) {
            await this.supabase
                .from('crm_lead_tags')
                .insert({ lead_id: leadId, tag_id: tag.id })
                .maybeSingle()
        }
    }

    async removeTagByName(leadId: string, tagName: string): Promise<void> {
        await this.ensureLeadInOrganization(leadId)

        const { data: tag } = await this.supabase
            .from('crm_tags')
            .select('id')
            .eq('organization_id', this.orgId)
            .eq('name', tagName)
            .maybeSingle()

        if (tag) {
            await this.supabase
                .from('crm_lead_tags')
                .delete()
                .eq('lead_id', leadId)
                .eq('tag_id', tag.id)
        }
    }

    async clearLeadTags(leadId: string): Promise<void> {
        await this.ensureLeadInOrganization(leadId)

        await this.supabase
            .from('crm_lead_tags')
            .delete()
            .eq('lead_id', leadId)
    }

    private async ensureLeadInOrganization(leadId: string): Promise<void> {
        const { data, error } = await this.supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('organization_id', this.orgId)
            .maybeSingle()

        if (error) throw error
        if (!data) throw new Error('Lead not found')
    }

    private async ensureTagInOrganization(tagId: string): Promise<void> {
        const { data, error } = await this.supabase
            .from('crm_tags')
            .select('id')
            .eq('id', tagId)
            .eq('organization_id', this.orgId)
            .maybeSingle()

        if (error) throw error
        if (!data) throw new Error('Tag not found')
    }
}
