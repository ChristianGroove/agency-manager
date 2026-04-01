import { SupabaseClient } from '@supabase/supabase-js'

export class CRMAdvancedRepository {
    constructor(private supabase: SupabaseClient) {}

    // --- ACTIVITIES ---
    async getActivities(leadId: string, orgId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('lead_activities')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    }

    async insertActivity(payload: any): Promise<void> {
        const { error } = await this.supabase
            .from('lead_activities')
            .insert(payload)

        if (error) throw error
    }

    // --- TASKS ---
    async getTasks(orgId: string, leadId?: string): Promise<any[]> {
        let query = this.supabase
            .from('lead_tasks')
            .select('*')
            .eq('organization_id', orgId)

        if (leadId) {
            query = query.eq('lead_id', leadId)
        }

        const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })
        if (error) throw error
        return data || []
    }

    async getTaskById(taskId: string, orgId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('lead_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('organization_id', orgId)
            .single()

        if (error) throw error
        return data
    }

    async insertTask(payload: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('lead_tasks')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updateTask(taskId: string, orgId: string, updates: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('lead_tasks')
            .update(updates)
            .eq('id', taskId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteTask(taskId: string, orgId: string): Promise<void> {
        const { error } = await this.supabase
            .from('lead_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', orgId)

        if (error) throw error
    }

    // --- NOTES ---
    async getNotes(leadId: string, orgId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('lead_notes')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    }

    async insertNote(payload: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('lead_notes')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updateNote(noteId: string, orgId: string, updates: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('lead_notes')
            .update(updates)
            .eq('id', noteId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteNote(noteId: string, orgId: string): Promise<void> {
        const { error } = await this.supabase
            .from('lead_notes')
            .delete()
            .eq('id', noteId)
            .eq('organization_id', orgId)

        if (error) throw error
    }

    // --- DOCUMENTS ---
    async insertDocument(payload: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('lead_documents')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteDocument(documentId: string, orgId: string): Promise<void> {
        const { error } = await this.supabase
            .from('lead_documents')
            .delete()
            .eq('id', documentId)
            .eq('organization_id', orgId)

        if (error) throw error
    }

    // --- EMAILS ---
    async getEmails(leadId: string, orgId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('lead_emails')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    }

    async insertEmail(payload: any): Promise<void> {
        const { error } = await this.supabase
            .from('lead_emails')
            .insert(payload)

        if (error) throw error
    }

    // --- ASSIGNMENT ---
    async bulkUpdateAssignment(leadIds: string[], orgId: string, assignedTo: string | null): Promise<void> {
        const { error } = await this.supabase
            .from('leads')
            .update({ assigned_to: assignedTo })
            .in('id', leadIds)
            .eq('organization_id', orgId)

        if (error) throw error
    }
}
