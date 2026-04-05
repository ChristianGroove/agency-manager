import { SupabaseClient } from '@supabase/supabase-js'

export class CRMTasksLegacyRepository {
    constructor(private supabase: SupabaseClient) {}

    async findAll(filters: any, orgId: string): Promise<any[]> {
        let query = this.supabase
            .from('crm_tasks')
            .select(`
                *,
                lead:leads(id, name)
            `)
            .eq('organization_id', orgId)

        if (filters.assignedTo) {
            query = query.eq('assigned_to', filters.assignedTo)
        }

        if (filters.status) {
            query = query.eq('status', filters.status)
        } else if (filters.statuses) {
            query = query.in('status', filters.statuses)
        }

        if (filters.dueBefore) {
            query = query.lt('due_date', filters.dueBefore)
        }

        if (filters.dueAfter) {
            query = query.gte('due_date', filters.dueAfter)
        }

        if (filters.leadId) {
            query = query.eq('lead_id', filters.leadId)
        }

        const { data, error } = await query.order('due_date', { ascending: true })
        if (error) throw error
        return data || []
    }

    async findById(taskId: string, orgId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('organization_id', orgId)
            .single()

        if (error) throw error
        return data
    }

    async insert(payload: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('crm_tasks')
            .insert(payload)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async update(taskId: string, orgId: string, updates: any): Promise<void> {
        const { error } = await this.supabase
            .from('crm_tasks')
            .update(updates)
            .eq('id', taskId)
            .eq('organization_id', orgId)

        if (error) throw error
    }

    async delete(taskId: string, orgId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', orgId)

        if (error) throw error
    }

    async count(filters: any, orgId: string): Promise<number> {
        let query = this.supabase
            .from('crm_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.statuses) query = query.in('status', filters.statuses)
        if (filters.dueBefore) query = query.lt('due_date', filters.dueBefore)
        if (filters.dueAfter) query = query.gte('due_date', filters.dueAfter)

        const { count, error } = await query
        if (error) throw error
        return count || 0
    }
}
