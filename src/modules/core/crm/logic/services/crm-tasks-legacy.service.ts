import { SupabaseClient } from '@supabase/supabase-js'
import { CRMTasksLegacyRepository } from '../repositories/crm-tasks-legacy.repository'

export class CRMTasksLegacyService {
    private repo: CRMTasksLegacyRepository

    constructor(private supabase: SupabaseClient, private orgId: string, private userId?: string) {
        this.repo = new CRMTasksLegacyRepository(supabase)
    }

    async createTask(data: any): Promise<any> {
        if (!this.userId) throw new Error('Unauthorized')
        
        return this.repo.insert({
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
    }

    async updateTask(taskId: string, data: any): Promise<void> {
        const updates: any = { ...data, updated_at: new Date().toISOString() }
        
        if (data.status === 'completed' && !data.completed_at) {
            updates.completed_at = new Date().toISOString()
        }

        await this.repo.update(taskId, this.orgId, updates)
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.repo.delete(taskId, this.orgId)
    }

    async getTasksForLead(leadId: string): Promise<any[]> {
        return this.repo.findAll({ leadId }, this.orgId)
    }

    async getMyTasks(filters: any): Promise<any[]> {
        if (!this.userId) throw new Error('Unauthorized')

        const queryFilters: any = {
            assignedTo: this.userId,
            ...filters
        }

        if (!filters.status && !filters.statuses) {
            queryFilters.statuses = ['pending', 'in_progress']
        }

        if (filters.showOverdue) {
            queryFilters.dueBefore = new Date().toISOString()
        }

        const tasks = await this.repo.findAll(queryFilters, this.orgId)
        
        return tasks.map(t => ({
            ...t,
            lead_name: t.lead?.name || 'Sin nombre'
        }))
    }

    async getTodaysTasks(): Promise<any[]> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        return this.getMyTasks({
            statuses: ['pending', 'in_progress'],
            dueAfter: today.toISOString(),
            dueBefore: tomorrow.toISOString()
        })
    }

    async getOverdueTasks(): Promise<{ tasks: any[], count: number }> {
        const filters = {
            statuses: ['pending', 'in_progress'],
            dueBefore: new Date().toISOString()
        }
        
        const tasks = await this.getMyTasks(filters)
        const count = await this.repo.count(filters, this.orgId)
        
        return { tasks, count }
    }

    async getTaskStats(): Promise<any> {
        if (!this.userId) throw new Error('Unauthorized')
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [pending, overdue, completedToday] = await Promise.all([
            this.repo.count({ assignedTo: this.userId, status: 'pending' }, this.orgId),
            this.repo.count({ assignedTo: this.userId, statuses: ['pending', 'in_progress'], dueBefore: new Date().toISOString() }, this.orgId),
            this.repo.count({ assignedTo: this.userId, status: 'completed', dueAfter: today.toISOString() }, this.orgId)
        ])

        return { pending, overdue, completedToday }
    }
}
