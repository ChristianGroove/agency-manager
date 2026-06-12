import { SupabaseClient } from '@supabase/supabase-js'
import { TagsRepository } from '../repositories/tags.repository'

export class TagsService {
    private repo: TagsRepository

    constructor(private supabase: SupabaseClient, private orgId: string) {
        this.repo = new TagsRepository(supabase)
    }

    async getTags(): Promise<any[]> {
        return this.repo.findAll(this.orgId)
    }

    async createTag(name: string, color: string): Promise<any> {
        return this.repo.insert({
            organization_id: this.orgId,
            name,
            color
        })
    }

    async updateTag(tagId: string, updates: any): Promise<any> {
        return this.repo.update(tagId, this.orgId, updates)
    }

    async deleteTag(tagId: string): Promise<void> {
        await this.repo.delete(tagId, this.orgId)
    }

    async getLeadTags(leadId: string): Promise<any[]> {
        await this.ensureLeadInOrganization(leadId)
        const data = await this.repo.getLeadTags(leadId)
        return data.map((item: any) => ({
            ...item.tag,
            linked_at: item.created_at
        }))
    }

    async toggleLeadTag(leadId: string, tagId: string): Promise<{ action: 'added' | 'removed' }> {
        await this.ensureLeadInOrganization(leadId)
        const tag = await this.repo.findById(tagId, this.orgId)
        if (!tag) throw new Error('Tag not found')

        // Check if link exists
        const leadTags = await this.getLeadTags(leadId)
        const existing = leadTags.find(t => t.id === tagId)

        if (existing) {
            await this.repo.unlinkTag(leadId, tagId)
        } else {
            await this.repo.linkTag(leadId, tagId)
        }

        // Sync tags to conversation for denormalized UI
        await this.syncLeadTagsToConversation(leadId)

        return { action: existing ? 'removed' : 'added' }
    }

    async addTagByName(leadId: string, tagName: string, defaultColor: string = '#f59e0b'): Promise<void> {
        await this.ensureLeadInOrganization(leadId)

        // Find or Create Tag
        let tag = await this.repo.findByName(tagName, this.orgId)
        if (!tag) {
            tag = await this.repo.insert({
                organization_id: this.orgId,
                name: tagName,
                color: defaultColor
            })
        }

        // Link
        await this.repo.linkTag(leadId, tag.id)
        
        // Sync
        await this.syncLeadTagsToConversation(leadId)
    }

    async removeTagByName(leadId: string, tagName: string): Promise<void> {
        await this.ensureLeadInOrganization(leadId)

        const tag = await this.repo.findByName(tagName, this.orgId)
        if (tag) {
            await this.repo.unlinkTag(leadId, tag.id)
            await this.syncLeadTagsToConversation(leadId)
        }
    }

    async clearLeadTags(leadId: string): Promise<void> {
        await this.ensureLeadInOrganization(leadId)
        await this.repo.clearLeadTags(leadId)
        
        // Parallel sync
        await Promise.all([
            this.supabase.from('leads').update({ tags: [] }).eq('id', leadId).eq('organization_id', this.orgId),
            this.supabase.from('conversations').update({ tags: [] }).eq('lead_id', leadId).eq('organization_id', this.orgId).neq('state', 'archived')
        ])
    }

    private async syncLeadTagsToConversation(leadId: string): Promise<void> {
        const leadTags = await this.getLeadTags(leadId)
        const tagNames = leadTags.map(t => t.name)

        // Update denormalized 'tags' in conversations
        await this.supabase
            .from('conversations')
            .update({ tags: tagNames })
            .eq('lead_id', leadId)
            .eq('organization_id', this.orgId)
            .neq('state', 'archived')
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
}
