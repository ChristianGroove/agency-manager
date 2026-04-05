import { SupabaseClient } from '@supabase/supabase-js'

export class CrmTaskService {
    constructor(private supabase: SupabaseClient, private orgId: string, private userId?: string) {}

    async createTask(data: any): Promise<any> {
        if (!this.userId) throw new Error('Unauthorized')
        
        const { data: task, error } = await this.supabase
            .from('crm_tasks')
            .insert({
                organization_id: this.orgId,
                lead_id: data.lead_id,
                title: data.title,
                description: data.description,
                type: data.type || 'follow_up',
                priority: data.priority || 'medium',
                due_date: data.due_date,
                assigned_to: data.assigned_to || this.userId,
                created_by: this.userId,
                reminder_at: data.reminder_at
            })
            .select()
            .single()

        if (error) throw error
        return task
    }

    async updateTask(taskId: string, data: any): Promise<void> {
        const updates: any = { ...data, updated_at: new Date().toISOString() }
        
        if (data.status === 'completed' && !data.completed_at) {
            updates.completed_at = new Date().toISOString()
        }

        const { error } = await this.supabase
            .from('crm_tasks')
            .update(updates)
            .eq('id', taskId)
            .eq('organization_id', this.orgId)

        if (error) throw error
    }

    async deleteTask(taskId: string): Promise<void> {
        const { error } = await this.supabase
            .from('crm_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', this.orgId)

        if (error) throw error
    }

    async getTasksForLead(leadId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('crm_tasks')
            .select('*')
            .eq('lead_id', leadId)
            .eq('organization_id', this.orgId)
            .order('due_date', { ascending: true })

        if (error) throw error
        return data || []
    }

    async getMyTasks(filters: any = {}): Promise<any[]> {
        if (!this.userId) throw new Error('Unauthorized')

        let query = this.supabase
            .from('crm_tasks')
            .select(`
                *,
                lead:leads(id, name)
            `)
            .eq('organization_id', this.orgId)
            .eq('assigned_to', this.userId)

        const statuses = filters.status ? [filters.status] : (filters.statuses || ['pending', 'in_progress'])
        query = query.in('status', statuses)

        if (filters.dueBefore) query = query.lt('due_date', filters.dueBefore)
        if (filters.dueAfter) query = query.gte('due_date', filters.dueAfter)

        const { data, error } = await query.order('due_date', { ascending: true })
        if (error) throw error
        
        return (data || []).map(t => ({
            ...t,
            lead_name: (t.lead as any)?.name || 'Sin nombre'
        }))
    }

    async getTaskStats(): Promise<any> {
        if (!this.userId) throw new Error('Unauthorized')
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [pendingRes, overdueRes, completedTodayRes] = await Promise.all([
            this.supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('organization_id', this.orgId).eq('assigned_to', this.userId).eq('status', 'pending'),
            this.supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('organization_id', this.orgId).eq('assigned_to', this.userId).in('status', ['pending', 'in_progress']).lt('due_date', new Date().toISOString()),
            this.supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('organization_id', this.orgId).eq('assigned_to', this.userId).eq('status', 'completed').gte('due_date', today.toISOString())
        ])

        return {
            pending: pendingRes.count || 0,
            overdue: overdueRes.count || 0,
            completedToday: completedTodayRes.count || 0
        }
    }
}
